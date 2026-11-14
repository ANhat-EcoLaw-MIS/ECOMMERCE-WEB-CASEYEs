import { Injectable, Injector, computed, effect, inject, untracked } from '@angular/core';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import { Result, fail, ok } from '../../../core/supabase/supabase.types';
import { CANCEL_REASON_LABELS, DELIVERY_CONFIG, FAILURE_CAUSES } from '../config/delivery-config';
import { addHours, addWorkingDays, diffMs, formatFullDate, formatShortDate, isWorkingDay, toDateKey } from '../domain/calendar';
import { batchDateFor, computeEdd, shiftEdd, workingDaysBetween } from '../domain/edd';
import { productionSlot } from '../domain/schedule';
import {
  Actor,
  BusinessError,
  CARRIER,
  RefundChoice,
  applyRefundChoice,
  startProduction,
  finalizeFailedDelivery,
  withCancellation,
  withLog,
  withRefund,
  withTransition,
  withVoucher,
} from '../domain/order-mutations';
import {
  canCancelAfterFailure,
  canCancelCod,
  canReportIssue,
  canRequestCancel,
  isConfirmed,
  isOnHold,
  pendingCancelRequest,
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
import { formatVnd, redeliveryFee } from '../domain/shipping-fee';
import { OrderHandoff } from '../models/order-handoff.model';
import { OrderIntake, OrderIntakeRequest } from '../../../shared/services/order-intake';
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
import { SupabaseOrderStore } from './supabase-order-store';
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
  /** EX-01: the COD window closed while the pop-up was open. */
  codConfirmed: 'Đơn đã được xác nhận và đang được chuẩn bị, không thể hủy',
  /** EX-15: the order entered production while the request form was open. */
  inProduction: 'Đơn đã được chuyển sang sản xuất, không thể hủy. Nếu có vấn đề, vui lòng dùng Báo sự cố sau khi nhận hàng',
  onHold: 'Đơn đang tạm giữ chờ xử lý yêu cầu hủy',
  requestExists: 'Đơn đã có yêu cầu hủy đang chờ xử lý',
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
  /** Message shown when expectedUpdatedAt no longer matches (EX-01). */
  readonly staleMessage?: string;
}

/**
 * Order lifecycle (Class Diagram: OrderTrackingService). Every write runs inside one
 * repository transaction, re-checks the rules against fresh data and appends OrderStatusLog.
 */
@Injectable({ providedIn: 'root' })
export class OrderTrackingService implements OrderIntake {
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
  private readonly injector = inject(Injector);
  /** Supabase store, created only when used (tests and demo mode never touch the Supabase client). */
  private get store(): SupabaseOrderStore {
    return this.injector.get(SupabaseOrderStore);
  }
  /**
   * Signed in (customer or staff): orders live in Supabase and every action is an RPC.
   * Not signed in with the simulator's demo customer: the local mock data, as before.
   */
  readonly remote = computed(() => !!this.auth?.isAuthenticated());
  readonly orders = computed(() => (this.remote() ? this.store.orders() : this.repo.state().orders));
  private loadedFor: string | null = null;

  /** Logged-in Supabase user, or the demo customer when nobody is logged in (demo mode only). */
  readonly customer = computed(() => {
    const u = this.auth?.user();
    if (!u) return DEMO_CUSTOMER;
    const meta = u.user_metadata as Record<string, unknown> | undefined;
    const name = typeof meta?.['full_name'] === 'string' ? (meta['full_name'] as string) : u.email?.split('@')[0];
    return { id: u.id, name: name || DEMO_CUSTOMER.name, phone: DEMO_CUSTOMER.phone, email: u.email ?? DEMO_CUSTOMER.email };
  });

  private readonly syncRemote = effect(() => {
    const id = this.remote() ? (this.auth?.user()?.id ?? null) : null;
    if (id === this.loadedFor) return;
    this.loadedFor = id;
    untracked(() => (id ? void this.store.load() : this.injector.get(SupabaseOrderStore, null)?.clear()));
  });

  /** RPC + reload, returned as the same OpResult the local actions return. */
  private async remoteOp(fn: string, args: Record<string, unknown>, orderId: string): Promise<OpResult> {
    const r = await this.store.rpc(fn, args);
    if (r.error) return fail(r.error);
    const order = this.store.orders().find((o) => o.id === orderId);
    return order ? ok(order) : fail({ message: MESSAGES.staleOrder });
  }

