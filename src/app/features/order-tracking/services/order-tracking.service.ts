import { Injectable, computed, inject } from '@angular/core';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import { Result, fail, ok } from '../../../core/supabase/supabase.types';
import { DELIVERY_CONFIG, FAILURE_CAUSES } from '../config/delivery-config';
import { addHours, diffMs, formatShortDate, isWorkingDay, toDateKey } from '../domain/calendar';
import { computeEdd, shiftEdd } from '../domain/edd';
import {
  Actor,
  BusinessError,
  CARRIER,
  RefundChoice,
  applyRefundChoice,
  finalizeFailedDelivery,
  withCancellation,
  withLog,
  withRefund,
  withTransition,
  withVoucher,
} from '../domain/order-mutations';
import {
  canCancelAfterFailure,
  canCustomerCancel,
  canReportIssue,
  canRequestRedelivery,
  canResubmitDesign,
  failedDeliveryRefundSituation,
  faultParty,
  hasOpenTicket,
  isOrderOpen,
  isPrepaid,
  lateVoucherValue,
  sameHolderName,
} from '../domain/order-rules';
import { quoteShipping, redeliveryFee } from '../domain/shipping-fee';
import { OrderHandoff } from '../models/order-handoff.model';
import {
  CancelReason,
  FailureCause,
  IssueType,
  ModerationDecision,
  Order,
  RefundRequest,
  Resolution,
  ShipmentEventType,
} from '../models/order-tracking.model';
import { Clock } from './clock';
import { DemoSettings } from './demo-settings';
import {
  ComplaintService,
  IntegrationBus,
  LoyaltyService,
  NotificationService,
  PaymentService,
  RiskProfileService,
  newId,
} from './integrations';
import { OrderRepository, OrderTrackingDb } from './order.repository';

export type OpResult = Result<Order>;

export const DEMO_CUSTOMER = {
  id: 'demo-customer',
  name: 'Nguyễn Nhật Anh',
  phone: '0903 123 456',
  email: 'khachdemo@casecraft.vn',
};

export const MESSAGES = {
  cannotCancel: 'Đơn đang được xử lý, không thể hủy',
  cancelConflict:
    'Đơn hàng đã được chuyển sang bộ phận xử lý, không thể hủy theo chính sách hàng cá nhân hóa',
  staleOrder: 'Trạng thái đơn vừa thay đổi. Thông tin đã được làm mới, vui lòng xem lại.',
  cancelledByCustomer: 'Đơn đã bị khách hủy',
  handledByOther: 'Đơn đã được xử lý bởi người khác. Danh sách đã được làm mới.',
  adminOnly: 'Chỉ Admin được xác nhận và chuyển hoàn tiền',
  holderMismatch: 'Tên chủ tài khoản phải trùng với người thanh toán',
  complaintExpired:
    'Đơn hàng đã quá thời hạn tiếp nhận sự cố trực tuyến (7 ngày). Vui lòng liên hệ trực tiếp hotline để được hỗ trợ',
  network: 'Mất kết nối khi gửi yêu cầu. Nội dung của bạn vẫn được giữ, hãy thử gửi lại.',
} as const;

interface MutateOptions {
  readonly expectedUpdatedAt?: string;
  readonly opKey?: string;
}

/**
 * Order lifecycle (Class Diagram: OrderTrackingService). Every write runs inside one
 * repository transaction, re-checks the rules against fresh data and appends OrderStatusLog.
 */
@Injectable({ providedIn: 'root' })
export class OrderTrackingService {
  private readonly repo = inject(OrderRepository);
  private readonly clock = inject(Clock);
  private readonly demo = inject(DemoSettings);
  private readonly auth = inject(SupabaseAuthService, { optional: true });
  private readonly bus = inject(IntegrationBus);
  private readonly notifier = inject(NotificationService);
  private readonly loyalty = inject(LoyaltyService);
  private readonly risk = inject(RiskProfileService);
  private readonly complaints = inject(ComplaintService);
  private readonly payment = inject(PaymentService);

  readonly db = this.repo.state;
  readonly orders = computed(() => this.repo.state().orders);

  /** Logged-in Supabase user, or the demo customer when nobody is logged in (demo mode only). */
  readonly customer = computed(() => {
    const u = this.auth?.user();
    if (!u) return DEMO_CUSTOMER;
    const meta = u.user_metadata as Record<string, unknown> | undefined;
    const name = typeof meta?.['full_name'] === 'string' ? (meta['full_name'] as string) : u.email?.split('@')[0];
    return { id: u.id, name: name || DEMO_CUSTOMER.name, phone: DEMO_CUSTOMER.phone, email: u.email ?? DEMO_CUSTOMER.email };
  });