  /** Cancel RPC, then the refund account when the customer entered it in the same dialog. */
  private async remoteCancelWithRefund(fn: string, orderId: string, refund: RefundChoice | undefined): Promise<OpResult> {
    const r = await this.remoteOp(fn, { p_order_id: orderId }, orderId);
    if (r.error || !refund || refund.method !== 'Bank') return r;
    const pending = r.data.refunds.find((x) => x.status === 'Pending_Approval' && !x.refundMethod);
    return pending ? this.submitRefundAccount(orderId, pending.id, refund) : r;
  }

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
    if (this.remote()) {
      void this.store.load();
      return ok(true);
    }
    this.repo.reload();
    if (this.demo.state().loadError) {
      return fail({ message: 'Không thể tải dữ liệu đơn hàng. Vui lòng kiểm tra kết nối mạng và thử lại' });
    }
    return ok(true as const);
  }

  // ------------------------------------------------------------------ order intake

  /**
   * Contract for Thanh toán (OrderHandoff). Validates BR-P-05/06 and the v8 routing:
   * custom (and mixed) orders start in Pending_Review; stock orders in Pending_Confirmation.
   */
  /**
   * OrderIntake port (shared/services/order-intake.ts) used by Thanh toán. The customer defaults to
   * the signed-in user (or the demo customer when nobody is signed in).
   */
  placeOrder(request: OrderIntakeRequest): Result<{ readonly orderCode: string }> | Promise<Result<{ readonly orderCode: string }>> {
    if (this.remote()) return this.placeRemoteOrder(request);
    // createdAt is dropped: time rules (COD window, cut-offs) follow this module's clock, which the
    // simulator can move; Checkout's wall-clock time would make them inconsistent.
    const { recipient, createdAt: _ignored, ...handoff } = request;
    const account = request.customer ?? this.customer();
    // The order keeps the account id/email; name and phone are the delivery contact from checkout.
    const customer = recipient ? { ...account, name: recipient.name, phone: recipient.phone } : account;
    const r = this.receiveHandoff({ ...handoff, customer });
    return r.error ? r : ok({ orderCode: r.data.orderCode });
  }

  receiveHandoff(h: OrderHandoff): OpResult {
    if (h.items.length === 0) return fail({ message: 'Đơn hàng không có sản phẩm' });
    const hasCustom = h.items.some((i) => i.isCustom);
    if (h.paymentMethod === 'COD' && hasCustom) {
      return fail({ message: 'Đơn có hàng thiết kế theo yêu cầu bắt buộc thanh toán trước (không nhận COD)' });
    }
    if (h.shippingTier === 'Express' && hasCustom) {
      return fail({ message: 'Hỏa tốc chỉ áp dụng cho đơn chỉ gồm hàng có sẵn' });
    }
    const goodsTotal = h.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    const createdAt = h.createdAt ?? this.clock.nowIso();
    const isCod = h.paymentMethod === 'COD';
    const confirmDueAt = isCod
      ? new Date(new Date(createdAt).getTime() + DELIVERY_CONFIG.codRegretMinutes * 60_000).toISOString()
      : undefined;
    // EDD counts from the (expected) confirmation: end of the COD window, or placement for prepaid.
    const edd = computeEdd({
      confirmedAt: new Date(confirmDueAt ?? createdAt),
      hasCustomItem: hasCustom,
      tier: h.shippingTier,
      transitDays: h.shipping.transitDays,
    });
    const nowIso = this.clock.nowIso();
    const startStatus = hasCustom ? 'Pending_Review' : 'Pending_Confirmation';

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
        status: startStatus,
        paymentMethod: h.paymentMethod,
        paymentStatus: isCod ? 'Unpaid' : 'Paid',
        paymentTxnRef: isCod ? undefined : (h.paymentTxnRef ?? this.payment.newTransactionRef()),
        goodsTotal,
        discount: h.discount || undefined,
        shipping: h.shipping,
        shippingTier: h.shippingTier,
        hasCustomItem: hasCustom,
        hasUploadedImage: h.items.some((i) => i.design?.hasUploadedImage),
        earliestEDD: edd.earliest,
        latestEDD: edd.latest,
        batchDate: edd.batchDate,
        policyVersion: h.policyVersion,
        policyAcceptedAt: h.policyAcceptedAt,
        createdAt,
        updatedAt: nowIso,
        confirmDueAt,
        // Prepaid stock orders are confirmed by the payment itself.
        confirmedAt: !hasCustom && !isCod ? createdAt : undefined,
        reviewQueuedAt: hasCustom ? createdAt : undefined,
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
          imageUrl: i.imageUrl,
          design: i.design ? { id: newId('dsg'), ...i.design, version: 1 } : undefined,
        })),
        logs: [],
        moderationReviews: [],
        cancelRequests: [],
        refunds: [],
        tickets: [],
        vouchers: [],
      };
      order = withLog(order, null, startStatus, { type: 'Customer', id: h.customer.id }, 'Đặt hàng thành công', createdAt);
      db.orders.push(order);
      db.consents.push({ orderId: id, userId: h.customer.id, policyVersion: h.policyVersion, acceptedAt: h.policyAcceptedAt });
      this.notifier.notify(db, order, 'Đặt hàng thành công', `Cảm ơn bạn đã đặt hàng! Đơn dự kiến được giao từ ${formatShortDate(edd.earliest)} đến ${formatShortDate(edd.latest)}.`, nowIso);
      return order;
    });
  }

  // ------------------------------------------------------------------ customer actions

  /** FR-OT-05 / EX-01: COD orders only, inside the hidden change-of-mind window. No refund. */
  cancelCodOrder(orderId: string, input: { reason: CancelReason; note?: string }, opts: MutateOptions): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('cancel_order', { p_order_id: orderId }, orderId);
    return this.mutate(orderId, { ...opts, staleMessage: MESSAGES.codConfirmed }, (o, db, now) => {
      if (o.status === 'Cancelled') throw new BusinessError('Đơn hàng đã được hủy trước đó');
      if (!canCancelCod(o, now)) throw new BusinessError(MESSAGES.codConfirmed);
      const nowIso = now.toISOString();
      const next = withCancellation(o, this.customerActor(o), 'Customer_In_Window', false, `Khách hủy đơn: ${CANCEL_REASON_LABELS[input.reason]}`, nowIso, {
        reason: input.reason,
        note: input.note,
      });
      this.releaseStock(db, next, nowIso);
      this.risk.reportCancellation(db, next, 'Customer_In_Window', false, nowIso);
      this.notifier.notify(db, next, 'Đơn hàng đã hủy', 'Đơn thanh toán khi nhận hàng của bạn đã được hủy và không phát sinh bất kỳ khoản phí nào.', nowIso);
      return next;
    });
  }

  /** FR-OT-19 / EX-15: prepaid orders ask CSKH; the order is held in the same transaction. */
  requestCancel(orderId: string, input: { reason: CancelReason; note?: string }, opts: MutateOptions): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('request_cancel', { p_order_id: orderId, p_reason: input.reason, p_note: input.note ?? null }, orderId);
    return this.mutate(orderId, opts, (o, db, now) => {
      if (isOnHold(o)) throw new BusinessError(MESSAGES.requestExists);
      if (!canRequestCancel(o)) throw new BusinessError(MESSAGES.inProduction);
      const nowIso = now.toISOString();
      const slaDueAt = addWorkingDays(now, DELIVERY_CONFIG.cancelRequestSlaDays, DELIVERY_CONFIG.holidays);
      slaDueAt.setHours(now.getHours(), now.getMinutes(), 0, 0);
      const request = {
        id: newId('cr'),
        reason: input.reason,
        note: input.note?.trim() || undefined,
        status: 'Pending' as const,
        slaDueAt: slaDueAt.toISOString(),
        createdAt: nowIso,
      };
      const next = withLog(
        { ...o, cancelRequests: [...o.cancelRequests, request] },
        o.status,
        o.status,
        this.customerActor(o),
        `Khách gửi yêu cầu hủy đơn: ${CANCEL_REASON_LABELS[input.reason]}`,
        nowIso,
      );
      this.notifier.notify(db, next, 'Đã gửi yêu cầu hủy đơn', `CSKH sẽ phản hồi trước ${formatFullDate(request.slaDueAt)}. Trong thời gian này, đơn tạm dừng xử lý.`, nowIso);
      return next;
    });
  }

  /** Customer withdraws a pending request: the hold is released. */
  withdrawCancelRequest(orderId: string, opts: MutateOptions): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('withdraw_cancel_request', { p_order_id: orderId }, orderId);
    return this.mutate(orderId, opts, (o, _db, now) => {
      const r = pendingCancelRequest(o);
      if (!r) throw new BusinessError('Yêu cầu hủy đã có kết quả, không thể rút lại');
      const nowIso = now.toISOString();
      return withLog(
        { ...o, cancelRequests: o.cancelRequests.map((x) => (x.id === r.id ? { ...x, status: 'Withdrawn' as const, decidedAt: nowIso } : x)) },
        o.status,
        o.status,
        this.customerActor(o),
        'Khách rút lại yêu cầu hủy đơn',
        nowIso,
      );
    });
  }

  /**
   * CSKH decides (FR-OT-19). Accept: Cancelled + RefundRequest S1 (customer picks bank or
   * voucher in the refund progress block). Reject: reason required, hold time added to EDD
   * unless CSKH answered after slaDueAt (EX-16).
   */
  decideCancelRequest(orderId: string, accept: boolean, reason: string, actor: Actor): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('decide_cancel_request', { p_order_id: orderId, p_accept: accept, p_reason: reason }, orderId);
    if (actor.type !== 'CustomerService') return fail({ message: 'Chỉ nhân viên CSKH được xử lý yêu cầu hủy' });
    return this.mutate(orderId, {}, (o, db, now) => {
      const r = pendingCancelRequest(o);
      if (!r) throw new BusinessError(MESSAGES.handledByOther);
      if (!accept && !reason.trim()) throw new BusinessError('Từ chối bắt buộc nhập lý do hiển thị cho khách');
      const nowIso = now.toISOString();
      const decided = { ...r, status: accept ? ('Accepted' as const) : ('Rejected' as const), decidedAt: nowIso, decidedBy: actor.id, decisionReason: reason.trim() || undefined };
      const withDecision: Order = { ...o, cancelRequests: o.cancelRequests.map((x) => (x.id === r.id ? decided : x)) };

      if (accept) {
        let next = withCancellation(withDecision, actor, 'Customer_Request_Accepted', false, `CSKH chấp nhận yêu cầu hủy: ${CANCEL_REASON_LABELS[r.reason]}`, nowIso, {
          reason: r.reason,
          note: r.note,
        });
        next = withRefund(next, 'S1', undefined, nowIso).order;
        this.releaseStock(db, next, nowIso);
        this.risk.reportCancellation(db, next, 'Customer_Request_Accepted', false, nowIso);
        this.notifier.notify(db, next, 'Yêu cầu hủy đã được chấp nhận', 'Vui lòng nhập tài khoản nhận hoàn trong chi tiết đơn.', nowIso);
        return next;
      }

      const overdue = now.getTime() > new Date(r.slaDueAt).getTime();
      const held = overdue ? 0 : workingDaysBetween(r.createdAt, nowIso);
      const edd = shiftEdd(o.earliestEDD, o.latestEDD, held);
      const next = withLog(
        { ...withDecision, earliestEDD: edd.earliest, latestEDD: edd.latest },
        o.status,
        o.status,
        actor,
        `CSKH từ chối yêu cầu hủy: ${reason.trim()}${held > 0 ? ` (ngày giao dự kiến lùi ${held} ngày làm việc)` : ''}`,
        nowIso,
      );
      this.notifier.notify(db, next, 'Yêu cầu hủy không được chấp nhận', `${reason.trim()}. Đơn của bạn tiếp tục được xử lý.`, nowIso);
      return next;
    });
  }

  /** UC-OT-02 AF 1.2: Action_Required -> "Hủy đơn & nhận hoàn tiền" (situation 2). */
  cancelRejectedOrder(orderId: string, refund: RefundChoice | undefined, opts: MutateOptions): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteCancelWithRefund('cancel_rejected_order', orderId, refund);
    return this.mutate(orderId, opts, (o, db, now) => {
      if (o.status !== 'Action_Required') throw new BusinessError(MESSAGES.staleOrder);
      this.assertRefundChoice(o, refund);
      const nowIso = now.toISOString();
      let next = withCancellation(o, this.customerActor(o), 'Design_Rejected', true, 'Khách hủy đơn: thiết kế bị từ chối', nowIso);
      next = withRefund(next, 'S2', refund, nowIso).order;
      this.releaseStock(db, next, nowIso);
      this.risk.reportCancellation(db, next, 'Design_Rejected', true, nowIso);
      this.notifier.notify(db, next, 'Đơn hàng đã hủy', 'Shop sẽ hoàn 100% giá trị đơn sau khi xác nhận yêu cầu.', nowIso);
      return next;
    });
  }

  /** UC-OT-11 AF 3.2: back to the moderation queue (max 2 re-submissions). */
  resubmitDesign(orderId: string, opts: MutateOptions): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('resubmit_design', { p_order_id: orderId }, orderId);
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
  confirmReceived(orderId: string, opts: MutateOptions): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('confirm_received', { p_order_id: orderId }, orderId);
    return this.mutate(orderId, opts, (o, db, now) => {
      if (o.status !== 'Delivered' || hasOpenTicket(o)) throw new BusinessError(MESSAGES.staleOrder);
      const nowIso = now.toISOString();
      const next = { ...withTransition(o, 'Completed', this.customerActor(o), 'Khách xác nhận đã nhận hàng', nowIso), reviewInvitePending: true };
      this.loyalty.earnPoints(db, next, nowIso);
      return next;
    });
  }

  submitReview(orderId: string, input: { stars: number; tags?: readonly string[]; comment?: string; photoNames?: readonly string[] }): OpResult | Promise<OpResult> {
    if (this.remote()) return Promise.resolve(fail({ message: 'Đánh giá sẽ được lưu khi nối với chức năng Đánh giá sản phẩm.' }));
    return this.mutate(orderId, {}, (o, _db, now) => {
      if (o.status !== 'Completed' || o.review) throw new BusinessError('Đơn hàng không thể đánh giá');
      if (input.stars < 1 || input.stars > 5) throw new BusinessError('Vui lòng chọn từ 1 đến 5 sao');
      const review = { stars: input.stars, tags: [...(input.tags ?? [])], photoNames: [...(input.photoNames ?? [])], comment: (input.comment ?? '').trim(), createdAt: now.toISOString() };
      return { ...o, review, reviewInvitePending: false };
    });
  }

  dismissReviewInvite(orderId: string): OpResult | Promise<OpResult> {
    if (this.remote()) return Promise.resolve(fail({ message: '' }));
    return this.mutate(orderId, {}, (o) => ({ ...o, reviewInvitePending: false }));
  }

  /** UC-OT-04 / FR-OT-11 / EX-03 / EX-04 / EX-07. */
  reportIssue(
    orderId: string,
    input: { issueType: IssueType; description: string; evidenceNames: readonly string[] },
    opts: MutateOptions,
  ): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('report_issue', { p_order_id: orderId, p_ticket_id: `TK-${Date.now().toString(36).toUpperCase()}` }, orderId);
    if (this.demo.state().networkDown) return fail({ message: MESSAGES.network, code: 'NETWORK' });
    const current = this.orders().find((o) => o.id === orderId);
    if (!current) return fail({ message: 'Không tìm thấy đơn hàng' });
    const ticket = this.complaints.createTicket(current, input.issueType);
    if (ticket.error) return fail({ message: ticket.error.message, code: 'CSKH' });

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
  requestRedelivery(orderId: string, opts: MutateOptions): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('request_redelivery', { p_order_id: orderId }, orderId);
    const current = this.orders().find((o) => o.id === orderId);
    if (!current) return fail({ message: 'Không tìm thấy đơn hàng' });
    const fee = faultParty(current) === 'Customer' ? redeliveryFee(current) : 0;
    if (!canRequestRedelivery(current, this.clock.now())) return fail({ message: MESSAGES.staleOrder });
    const paid = this.payment.confirmRedeliveryFee(fee);
    if (paid.error) return fail({ message: paid.error.message });

    return this.mutate(orderId, opts, (o, _db, now) => {
      if (!canRequestRedelivery(o, now)) throw new BusinessError(MESSAGES.staleOrder);
      const nowIso = now.toISOString();
      const edd = computeEdd({
        confirmedAt: now,
        hasCustomItem: o.hasCustomItem,
        tier: o.shippingTier,
        transitDays: o.shipping.transitDays,
        handling: DELIVERY_CONFIG.redeliveryHandlingDays,
      });
      const next = withTransition(o, 'Ready_for_Pickup', this.customerActor(o), fee > 0 ? `Khách yêu cầu giao lại, đã trả cước ${formatVnd(fee)} (${paid.data})` : 'Khách yêu cầu giao lại (miễn phí)', nowIso);
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
  cancelAfterFailure(orderId: string, refund: RefundChoice | undefined, opts: MutateOptions): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteCancelWithRefund('cancel_after_failure', orderId, refund);
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
  submitRefundAccount(orderId: string, refundId: string, choice: RefundChoice): OpResult | Promise<OpResult> {
    if (this.remote()) {
      if (choice.method !== 'Bank') return Promise.resolve(fail({ message: 'Vui lòng nhập tài khoản ngân hàng.' }));
      return this.remoteOp('submit_refund_account', { p_refund_id: refundId, p_bank: choice.bank, p_account_no: choice.accountNo, p_holder: choice.holder }, orderId);
    }
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
  ): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('moderate_design', { p_order_id: orderId, p_approve: decision === 'Approved', p_violation: detail.violationGroup ?? null, p_reason: detail.reason ?? null }, orderId);
    return this.mutate(orderId, opts, (o, db, now) => {
      if (o.status === 'Cancelled') throw new BusinessError(MESSAGES.cancelledByCustomer);
      if (o.status !== 'Pending_Review') throw new BusinessError(MESSAGES.handledByOther);
      if (isOnHold(o)) throw new BusinessError(MESSAGES.onHold);
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
        // v8: approval confirms the order ("Đã xác nhận"); the 16:00 batch moves it to In_Production.
        return {
          ...withTransition(withReview, 'Pending_Confirmation', actor, `Duyệt bản thiết kế vòng ${round}`, nowIso),
          confirmedAt: nowIso,
          batchDate: toDateKey(batchDateFor(now)),
        };
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
          ? `Lý do: ${detail.violationGroup}. Bạn đã dùng hết lượt gửi lại, bạn có thể hủy đơn và nhận hoàn 100%.`
          : `Lý do: ${detail.violationGroup}. Bạn có ${DELIVERY_CONFIG.designFixDeadlineDays} ngày để chỉnh sửa, hoặc có thể hủy đơn và nhận hoàn 100%.`,
        nowIso,
      );
      return next;
    });
  }

  /** UC-OT-06 step 4: "Chốt mẻ" at 16:00 on working days. */
  closeBatch(actor: Actor): Result<{ count: number; groups: Record<string, number> }> | Promise<Result<{ count: number; groups: Record<string, number> }>> {
    if (this.remote()) {
      return this.store.rpc<number>('start_production').then((r) =>
        r.error ? fail(r.error) : r.data ? ok({ count: r.data, groups: {} }) : fail({ message: 'Không có đơn nào cần đưa vào sản xuất' }),
      );
    }
    const now = this.clock.now();
    try {
      return this.repo.transact((db) => {
        const nowIso = now.toISOString();
        const groups: Record<string, number> = {};
        let count = 0;
        db.orders = db.orders.map((o) => {
          // Today's 16:00 run, plus any order that missed its run (it may start at any time).
          if (!productionSlot(o, now)) return o;
          count++;
          o.items.filter((i) => i.isCustom).forEach((i) => (groups[i.phoneModel] = (groups[i.phoneModel] ?? 0) + i.quantity));
          return { ...startProduction(o, actor, nowIso), updatedAt: nowIso };
        });
        if (count === 0) {
          const waitingToday = db.orders.some((o) => o.status === 'Pending_Confirmation' && o.hasCustomItem && !!o.confirmedAt && !isOnHold(o));
          throw new BusinessError(
            waitingToday
              ? `Đợt sản xuất hôm nay bắt đầu lúc ${String(DELIVERY_CONFIG.batchCutoff.hour).padStart(2, '0')}:00 (Thứ 2 – Thứ 6). Hiện không có đơn trễ hẹn.`
              : 'Không có đơn nào cần đưa vào sản xuất',
          );
        }
        return ok({ count, groups });
      });
    } catch (e) {
      return this.toFail(e);
    }
  }

  /** UC-OT-06 step 7 / AF 4.1: QC passed and packed (mixed orders ship as one parcel). */
  markPacked(orderId: string, actor: Actor, opts: MutateOptions = {}): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('mark_packed', { p_order_id: orderId }, orderId);
    return this.mutate(orderId, opts, (o, _db, now) => {
      if (o.status === 'Cancelled') throw new BusinessError(MESSAGES.cancelledByCustomer);
      if (isOnHold(o)) throw new BusinessError(MESSAGES.onHold);
      if (o.status === 'Pending_Confirmation') {
        if (o.hasCustomItem) throw new BusinessError('Đơn có hàng thiết kế theo yêu cầu phải qua mẻ in trước khi đóng gói');
        if (!isConfirmed(o, now)) {
          const mins = Math.ceil((new Date(o.confirmDueAt!).getTime() - now.getTime()) / 60_000);
          throw new BusinessError(`Đơn COD còn trong thời gian đổi ý, mở khóa sau ${mins} phút (chỉ hiển thị nội bộ)`);
        }
      }
      const reason = o.status === 'In_Production' ? (o.items.some((i) => !i.isCustom) ? 'QC đạt, đóng gói chung một kiện' : 'QC đạt, đóng gói xong') : 'Đóng gói hàng có sẵn';
      const next = withTransition(o, 'Ready_for_Pickup', actor, reason, now.toISOString());
      return { ...next, confirmedAt: o.confirmedAt ?? o.confirmDueAt ?? now.toISOString() };
    });
  }

  /** FR-OT-EX-05: stays In_Production, next batch, EDD + 1 working day. */
  markQcReprint(orderId: string, actor: Actor): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('mark_qc_reprint', { p_order_id: orderId }, orderId);
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
  ):
    | Result<{ result: 'Applied' | 'Duplicate' | 'Rejected'; message: string; eventId: string }>
    | Promise<Result<{ result: 'Applied' | 'Duplicate' | 'Rejected'; message: string; eventId: string }>> {
    const eventId = input.eventId ?? newId('whk');
    if (this.remote()) {
      // Real orders: the simulator plays the carrier through the apply_carrier_event RPC.
      return this.store
        .rpc<string>('apply_carrier_event', { p_event_id: eventId, p_order_id: orderId, p_type: type, p_failure_cause: input.failureCause ?? null })
        .then((r) =>
          r.error
            ? fail(r.error)
            : ok({ result: r.data === 'duplicate' ? ('Duplicate' as const) : ('Applied' as const), message: r.data === 'duplicate' ? 'Sự kiện trùng, đã bỏ qua' : 'Đã cập nhật đơn', eventId }),
        );
    }
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
        this.notifier.notify(db, next, 'Đơn hàng đã được giao', 'Hãy kiểm tra sản phẩm và bấm "Đã nhận được hàng" khi bạn hài lòng.', nowIso);
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
        this.notifier.notify(db, next, 'Giao hàng không thành công', `Lý do: ${FAILURE_CAUSES[failureCause].label}. Hàng đang được chuyển về kho của shop.`, nowIso);
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
          this.notifier.notify(db, next, 'Đơn hàng đã đóng', 'Giao hàng không thành công nên đơn thanh toán khi nhận hàng đã được hủy.', nowIso);
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
    if (value.expressSurcharge > 0) {
      const fast = withVoucher(next, 'Express_Surcharge', value.expressSurcharge, nowIso);
      next = fast.order;
      this.loyalty.requestVoucher(db, next, 'Express_Surcharge', value.expressSurcharge, fast.voucher.code, nowIso);
    }
    this.notifier.notify(db, next, 'Xin lỗi vì đơn giao trễ', 'CasEYE’s gửi bạn voucher bù giao trễ, xem trong chi tiết đơn.', nowIso);
    return withLog(next, o.status, o.status, { type: 'System', id: 'edd-guarantee' }, 'Giao trễ so với ngày dự kiến, cấp voucher bảo đảm', nowIso);
  }

  // ------------------------------------------------------------------ CSKH & Khiếu nại results

  /** UC-OT-08 / FR-OT-16 for Return_Requested orders. */
  applyComplaintResult(orderId: string, resolution: Resolution, note: string, actor: Actor, voucherValue = 30_000): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('apply_ticket_result', { p_order_id: orderId, p_resolution: resolution, p_note: note }, orderId);
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
          confirmedAt: now,
          hasCustomItem: o.hasCustomItem,
          tier: o.shippingTier,
          transitDays: o.shipping.transitDays,
          handling: o.hasCustomItem ? undefined : DELIVERY_CONFIG.redeliveryHandlingDays,
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
  resolveDispute(orderId: string, customerRight: boolean, note: string, actor: Actor): OpResult | Promise<OpResult> {
    if (this.remote()) return Promise.resolve(fail({ message: 'Khiếu nại nguyên nhân giao hàng chưa có trên cơ sở dữ liệu.' }));
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

  /** Approve: goes to Processing (Admin transfers manually, then records the bank reference). */
  approveRefund(orderId: string, refundId: string, actor: Actor): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('approve_refund', { p_refund_id: refundId }, orderId);
    return this.refundOp(orderId, refundId, actor, (o, r, db, nowIso) => {
      if (r.status !== 'Pending_Approval') throw new BusinessError(MESSAGES.handledByOther);
      if (!r.refundMethod) throw new BusinessError('Khách chưa cung cấp tài khoản nhận hoàn');
      if (!sameHolderName(r.refundAccountHolder ?? '', o.payerName)) throw new BusinessError(`${MESSAGES.holderMismatch}: hãy từ chối và yêu cầu khách xác nhận lại`);
      return this.replaceRefund(o, { ...r, status: 'Processing', approvedBy: actor.id });
    });
  }

  completeRefund(orderId: string, refundId: string, bankRef: string, actor: Actor): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('complete_refund', { p_refund_id: refundId, p_bank_ref: bankRef }, orderId);
    return this.refundOp(orderId, refundId, actor, (o, r, db, nowIso) => {
      if (!['Processing', 'Refund_Pending_Manual'].includes(r.status)) throw new BusinessError(MESSAGES.handledByOther);
      if (!bankRef.trim()) throw new BusinessError('Nhập mã tham chiếu ngân hàng');
      this.notifier.notify(db, o, 'Đã hoàn tiền', `${r.amount.toLocaleString('vi-VN')} đ đã được chuyển với nội dung "HOAN ${o.orderCode}".`, nowIso);
      return this.replaceRefund(o, { ...r, status: 'Refunded', bankRef: bankRef.trim(), resolvedAt: nowIso });
    });
  }

  markTransferFailed(orderId: string, refundId: string, actor: Actor): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('mark_transfer_failed', { p_refund_id: refundId }, orderId);
    return this.refundOp(orderId, refundId, actor, (o, r, db, nowIso) => {
      if (r.status !== 'Processing') throw new BusinessError(MESSAGES.handledByOther);
      const attempts = r.transferAttempts + 1;
      const status = attempts >= DELIVERY_CONFIG.maxRefundTransferAttempts ? 'Refund_Pending_Manual' : 'Refund_Pending_Retry';
      if (status === 'Refund_Pending_Retry') {
        this.notifier.notify(db, o, 'Cần xác nhận lại tài khoản nhận hoàn', 'Chuyển khoản chưa thành công. Vui lòng kiểm tra lại thông tin tài khoản trong chi tiết đơn.', nowIso);
      }
      return this.replaceRefund(o, { ...r, status, transferAttempts: attempts });
    });
  }

  retryTransfer(orderId: string, refundId: string, actor: Actor): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('retry_transfer', { p_refund_id: refundId }, orderId);
    return this.refundOp(orderId, refundId, actor, (o, r) => {
      if (r.status !== 'Refund_Pending_Retry') throw new BusinessError(MESSAGES.handledByOther);
      return this.replaceRefund(o, { ...r, status: 'Processing' });
    });
  }

  rejectRefund(orderId: string, refundId: string, reason: string, actor: Actor): OpResult | Promise<OpResult> {
    if (this.remote()) return this.remoteOp('reject_refund', { p_refund_id: refundId, p_reason: reason }, orderId);
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
        throw new BusinessError(current.status === 'Cancelled' ? MESSAGES.cancelledByCustomer : (opts.staleMessage ?? MESSAGES.staleOrder));
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
  /**
   * Thanh toán → Supabase place_order. Shop items are matched to product variants (slug + phone
   * model), designs are saved to the designs table first. Delivery dates come from domain/edd.ts.
   */
  private async placeRemoteOrder(h: OrderIntakeRequest): Promise<Result<{ readonly orderCode: string }>> {
    const db = this.store.client;
    const userId = this.auth?.user()?.id;
    if (!userId) return fail({ message: 'Vui lòng đăng nhập để đặt hàng.' });
    const hasCustom = h.items.some((i) => i.isCustom);
    const createdAt = this.clock.now();
    const isCod = h.paymentMethod === 'COD';
    const edd = computeEdd({
      confirmedAt: isCod ? new Date(createdAt.getTime() + DELIVERY_CONFIG.codRegretMinutes * 60_000) : createdAt,
      hasCustomItem: hasCustom,
      tier: h.shippingTier,
      transitDays: h.shipping.transitDays,
    });
    const items: { type: 'product' | 'design'; id: string; qty: number }[] = [];
    for (const it of h.items) {
      const modelName = toCatalogModelName(it.phoneModel);
      if (it.isCustom) {
        const { data: model } = await db.from('phone_models').select('id').eq('name', modelName).maybeSingle();
        if (!model) return fail({ message: `Chưa có dòng máy ${it.phoneModel} trong hệ thống.` });
        const { data: design, error } = await db
          .from('designs')
          .insert({ user_id: userId, phone_model_id: model.id, name: it.productName, canvas_json: {}, preview_url: it.design?.previewUrl ?? it.imageUrl ?? null })
          .select('id')
          .single();
        if (error || !design) return fail({ message: 'Chưa lưu được bản thiết kế. Vui lòng thử lại.' });
        items.push({ type: 'design', id: design.id, qty: it.quantity });
      } else {
        const slug = it.baseSku === 'GIFT-HOLOGRAM' ? 'gift-hologram' : it.baseSku;
        const { data: product } = await db.from('products').select('id, product_variants(id, phone_model_id, phone_models(name))').eq('slug', slug).maybeSingle();
        const variants = ((product as { product_variants?: { id: string; phone_models: { name: string } | null }[] } | null)?.product_variants ?? []);
        const variant = variants.find((v) => v.phone_models?.name === modelName) ?? (variants.length === 1 ? variants[0] : undefined);
        if (!variant) return fail({ message: `Sản phẩm ${it.productName} (${it.phoneModel}) chưa có trong kho.` });
        items.push({ type: 'product', id: variant.id, qty: it.quantity });
      }
    }
    const parts = h.shippingAddress.split(',').map((p) => p.trim()).filter(Boolean);
    const shipping = {
      recipient: h.recipient?.name ?? h.payerName,
      phone: h.recipient?.phone ?? '',
      line: parts.slice(0, Math.max(1, parts.length - 3)).join(', ') || h.shippingAddress,
      ward: parts.at(-3) ?? '',
      district: parts.at(-2) ?? null,
      city: parts.at(-1) ?? '',
      payment_method: isCod ? 'cod' : 'prepaid',
      payment_channel: h.paymentChannel ?? (isCod ? 'cod' : 'vietqr'),
      payment_txn_ref: h.paymentTxnRef ?? null,
      tier: h.shippingTier === 'Express' ? 'express' : 'standard',
      fee: h.shipping.fee,
      standard_fee: h.shipping.standardFee,
      express_surcharge: h.shipping.expressSurcharge,
      transit_min: h.shipping.transitDays.min,
      transit_max: h.shipping.transitDays.max,
      discount: h.discount ?? 0,
      policy_version: h.policyVersion,
      earliest_edd: edd.earliest,
      latest_edd: edd.latest,
      batch_date: edd.batchDate,
    };
    const r = await this.store.rpc<string>('place_order', { p_items: items, p_shipping: shipping });
    if (r.error) return fail(r.error);
    const order = this.store.orders().find((o) => o.id === r.data);
    return order ? ok({ orderCode: order.orderCode }) : fail({ message: MESSAGES.staleOrder });
  }

}

/** Shop and Checkout say "Samsung S24", the catalog says "Galaxy S24". */
export function toCatalogModelName(name: string): string {
  return name.replace(/^Samsung S/, 'Galaxy S');
}