  /** FR-OT-03: newest first. */
  readonly myOrders = computed(() => {
    const id = this.customer().id;
    return this.orders()
      .filter((o) => o.customerId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  findByCode(code: string): Order | undefined {
    return this.orders().find((o) => o.orderCode === code);
  }

  /** UC-OT-01 exception 2.2 can be simulated from the Demo Console. */
  load(): Result<true> {
    this.repo.reload();
    if (this.demo.state().loadError) {
      return fail({ message: 'Không thể tải dữ liệu đơn hàng. Vui lòng kiểm tra kết nối mạng và thử lại' });
    }
    return ok(true as const);
  }

  // ------------------------------------------------------------------ order intake

  /** Contract for Payment (OrderHandoff). Validates Payment BR-P-05/06 and snapshots fees + EDD. */
  receiveHandoff(h: OrderHandoff): OpResult {
    if (h.items.length === 0) return fail({ message: 'Đơn hàng không có sản phẩm' });
    const hasCustom = h.items.some((i) => i.isCustom);
    if (h.paymentMethod === 'COD' && hasCustom) {
      return fail({ message: 'Đơn có hàng Custom bắt buộc thanh toán trước 100% (COD bị khóa)' });
    }
    const goodsTotal = h.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const quote = quoteShipping(h.zone, h.shippingTier, goodsTotal);
    if (!quote.available) return fail({ message: 'Khu vực này chưa hỗ trợ Giao nhanh' });

    const createdAt = h.createdAt ?? this.clock.nowIso();
    const edd = computeEdd({
      placedAt: new Date(createdAt),
      hasCustomItem: hasCustom,
      zone: h.zone,
      tier: h.shippingTier,
    });
    const nowIso = this.clock.nowIso();

    return this.run((db) => {
      db.orderSeq += 1;
      const code = h.orderCode ?? `CC-${toDateKey(new Date(createdAt)).slice(2).replaceAll('-', '')}-${String(db.orderSeq).padStart(4, '0')}`;
      const id = newId('ord');
      let order: Order = {
        id,
        orderCode: code,
        customerId: h.customer.id,
        customerName: h.customer.name,
        customerPhone: h.customer.phone,
        customerEmail: h.customer.email,
        payerName: h.payerName,
        shippingAddress: h.shippingAddress,
        status: 'Pending_Confirmation',
        paymentMethod: h.paymentMethod,
        paymentStatus: h.paymentMethod === 'QR_Transfer' ? 'Paid' : 'Unpaid',
        paymentTxnRef: h.paymentMethod === 'QR_Transfer' ? (h.paymentTxnRef ?? this.payment.newTransactionRef()) : undefined,
        goodsTotal,
        shippingFee: quote.fee,
        fastSurcharge: quote.fastSurcharge,
        zone: h.zone,
        shippingTier: h.shippingTier,
        hasCustomItem: hasCustom,
        requiresModeration: h.items.some((i) => i.design?.hasUploadedImage),
        earliestEDD: edd.earliest,
        latestEDD: edd.latest,
        batchDate: edd.batchDate,
        policyVersion: h.policyVersion,
        policyAcceptedAt: h.policyAcceptedAt,
        createdAt,
        updatedAt: nowIso,
        designResubmitCount: 0,
        autoCompleteFrozenOnce: false,
        reviewInvitePending: false,
        redeliveryUsed: false,
        qcReprintCount: 0,
        lateVoucherIssued: false,
        items: h.items.map((i) => ({
          id: newId('itm'),
          productName: i.productName,
          phoneModel: i.phoneModel,
          baseSku: i.baseSku,
          isCustom: i.isCustom,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          design: i.design ? { id: newId('dsg'), ...i.design, version: 1 } : undefined,
        })),
        logs: [],
        moderationReviews: [],
        refunds: [],
        tickets: [],
        vouchers: [],
      };
      order = withLog(order, null, 'Pending_Confirmation', { type: 'Customer', id: h.customer.id }, 'Đặt hàng thành công', createdAt);
      db.orders.push(order);
      db.consents.push({ orderId: id, userId: h.customer.id, policyVersion: h.policyVersion, acceptedAt: h.policyAcceptedAt });
      this.notifier.notify(db, order, 'Đặt hàng thành công', `Dự kiến giao từ ${formatShortDate(edd.earliest)} đến ${formatShortDate(edd.latest)}.`, nowIso);
      return order;
    });
  }

  // ------------------------------------------------------------------ customer actions

  /** UC-OT-02 / FR-OT-05 / EX-01. */
  cancelOrder(
    orderId: string,
    input: { reason: CancelReason; note?: string; refund?: RefundChoice },
    opts: MutateOptions,
  ): OpResult {
    return this.mutate(orderId, opts, (o, db, now) => {
      if (o.status === 'Cancelled') throw new BusinessError('Đơn hàng đã được hủy trước đó');
      if (!canCustomerCancel(o, now)) throw new BusinessError(MESSAGES.cancelConflict);
      this.assertRefundChoice(o, input.refund);
      const nowIso = now.toISOString();
      const cause = o.status === 'Pending_Review' ? 'Customer_Pending_Review' : 'Customer_In_Window';
      let next = withCancellation(o, this.customerActor(o), cause, false, `Khách hủy đơn: ${input.reason}`, nowIso, {
        reason: input.reason,
        note: input.note,
      });
      next = withRefund(next, 'S1', input.refund, nowIso).order;
      this.releaseStock(db, next, nowIso);
      this.risk.reportCancellation(db, next, cause, false, nowIso);
      this.notifier.notify(db, next, 'Đơn hàng đã hủy', isPrepaid(next) ? 'Yêu cầu hoàn tiền đang chờ xác nhận.' : 'Đơn đã được đóng.', nowIso);
      return next;
    });
  }

  /** UC-OT-02 AF 1.2: Action_Required -> "Hủy đơn & nhận hoàn tiền" (situation 2). */
  cancelRejectedOrder(orderId: string, refund: RefundChoice | undefined, opts: MutateOptions): OpResult {
    return this.mutate(orderId, opts, (o, db, now) => {
      if (o.status !== 'Action_Required') throw new BusinessError(MESSAGES.staleOrder);
      this.assertRefundChoice(o, refund);
      const nowIso = now.toISOString();
      let next = withCancellation(o, this.customerActor(o), 'Design_Rejected', true, 'Khách hủy đơn: thiết kế bị từ chối', nowIso);
      next = withRefund(next, 'S2', refund, nowIso).order;
      this.releaseStock(db, next, nowIso);
      this.risk.reportCancellation(db, next, 'Design_Rejected', true, nowIso);
      this.notifier.notify(db, next, 'Đơn hàng đã hủy', 'Yêu cầu hoàn tiền 100% đang chờ xác nhận.', nowIso);
      return next;
    });
  }

  /** UC-OT-11 AF 3.2: back to the moderation queue (max 2 re-submissions). */
  resubmitDesign(orderId: string, opts: MutateOptions): OpResult {
    return this.mutate(orderId, opts, (o, _db, now) => {
      if (!canResubmitDesign(o)) throw new BusinessError('Đã hết lượt gửi lại thiết kế, bạn chỉ có thể hủy và nhận hoàn 100%');
      const nowIso = now.toISOString();
      const next = withTransition(o, 'Pending_Review', this.customerActor(o), `Khách gửi lại thiết kế (lần ${o.designResubmitCount + 1})`, nowIso);
      return {
        ...next,
        designResubmitCount: o.designResubmitCount + 1,
        reviewQueuedAt: nowIso,
        rejectedAt: undefined,
        designFixReminderAt: undefined,
        items: o.items.map((i) => (i.design ? { ...i, design: { ...i.design, version: i.design.version + 1 } } : i)),
      };
    });
  }

  /** UC-OT-03. */
  confirmReceived(orderId: string, opts: MutateOptions): OpResult {
    return this.mutate(orderId, opts, (o, db, now) => {
      if (o.status !== 'Delivered' || hasOpenTicket(o)) throw new BusinessError(MESSAGES.staleOrder);
      const nowIso = now.toISOString();
      const next = { ...withTransition(o, 'Completed', this.customerActor(o), 'Khách xác nhận đã nhận hàng', nowIso), reviewInvitePending: true };
      this.loyalty.earnPoints(db, next, nowIso);
      return next;
    });
  }

  submitReview(orderId: string, stars: number, comment: string): OpResult {
    return this.mutate(orderId, {}, (o, _db, now) => {
      if (o.status !== 'Completed' || o.review) throw new BusinessError('Đơn hàng không thể đánh giá');
      return { ...o, review: { stars, comment: comment.trim(), createdAt: now.toISOString() }, reviewInvitePending: false };
    });
  }

  dismissReviewInvite(orderId: string): OpResult {
    return this.mutate(orderId, {}, (o) => ({ ...o, reviewInvitePending: false }));
  }

  /** UC-OT-04 / FR-OT-11 / EX-03 / EX-04 / EX-07. */
  reportIssue(
    orderId: string,
    input: { issueType: IssueType; description: string; evidenceNames: readonly string[] },
    opts: MutateOptions,
  ): OpResult {
    if (this.demo.state().networkDown) return fail({ message: MESSAGES.network, code: 'NETWORK' });
    const current = this.orders().find((o) => o.id === orderId);
    if (!current) return fail({ message: 'Không tìm thấy đơn hàng' });
    const ticket = this.complaints.createTicket(current, input.issueType);
    if (ticket.error) return fail({ message: ticket.error.message, code: 'EPIC6' });

    return this.mutate(orderId, opts, (o, db, now) => {
      if (!canReportIssue(o, now)) {
        throw new BusinessError(hasOpenTicket(o) ? 'Đơn đã có yêu cầu đang được xử lý' : MESSAGES.complaintExpired);
      }
      const isDispute = input.issueType === 'Dispute_Failure_Cause';
      if (isDispute !== (o.status === 'Delivery_Failed')) throw new BusinessError('Loại sự cố không phù hợp với trạng thái đơn');
      if (['Print_Defect', 'Transit_Damage'].includes(input.issueType) && input.evidenceNames.length === 0) {
        throw new BusinessError('Vui lòng tải lên ảnh hoặc video bằng chứng');
      }
      const nowIso = now.toISOString();
      const ref = {
        ticketCode: ticket.data,
        issueType: input.issueType,
        description: input.description.trim(),
        evidenceNames: [...input.evidenceNames],
        open: true,
        createdAt: nowIso,
      };
      let next: Order = { ...o, tickets: [...o.tickets, ref] };
      if (isDispute && o.warehouseHold) {
        next = withLog(
          { ...next, warehouseHold: { ...o.warehouseHold, disputed: true, frozenAt: nowIso } },
          o.status,
          o.status,
          this.customerActor(o),
          `Khách không đồng ý nguyên nhân giao thất bại (${ticket.data}); tạm dừng hạn lưu kho`,
          nowIso,
        );
      } else {
        const freeze = o.status === 'Delivered' && !o.autoCompleteFrozenOnce;
        next = withTransition(
          {
            ...next,
            previousStatus: o.status,
            frozenAt: freeze ? nowIso : undefined,
            autoCompleteFrozenOnce: o.autoCompleteFrozenOnce || freeze,
          },
          'Return_Requested',
          this.customerActor(o),
          `Khách báo sự cố (${ticket.data})`,
          nowIso,
        );
      }
      this.notifier.notify(db, next, 'Đã tiếp nhận yêu cầu hỗ trợ', `Mã yêu cầu ${ticket.data}.`, nowIso, ['InApp']);
      return next;
    });
  }

  /** UC-OT-05 main flow: back to Ready_for_Pickup, EDD recalculated. */
  requestRedelivery(orderId: string, opts: MutateOptions): OpResult {
    const current = this.orders().find((o) => o.id === orderId);
    if (!current) return fail({ message: 'Không tìm thấy đơn hàng' });
    const fee = faultParty(current) === 'Customer' ? redeliveryFee(current.zone) : 0;
    if (!canRequestRedelivery(current, this.clock.now())) return fail({ message: MESSAGES.staleOrder });
    const paid = this.payment.confirmRedeliveryFee(fee);
    if (paid.error) return fail({ message: paid.error.message });

    return this.mutate(orderId, opts, (o, _db, now) => {
      if (!canRequestRedelivery(o, now)) throw new BusinessError(MESSAGES.staleOrder);
      const nowIso = now.toISOString();
      const edd = computeEdd({
        placedAt: now,
        hasCustomItem: o.hasCustomItem,
        zone: o.zone,
        tier: o.shippingTier,
        handling: DELIVERY_CONFIG.redeliveryHandlingDays,
        applyCancelWindow: false,
      });
      const next = withTransition(o, 'Ready_for_Pickup', this.customerActor(o), fee > 0 ? `Khách yêu cầu giao lại, đã trả cước ${fee.toLocaleString('vi-VN')} đ (${paid.data})` : 'Khách yêu cầu giao lại (miễn phí)', nowIso);
      return {
        ...next,
        redeliveryUsed: true,
        redeliveryFeePaid: fee,
        warehouseHold: undefined,
        earliestEDD: edd.earliest,
        latestEDD: edd.latest,
      };
    });
  }

  /** UC-OT-05 AF 2.1 / 3.1: cancel and refund after a failed delivery (3a / 3b). */
  cancelAfterFailure(orderId: string, refund: RefundChoice | undefined, opts: MutateOptions): OpResult {
    return this.mutate(orderId, opts, (o, db, now) => {
      if (!canCancelAfterFailure(o, now)) throw new BusinessError(MESSAGES.staleOrder);
      this.assertRefundChoice(o, refund);
      const nowIso = now.toISOString();
      const situation = failedDeliveryRefundSituation(o)!;
      const customerFault = situation === 'S3b';
      const cause = customerFault ? 'Delivery_Failed_Customer' : 'Delivery_Failed_Carrier_Or_Shop';
      let next = withCancellation(o, this.customerActor(o), cause, customerFault, 'Khách chọn hủy đơn và hoàn tiền sau giao thất bại', nowIso);
      next = withRefund(next, situation, refund, nowIso).order;
      this.risk.reportCancellation(db, next, cause, customerFault, nowIso);
      this.notifier.notify(db, next, 'Đơn hàng đã hủy', isPrepaid(next) ? 'Yêu cầu hoàn tiền đang chờ xác nhận.' : 'Đơn đã được đóng.', nowIso);
      return next;
    });
  }

  /** "Chờ bạn cung cấp tài khoản" form, or re-confirming after a failed transfer (EX-11, EX-13). */
  submitRefundAccount(orderId: string, refundId: string, choice: RefundChoice): OpResult {
    return this.mutate(orderId, {}, (o) => {
      this.assertRefundChoice(o, choice);
      const r = o.refunds.find((x) => x.id === refundId);
      if (!r || !['Pending_Approval', 'Refund_Pending_Retry'].includes(r.status)) throw new BusinessError(MESSAGES.staleOrder);
      return this.replaceRefund(o, applyRefundChoice(r, choice));
    });
  }

  // ------------------------------------------------------------------ operator actions

  /** UC-OT-11. Two operators: the first action wins (EX). */
  moderateDesign(
    orderId: string,
    decision: ModerationDecision,
    detail: { violationGroup?: string; reason?: string },
    actor: Actor,
    opts: MutateOptions = {},
  ): OpResult {
    return this.mutate(orderId, opts, (o, db, now) => {
      if (o.status === 'Cancelled') throw new BusinessError(MESSAGES.cancelledByCustomer);
      if (o.status !== 'Pending_Review') throw new BusinessError(MESSAGES.handledByOther);
      const nowIso = now.toISOString();
      const round = o.moderationReviews.length + 1;
      const review = {
        id: newId('mr'),
        round,
        decision,
        violationGroup: detail.violationGroup,
        reason: detail.reason,
        reviewerId: actor.id,
        createdAt: nowIso,
      };
      const withReview = { ...o, moderationReviews: [...o.moderationReviews, review] };
      if (decision === 'Approved') {
        return withTransition(withReview, 'In_Production', actor, `Duyệt thiết kế vòng ${round}, đưa vào mẻ in`, nowIso);
      }
      if (!detail.violationGroup || !detail.reason?.trim()) throw new BusinessError('Chọn nhóm vi phạm và nhập lý do');
      const next = {
        ...withTransition(withReview, 'Action_Required', actor, `Từ chối thiết kế vòng ${round}: ${detail.violationGroup}`, nowIso),
        rejectedAt: nowIso,
        designFixReminderAt: undefined,
      };
      const lastChance = o.designResubmitCount >= DELIVERY_CONFIG.maxDesignResubmit;
      this.notifier.notify(
        db,
        next,
        'Thiết kế cần chỉnh sửa',
        lastChance
          ? `Nhóm vi phạm: ${detail.violationGroup}. Đã hết lượt gửi lại, bạn có thể hủy và nhận hoàn 100%.`
          : `Nhóm vi phạm: ${detail.violationGroup}. Sửa thiết kế trong ${DELIVERY_CONFIG.designFixDeadlineDays} ngày hoặc hủy và nhận hoàn 100%.`,
        nowIso,
      );
      return next;
    });
  }

  /** UC-OT-06 step 4: "Chốt mẻ" at 16:00 on working days. */
  closeBatch(actor: Actor): Result<{ count: number; groups: Record<string, number> }> {
    const now = this.clock.now();
    const cutoff = new Date(now);
    cutoff.setHours(DELIVERY_CONFIG.batchCutoff.hour, DELIVERY_CONFIG.batchCutoff.minute, 0, 0);
    if (!isWorkingDay(now, DELIVERY_CONFIG.holidays) || now.getTime() < cutoff.getTime()) {
      return fail({ message: 'Chưa tới giờ chốt mẻ (16:00, Thứ 2 – Thứ 6)' });
    }
    try {
      return this.repo.transact((db) => {
        const nowIso = now.toISOString();
        const groups: Record<string, number> = {};
        let count = 0;
        db.orders = db.orders.map((o) => {
          const eligibleAt = new Date(o.createdAt).getTime() + DELIVERY_CONFIG.cancelWindowMinutes * 60_000;
          const eligible =
            o.status === 'Pending_Confirmation' && o.hasCustomItem && !o.requiresModeration && eligibleAt <= cutoff.getTime();
          if (!eligible) return o;
          count++;
          o.items.filter((i) => i.isCustom).forEach((i) => (groups[i.phoneModel] = (groups[i.phoneModel] ?? 0) + i.quantity));
          const models = [...new Set(o.items.filter((i) => i.isCustom).map((i) => i.phoneModel))].join(', ');
          return { ...withTransition(o, 'In_Production', actor, `Chốt mẻ ${formatShortDate(toDateKey(now))} – nhóm ${models}`, nowIso), updatedAt: nowIso };
        });
        if (count === 0) throw new BusinessError('Mẻ rỗng: không có đơn đủ điều kiện, mẻ không chạy');
        return ok({ count, groups });
      });
    } catch (e) {
      return this.toFail(e);
    }
  }

  /** UC-OT-06 step 7 / AF 4.1: QC passed and packed (mixed orders ship as one parcel). */
  markPacked(orderId: string, actor: Actor, opts: MutateOptions = {}): OpResult {
    return this.mutate(orderId, opts, (o, _db, now) => {
      if (o.status === 'Cancelled') throw new BusinessError(MESSAGES.cancelledByCustomer);
      if (o.status === 'Pending_Confirmation') {
        if (o.hasCustomItem) throw new BusinessError('Đơn có hàng Custom phải qua mẻ in trước khi đóng gói');
        const opensAt = new Date(o.createdAt).getTime() + DELIVERY_CONFIG.cancelWindowMinutes * 60_000;
        if (now.getTime() < opensAt) {
          const mins = Math.ceil((opensAt - now.getTime()) / 60_000);
          throw new BusinessError(`Đơn còn trong cửa sổ hủy, mở khóa sau ${mins} phút (chỉ hiển thị nội bộ)`);
        }
      }
      const reason = o.status === 'In_Production' ? (o.items.some((i) => !i.isCustom) ? 'QC đạt, đóng gói chung một kiện' : 'QC đạt, đóng gói xong') : 'Đóng gói hàng có sẵn';
      return withTransition(o, 'Ready_for_Pickup', actor, reason, now.toISOString());
    });
  }

  /** FR-OT-EX-05: stays In_Production, next batch, EDD + 1 working day. */
  markQcReprint(orderId: string, actor: Actor): OpResult {
    return this.mutate(orderId, {}, (o, db, now) => {
      if (o.status !== 'In_Production') throw new BusinessError(MESSAGES.handledByOther);
      const nowIso = now.toISOString();
      const edd = shiftEdd(o.earliestEDD, o.latestEDD, DELIVERY_CONFIG.qcReprintExtraWorkingDays);
      const next = withLog(
        { ...o, qcReprintCount: o.qcReprintCount + 1, earliestEDD: edd.earliest, latestEDD: edd.latest },
        o.status,
        o.status,
        actor,
        'In lại do lỗi QC, vào mẻ kế tiếp (+1 ngày làm việc EDD)',
        nowIso,
      );
      this.notifier.notify(db, next, 'Cập nhật tiến độ', `Sản phẩm được in lại để đảm bảo chất lượng. Ngày giao mới: ${formatShortDate(edd.earliest)} – ${formatShortDate(edd.latest)}.`, nowIso);
      return next;
    });
  }

  // ------------------------------------------------------------------ carrier webhooks

  /** UC-OT-07 / FR-OT-07 / EX-02: idempotent by event_id, rejects out-of-order events. */
  applyWebhook(
    orderId: string,
    type: ShipmentEventType,
    input: { eventId?: string; failureCause?: FailureCause } = {},
  ): Result<{ result: 'Applied' | 'Duplicate' | 'Rejected'; message: string; eventId: string }> {
    const eventId = input.eventId ?? newId('whk');
    const now = this.clock.now();
    const nowIso = now.toISOString();
    try {
      return this.repo.transact((db) => {
        const idx = db.orders.findIndex((o) => o.id === orderId);
        if (idx < 0) throw new BusinessError('Không tìm thấy đơn hàng');
        const o = db.orders[idx];
        const record = (result: 'Applied' | 'Duplicate' | 'Rejected', message: string) => {
          db.webhookEvents.push({
            eventId,
            orderId,
            type,
            payload: JSON.stringify({ event_id: eventId, order_code: o.orderCode, type, failure_cause: input.failureCause }),
            result,
            message,
            receivedAt: nowIso,
          });
          return ok({ result, message, eventId });
        };

        if (db.webhookEvents.some((e) => e.eventId === eventId && e.result === 'Applied')) {
          return record('Duplicate', `Sự kiện ${eventId} đã xử lý, bỏ qua gói tin trùng`);
        }
        const next = this.applyShipmentEvent(o, type, input.failureCause, db, now);
        if (typeof next === 'string') return record('Rejected', next);
        db.orders[idx] = { ...next, updatedAt: nowIso };
        return record('Applied', `Đã áp dụng ${type} cho ${o.orderCode}`);
      });
    } catch (e) {
      return this.toFail(e);
    }
  }

  private applyShipmentEvent(
    o: Order,
    type: ShipmentEventType,
    failureCause: FailureCause | undefined,
    db: OrderTrackingDb,
    now: Date,
  ): Order | string {
    const nowIso = now.toISOString();
    const shipment = o.shipment ?? { carrier: DELIVERY_CONFIG.carrierName, trackingCode: `GHN${o.orderCode.replace(/\D/g, '')}`, attempts: [] };
    const attempts = [...shipment.attempts];
    const last = attempts.at(-1);

    switch (type) {
      case 'In_Transit': {
        if (o.status !== 'Ready_for_Pickup') return `Trạng thái hiện tại (${o.status}) không thể tiếp nhận sự kiện đang giao`;
        attempts.push({ attemptNo: attempts.length + 1, startedAt: nowIso });
        return withTransition({ ...o, shipment: { ...shipment, attempts } }, 'In_Transit', CARRIER, 'Đơn vị vận chuyển đã lấy hàng, đang giao', nowIso);
      }
      case 'Delivered': {
        if (o.status !== 'In_Transit') return 'Trạng thái hiện tại không thể tiếp nhận sự kiện giao thành công';
        if (last) attempts[attempts.length - 1] = { ...last, result: 'Delivered', endedAt: nowIso };
        let next: Order = withTransition(
          {
            ...o,
            shipment: { ...shipment, attempts },
            deliveredAt: nowIso,
            autoCompleteAt: addHours(nowIso, DELIVERY_CONFIG.autoCompleteHours),
            frozenAt: undefined,
          },
          'Delivered',
          CARRIER,
          'Giao hàng thành công',
          nowIso,
        );
        next = this.maybeIssueLateVoucher(next, db, now);
        this.notifier.notify(db, next, 'Đơn hàng đã được giao', 'Hãy kiểm tra hàng và bấm "Đã nhận được hàng".', nowIso);
        return next;
      }
      case 'Delivery_Failed': {
        if (o.status !== 'In_Transit') return 'Trạng thái hiện tại không thể tiếp nhận sự kiện giao thất bại';
        if (!failureCause) return 'Thiếu mã nguyên nhân giao thất bại';
        if (last) attempts[attempts.length - 1] = { ...last, result: 'Failed', failureCause, endedAt: nowIso };
        const next = withTransition(
          { ...o, shipment: { ...shipment, attempts }, failureCause, faultOverride: undefined, warehouseHold: undefined },
          'Delivery_Failed',
          CARRIER,
          `Giao thất bại: ${FAILURE_CAUSES[failureCause].label}`,
          nowIso,
        );
        this.notifier.notify(db, next, 'Giao hàng không thành công', `Lý do: ${FAILURE_CAUSES[failureCause].label}. Hàng đang được hoàn về kho.`, nowIso);
        return next;
      }
      case 'Warehouse_Received': {
        if (o.status !== 'Delivery_Failed' || o.warehouseHold) return 'Chỉ nhận sự kiện hàng về kho cho đơn giao thất bại chưa nhập kho';
        if (o.redeliveryUsed) {
          const r = finalizeFailedDelivery(o, CARRIER, 'Giao lại lần 2 vẫn thất bại, nhập kho và đóng đơn', false, nowIso);
          this.risk.reportCancellation(db, r.order, r.cause, r.customerFault, nowIso);
          this.notifier.notify(db, r.order, 'Đơn hàng đã đóng', r.refund ? 'Giao lại không thành công. Yêu cầu hoàn tiền đang chờ xác nhận.' : 'Giao lại không thành công, đơn được đóng theo chính sách.', nowIso);
          return r.order;
        }
        if (o.paymentMethod === 'COD' && !o.hasCustomItem && faultParty(o) === 'Customer') {
          const next = withCancellation(o, CARRIER, 'Delivery_Failed_Customer', true, 'Hàng về kho, đơn COD lỗi khách được đóng', nowIso);
          this.risk.reportCancellation(db, next, 'Delivery_Failed_Customer', true, nowIso);
          this.notifier.notify(db, next, 'Đơn hàng đã đóng', 'Giao hàng không thành công, đơn COD đã được hủy.', nowIso);
          return next;
        }
        const expiresAt = new Date(now.getTime() + DELIVERY_CONFIG.warehouseHoldDays * 86_400_000).toISOString();
        const next = withLog(
          { ...o, warehouseHold: { receivedAt: nowIso, expiresAt, disputed: false } },
          o.status,
          o.status,
          CARRIER,
          `Hàng về kho, lưu đến ${new Date(expiresAt).toLocaleDateString('vi-VN')}`,
          nowIso,
        );
        this.notifier.notify(db, next, 'Hàng đã về kho', `Vui lòng chọn giao lại hoặc xử lý trước ${new Date(expiresAt).toLocaleDateString('vi-VN')}.`, nowIso);
        return next;
      }
    }
  }

  /** FR-OT-18 / EX-14: once per order, never for customer-fault or complaint-frozen orders. */
  private maybeIssueLateVoucher(o: Order, db: OrderTrackingDb, now: Date): Order {
    if (o.lateVoucherIssued || !o.deliveredAt) return o;
    if (toDateKey(new Date(o.deliveredAt)) <= o.latestEDD) return o;
    const customerFault = o.shipment?.attempts.some((a) => a.failureCause && FAILURE_CAUSES[a.failureCause].party === 'Customer');
    if (customerFault || o.tickets.length > 0) return o;
    const nowIso = now.toISOString();
    const value = lateVoucherValue(o);
    let next: Order = { ...o, lateVoucherIssued: true };
    const late = withVoucher(next, 'Late_Delivery', value.late, nowIso);
    next = late.order;
    this.loyalty.requestVoucher(db, next, 'Late_Delivery', value.late, late.voucher.code, nowIso);
    if (value.fastSurcharge > 0) {
      const fast = withVoucher(next, 'Fast_Surcharge', value.fastSurcharge, nowIso);
      next = fast.order;
      this.loyalty.requestVoucher(db, next, 'Fast_Surcharge', value.fastSurcharge, fast.voucher.code, nowIso);
    }
    this.notifier.notify(db, next, 'Xin lỗi vì giao trễ', 'Bạn nhận được voucher bảo đảm giao đúng hạn trong chi tiết đơn.', nowIso);
    return withLog(next, o.status, o.status, { type: 'System', id: 'edd-guarantee' }, 'Giao trễ so với ngày dự kiến, cấp voucher bảo đảm', nowIso);
  }

  // ------------------------------------------------------------------ Epic 6 results

  /** UC-OT-08 / FR-OT-16 for Return_Requested orders. */
  applyComplaintResult(orderId: string, resolution: Resolution, note: string, actor: Actor, voucherValue = 30_000): OpResult {
    return this.mutate(orderId, {}, (o, db, now) => {
      const ticket = o.tickets.find((t) => t.open);
      if (o.status !== 'Return_Requested' || !ticket) throw new BusinessError('Đơn không có khiếu nại đang mở');
      if (resolution === 'Rejected' && !note.trim()) throw new BusinessError('Từ chối khiếu nại bắt buộc nhập lý do');
      const nowIso = now.toISOString();
      let next: Order = {
        ...o,
        tickets: o.tickets.map((t) => (t === ticket ? { ...t, open: false, resolution, resolutionNote: note.trim(), resolvedAt: nowIso } : t)),
      };
      const label = { Reprint: 'In lại / gửi lại miễn phí', Voucher: 'Voucher đền bù', Refund: 'Hoàn tiền 100%', Rejected: 'Từ chối khiếu nại' }[resolution];

      if (resolution === 'Reprint') {
        const edd = computeEdd({
          placedAt: now,
          hasCustomItem: o.hasCustomItem,
          zone: o.zone,
          tier: o.shippingTier,
          handling: o.hasCustomItem ? undefined : DELIVERY_CONFIG.redeliveryHandlingDays,
          applyCancelWindow: false,
        });
        next = withTransition(
          { ...next, deliveredAt: undefined, autoCompleteAt: undefined, frozenAt: undefined, earliestEDD: edd.earliest, latestEDD: edd.latest, previousStatus: undefined },
          o.hasCustomItem ? 'In_Production' : 'Ready_for_Pickup',
          actor,
          `Kết quả ${ticket.ticketCode}: ${label} (không thu hồi ốp cũ)`,
          nowIso,
        );
      } else if (resolution === 'Refund') {
        next = withTransition({ ...next, previousStatus: undefined }, 'Refunded', actor, `Kết quả ${ticket.ticketCode}: ${label}`, nowIso);
        next = withRefund(next, 'S4', undefined, nowIso).order;
        if (o.previousStatus === 'Completed') this.loyalty.revokePoints(db, next, nowIso);
      } else {
        if (resolution === 'Voucher') {
          const v = withVoucher(next, 'Complaint_Compensation', voucherValue, nowIso);
          next = v.order;
        }
        next = this.returnToPrevious(next, actor, `Kết quả ${ticket.ticketCode}: ${label}`, now);
      }
      this.notifier.notify(db, next, 'Kết quả xử lý yêu cầu hỗ trợ', `${label}${note.trim() ? ` – ${note.trim()}` : ''}.`, nowIso);
      return next;
    });
  }

  /** UC-OT-08 AF 1.1 / EX-03: dispute about the failure cause. */
  resolveDispute(orderId: string, customerRight: boolean, note: string, actor: Actor): OpResult {
    return this.mutate(orderId, {}, (o, db, now) => {
      const ticket = o.tickets.find((t) => t.open && t.issueType === 'Dispute_Failure_Cause');
      const hold = o.warehouseHold;
      if (o.status !== 'Delivery_Failed' || !ticket || !hold?.disputed) throw new BusinessError('Đơn không có khiếu nại nguyên nhân đang mở');
      if (!customerRight && !note.trim()) throw new BusinessError('Từ chối bắt buộc nhập lý do');
      const nowIso = now.toISOString();
      const frozenMs = hold.frozenAt ? diffMs(nowIso, hold.frozenAt) : 0;
      const expiresAt = new Date(new Date(hold.expiresAt).getTime() + frozenMs).toISOString();
      const next = withLog(
        {
          ...o,
          faultOverride: customerRight ? 'Carrier' : o.faultOverride,
          warehouseHold: { ...hold, disputed: false, frozenAt: undefined, expiresAt },
          tickets: o.tickets.map((t) =>
            t === ticket
              ? { ...t, open: false, resolutionNote: customerRight ? 'Khách đúng: lỗi thuộc đơn vị vận chuyển' : `Giữ nguyên lỗi khách: ${note.trim()}`, resolvedAt: nowIso }
              : t,
          ),
        },
        o.status,
        o.status,
        actor,
        customerRight
          ? `Kết quả ${ticket.ticketCode}: khách đúng, đổi sang lỗi vận chuyển; hạn lưu kho cộng bù`
          : `Kết quả ${ticket.ticketCode}: giữ nguyên lỗi khách (${note.trim()}); hạn lưu kho cộng bù`,
        nowIso,
      );
      this.notifier.notify(
        db,
        next,
        'Kết quả đối soát giao hàng',
        customerRight ? 'Lỗi thuộc đơn vị vận chuyển: bạn được giao lại miễn phí hoặc hủy và hoàn 100%.' : `Nguyên nhân giao thất bại được giữ nguyên. ${note.trim()}`,
        nowIso,
      );
      return next;
    });
  }

  private returnToPrevious(o: Order, actor: Actor, reason: string, now: Date): Order {
    const target = o.previousStatus ?? 'Delivered';
    const nowIso = now.toISOString();
    let next = withTransition({ ...o, previousStatus: undefined }, target, actor, reason, nowIso);
    if (target === 'Delivered' && o.frozenAt && o.autoCompleteAt) {
      // EX-04: resume the remaining time, never reset 72h.
      next = { ...next, autoCompleteAt: new Date(new Date(o.autoCompleteAt).getTime() + diffMs(nowIso, o.frozenAt)).toISOString(), frozenAt: undefined };
    }
    return next;
  }

  // ------------------------------------------------------------------ admin refund

  /** Approve: Voucher is issued at once; Bank goes to Processing (manual transfer). */
  approveRefund(orderId: string, refundId: string, actor: Actor): OpResult {
    return this.refundOp(orderId, refundId, actor, (o, r, db, nowIso) => {
      if (r.status !== 'Pending_Approval') throw new BusinessError(MESSAGES.handledByOther);
      if (!r.refundMethod) throw new BusinessError('Khách chưa cung cấp tài khoản hoặc chọn voucher');
      if (r.refundMethod === 'Voucher') {
        const v = withVoucher(o, 'Store_Credit', r.amount, nowIso);
        this.notifier.notify(db, o, 'Đã hoàn bằng voucher', `Voucher ${v.voucher.code} trị giá ${r.amount.toLocaleString('vi-VN')} đ.`, nowIso);
        return this.replaceRefund(v.order, { ...r, status: 'Refunded', approvedBy: actor.id, voucherCode: v.voucher.code, resolvedAt: nowIso });
      }
      if (!sameHolderName(r.refundAccountHolder ?? '', o.payerName)) throw new BusinessError(`${MESSAGES.holderMismatch}: hãy từ chối và yêu cầu khách xác nhận lại`);
      return this.replaceRefund(o, { ...r, status: 'Processing', approvedBy: actor.id });
    });
  }

  completeRefund(orderId: string, refundId: string, bankRef: string, actor: Actor): OpResult {
    return this.refundOp(orderId, refundId, actor, (o, r, db, nowIso) => {
      if (!['Processing', 'Refund_Pending_Manual'].includes(r.status)) throw new BusinessError(MESSAGES.handledByOther);
      if (!bankRef.trim()) throw new BusinessError('Nhập mã tham chiếu ngân hàng');
      this.notifier.notify(db, o, 'Đã hoàn tiền', `${r.amount.toLocaleString('vi-VN')} đ đã được chuyển với nội dung "HOAN ${o.orderCode}".`, nowIso);
      return this.replaceRefund(o, { ...r, status: 'Refunded', bankRef: bankRef.trim(), resolvedAt: nowIso });
    });
  }

  markTransferFailed(orderId: string, refundId: string, actor: Actor): OpResult {
    return this.refundOp(orderId, refundId, actor, (o, r, db, nowIso) => {
      if (r.status !== 'Processing') throw new BusinessError(MESSAGES.handledByOther);
      const attempts = r.transferAttempts + 1;
      const status = attempts >= DELIVERY_CONFIG.maxRefundTransferAttempts ? 'Refund_Pending_Manual' : 'Refund_Pending_Retry';
      if (status === 'Refund_Pending_Retry') {
        this.notifier.notify(db, o, 'Cần xác nhận lại tài khoản nhận hoàn', 'Chuyển khoản chưa thành công, vui lòng kiểm tra tài khoản hoặc chọn nhận voucher.', nowIso);
      }
      return this.replaceRefund(o, { ...r, status, transferAttempts: attempts });
    });
  }

  retryTransfer(orderId: string, refundId: string, actor: Actor): OpResult {
    return this.refundOp(orderId, refundId, actor, (o, r) => {
      if (r.status !== 'Refund_Pending_Retry') throw new BusinessError(MESSAGES.handledByOther);
      if (r.refundMethod === 'Voucher') return this.replaceRefund(o, { ...r, status: 'Pending_Approval' });
      return this.replaceRefund(o, { ...r, status: 'Processing' });
    });
  }

  rejectRefund(orderId: string, refundId: string, reason: string, actor: Actor): OpResult {
    return this.refundOp(orderId, refundId, actor, (o, r, db, nowIso) => {
      if (r.status !== 'Pending_Approval') throw new BusinessError(MESSAGES.handledByOther);
      if (!reason.trim()) throw new BusinessError('Nhập lý do từ chối');
      this.notifier.notify(db, o, 'Yêu cầu hoàn tiền bị từ chối', reason.trim(), nowIso);
      return this.replaceRefund(o, { ...r, status: 'Rejected', rejectReason: reason.trim(), approvedBy: actor.id, resolvedAt: nowIso });
    });
  }

  // ------------------------------------------------------------------ Profile integration

  /** FR-OT-EX-08 / Table 3.1 for Profile FR-PM-10. */
  listOpenOrders(customerId: string): { canDeleteAccount: boolean; openOrders: { orderCode: string; status: string }[] } {
    const open = this.orders()
      .filter((o) => o.customerId === customerId && isOrderOpen(o))
      .map((o) => ({ orderCode: o.orderCode, status: o.status }));
    return { canDeleteAccount: open.length === 0, openOrders: open };
  }

  // ------------------------------------------------------------------ helpers

  private customerActor(o: Order): Actor {
    return { type: 'Customer', id: o.customerId };
  }

  private assertRefundChoice(o: Order, choice: RefundChoice | undefined): void {
    if (choice?.method !== 'Bank') return;
    if (!choice.bank.trim() || !choice.accountNo.trim() || !choice.holder.trim()) {
      throw new BusinessError('Nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản');
    }
    if (!/^\d{6,19}$/.test(choice.accountNo.replace(/\s/g, ''))) throw new BusinessError('Số tài khoản không hợp lệ');
    if (!sameHolderName(choice.holder, o.payerName)) throw new BusinessError(MESSAGES.holderMismatch);
  }

  private releaseStock(db: OrderTrackingDb, o: Order, nowIso: string): void {
    this.bus.dispatch(db, 'Shopping', 'ReleaseStock', { orderId: o.id, baseSkus: o.items.map((i) => i.baseSku) }, nowIso);
  }

  private replaceRefund(o: Order, r: RefundRequest): Order {
    return { ...o, refunds: o.refunds.map((x) => (x.id === r.id ? r : x)) };
  }

  private refundOp(
    orderId: string,
    refundId: string,
    actor: Actor,
    fn: (o: Order, r: RefundRequest, db: OrderTrackingDb, nowIso: string) => Order,
  ): OpResult {
    if (actor.type !== 'Admin') return fail({ message: MESSAGES.adminOnly });
    return this.mutate(orderId, {}, (o, db, now) => {
      const r = o.refunds.find((x) => x.id === refundId);
      if (!r) throw new BusinessError('Không tìm thấy yêu cầu hoàn tiền');
      return fn(o, r, db, now.toISOString());
    });
  }

  /**
   * Read-check-write on one order inside a transaction: idempotency key (EX-06),
   * optimistic concurrency on updatedAt (EX-01), then `fn`.
   */
  private mutate(
    orderId: string,
    opts: MutateOptions,
    fn: (o: Order, db: OrderTrackingDb, now: Date) => Order,
  ): OpResult {
    const now = this.clock.now();
    return this.run((db) => {
      const idx = db.orders.findIndex((o) => o.id === orderId);
      if (idx < 0) throw new BusinessError('Không tìm thấy đơn hàng');
      const current = db.orders[idx];
      if (opts.opKey && db.idempotencyKeys.includes(opts.opKey)) return current;
      if (opts.expectedUpdatedAt && opts.expectedUpdatedAt !== current.updatedAt) {
        throw new BusinessError(current.status === 'Cancelled' ? MESSAGES.cancelledByCustomer : MESSAGES.staleOrder);
      }
      const next = { ...fn(current, db, now), updatedAt: now.toISOString() };
      db.orders[idx] = next;
      if (opts.opKey) db.idempotencyKeys.push(opts.opKey);
      return next;
    });
  }

  private run(fn: (db: OrderTrackingDb) => Order): OpResult {
    try {
      return ok(this.repo.transact(fn));
    } catch (e) {
      return this.toFail(e);
    }
  }

  private toFail(e: unknown): Result<never> {
    if (e instanceof BusinessError) return fail({ message: e.message });
    console.error(e);
    return fail({ message: 'Có lỗi xảy ra, vui lòng thử lại' });
  }
}
