import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationManager } from '../../../shared/ui/notification/notification.manager';
import { PhoneCaseMock } from '../../../shared/ui/phone-case-mock/phone-case-mock';
import { CancelDialog, CANCEL_REASONS, CancelMode } from '../components/cancel-dialog/cancel-dialog';
import { CancelRequestPanel } from '../components/cancel-request-panel/cancel-request-panel';
import { NotificationBell } from '../components/notification-bell/notification-bell';
import { OrderJourney } from '../components/order-journey/order-journey';
import { OrderTimeline } from '../components/order-timeline/order-timeline';
import { OtModal } from '../components/ot-modal/ot-modal';
import { RedeliveryDialog } from '../components/redelivery-dialog/redelivery-dialog';
import { RefundProgress } from '../components/refund-progress/refund-progress';
import { ISSUE_TYPES, ReportIssueDialog } from '../components/report-issue-dialog/report-issue-dialog';
import { ReviewCard } from '../components/review-card/review-card';
import { StatusBadge } from '../components/status-badge/status-badge';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, simulateLatency } from '../components/ui';
import { DELIVERY_CONFIG, FAILURE_CAUSES, FAULT_PARTY_LABELS, SHIPPING_TIER_LABELS } from '../config/delivery-config';
import { STATUS_META, TONE_CLASSES } from '../config/status-style';
import { addDaysIso, formatDayLabel, formatFullDate, toDateKey } from '../domain/calendar';
import { DetailIntent } from '../domain/actions';
import {
  canCancelAfterFailure,
  canCancelCod,
  canReportIssue,
  canRequestCancel,
  canRequestRedelivery,
  canResubmitDesign,
  complaintWindowExpired,
  failedDeliveryRefundSituation,
  faultParty,
  hasOpenTicket,
  isMixed,
  isPrepaid,
  orderTotal,
} from '../domain/order-rules';
import { isLateForCustomer } from '../domain/schedule';
import { formatVnd } from '../domain/shipping-fee';
import { statusLabel } from '../domain/timeline';
import { OrderItem } from '../models/order-tracking.model';
import { Clock } from '../services/clock';
import { OrderTrackingService } from '../services/order-tracking.service';
import { track } from '../services/tracker';

/** "Bạn cần làm gì?" banner content (P1-6): one sentence + one button. */
interface Todo {
  readonly text: string;
  readonly button: string;
  readonly intent: DetailIntent;
}

/**
 * UC-OT-01 detail view. Reading order follows the customer's questions (P1-5):
 * what must I do → where is my order and when will it arrive → what did I order → help.
 */
@Component({
  selector: 'app-order-detail',
  imports: [
    DatePipe,
    RouterLink,
    PhoneCaseMock,
    StatusBadge,
    OrderTimeline,
    OrderJourney,
    OtModal,
    CancelDialog,
    ReportIssueDialog,
    RedeliveryDialog,
    ReviewCard,
    RefundProgress,
    CancelRequestPanel,
    NotificationBell,
  ],
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail {
  /** Route param (withComponentInputBinding). */
  readonly orderCode = input.required<string>();
  /** Deep link from the order card / notifications (`?action=`). */
  readonly action = input<string>();

  private readonly service = inject(OrderTrackingService);
  private readonly clock = inject(Clock);
  private readonly toast = inject(NotificationManager);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnSecondary = BTN_SECONDARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly formatVnd = formatVnd;
  protected readonly tierLabels = SHIPPING_TIER_LABELS;
  protected readonly fixDays = DELIVERY_CONFIG.designFixDeadlineDays;
  protected readonly todoBox = `flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center sm:justify-between ${TONE_CLASSES.warning.box}`;

  protected readonly order = computed(() => {
    const o = this.service.findByCode(decodeURIComponent(this.orderCode()));
    return o && o.customerId === this.service.customer().id ? o : undefined;
  });
  private readonly now = computed(() => this.clock.nowSignal());

  // dialogs and panels
  protected readonly cancelMode = signal<CancelMode | null>(null);
  protected readonly issueOpen = signal(false);
  protected readonly redeliveryOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly lightbox = signal<OrderItem | null>(null);
  protected readonly paymentOpen = signal(false);
  protected readonly busy = signal(false);
  private viewedCode = '';
  private intentHandled = false;

  // derived state (UI hint; the service re-checks every rule)
  protected readonly meta = computed(() => STATUS_META[this.order()!.status]);
  protected readonly infoBox = computed(() => `rounded-card border p-5 ${TONE_CLASSES[this.meta().tone].box}`);
  protected readonly label = computed(() => statusLabel(this.order()!, this.now()));
  protected readonly mixed = computed(() => isMixed(this.order()!));
  protected readonly lateForCustomer = computed(() => isLateForCustomer(this.order()!, this.now()));
  protected readonly total = computed(() => orderTotal(this.order()!));
  protected readonly canCancelCod = computed(() => canCancelCod(this.order()!, this.now()));
  protected readonly canRequestCancel = computed(() => canRequestCancel(this.order()!));
  protected readonly cannotCancelNote = computed(() => {
    const o = this.order()!;
    return isPrepaid(o) && ['In_Production', 'Ready_for_Pickup', 'In_Transit'].includes(o.status);
  });
  protected readonly canResubmit = computed(() => canResubmitDesign(this.order()!));
  protected readonly resubmitsLeft = computed(() => DELIVERY_CONFIG.maxDesignResubmit - this.order()!.designResubmitCount);
  protected readonly lastRejection = computed(() => this.order()!.moderationReviews.filter((r) => r.decision === 'Rejected').at(-1));
  protected readonly canConfirm = computed(() => this.order()!.status === 'Delivered' && !hasOpenTicket(this.order()!));
  protected readonly canReport = computed(() => canReportIssue(this.order()!, this.now()));
  protected readonly reportDeadline = computed(() => {
    const d = this.order()!.deliveredAt;
    return d ? formatFullDate(addDaysIso(d, DELIVERY_CONFIG.complaintWindowDays)) : '';
  });
  protected readonly reportExpired = computed(() => complaintWindowExpired(this.order()!, this.now()));
  protected readonly openTicket = computed(() => this.order()!.tickets.find((t) => t.open));
  protected readonly closedTickets = computed(() => this.order()!.tickets.filter((t) => !t.open));
  protected readonly canRedeliver = computed(() => canRequestRedelivery(this.order()!, this.now()));
  protected readonly canCancelFailed = computed(() => canCancelAfterFailure(this.order()!, this.now()));
  protected readonly failedSituation = computed(() => failedDeliveryRefundSituation(this.order()!));
  protected readonly failureText = computed(() => {
    const o = this.order()!;
    const p = faultParty(o);
    return o.failureCause && p ? { cause: FAILURE_CAUSES[o.failureCause].label, party: FAULT_PARTY_LABELS[p] } : null;
  });
  protected readonly refundNeedsCustomer = computed(() =>
    this.order()!.refunds.some((r) => (r.status === 'Pending_Approval' && !r.refundMethod) || r.status === 'Refund_Pending_Retry'),
  );
  protected readonly cancelReasonLabel = computed(() => {
    const c = this.order()!.cancellation;
    if (!c) return '';
    if (c.reason) return CANCEL_REASONS.find((r) => r.key === c.reason)?.label ?? '';
    return {
      Customer_In_Window: 'Bạn hủy đơn',
      Customer_Request_Accepted: 'Yêu cầu hủy được CSKH chấp nhận',
      Design_Rejected: 'Thiết kế chưa đạt chính sách nội dung, bạn chọn hủy',
      Design_Fix_Expired: 'Quá hạn chỉnh sửa thiết kế',
      Delivery_Failed_Customer: 'Giao không thành công',
      Delivery_Failed_Carrier_Or_Shop: 'Giao không thành công (lỗi vận chuyển/shop)',
      Warehouse_Hold_Expired: 'Giao thất bại quá hạn lưu kho',
    }[c.cause];
  });

  /** P1-6: the one thing the customer must do, if any. */
  protected readonly todo = computed<Todo | null>(() => {
    const o = this.order()!;
    if (o.status === 'Action_Required' && this.canResubmit() && o.rejectedAt) {
      const due = formatFullDate(addDaysIso(o.rejectedAt, DELIVERY_CONFIG.designFixDeadlineDays));
      return { text: `Thiết kế của bạn chưa đạt chính sách nội dung. Chỉnh sửa trước ${due} để đơn tiếp tục được in.`, button: 'Chỉnh sửa thiết kế', intent: 'edit-design' };
    }
    if (o.status === 'Delivery_Failed' && o.warehouseHold && !o.warehouseHold.disputed && this.canRedeliver()) {
      return { text: `Giao hàng chưa thành công. Hàng được giữ đến ${formatFullDate(o.warehouseHold.expiresAt)}, hãy chọn cách giao lại.`, button: 'Chọn cách giao lại', intent: 'redeliver' };
    }
    if (this.refundNeedsCustomer()) {
      return { text: 'Nhập tài khoản ngân hàng để shop chuyển tiền hoàn cho bạn.', button: 'Cung cấp thông tin nhận hoàn', intent: 'refund' };
    }
    return null;
  });

  /** Mobile fixed bar (P1-5): the single primary action of the current state. */
  protected readonly mobileAction = computed<Todo | null>(() => {
    const t = this.todo();
    if (t) return t;
    return this.canConfirm() ? { text: '', button: 'Đã nhận được hàng', intent: 'received' } : null;
  });

  protected readonly showEdd = computed(() => !['Cancelled', 'Delivery_Failed', 'Refunded', 'Completed'].includes(this.order()!.status));
  protected readonly edd = computed(() => {
    const o = this.order()!;
    const handling = o.hasCustomItem ? DELIVERY_CONFIG.handlingDays.custom : DELIVERY_CONFIG.handlingDays.stock;
    const t = o.shipping.transitDays;
    const express = o.shippingTier === 'Express';
    const sameDay = o.earliestEDD === toDateKey(new Date(o.confirmedAt ?? o.confirmDueAt ?? o.createdAt));
    return {
      express,
      title: o.status === 'Delivered' ? 'Đã giao' : express ? (sameDay ? 'Giao trong hôm nay' : 'Giao vào ngày làm việc tiếp theo') : 'Dự kiến giao',
      range: o.status === 'Delivered' && o.deliveredAt
        ? formatDayLabel(toDateKey(new Date(o.deliveredAt)))
        : express || o.earliestEDD === o.latestEDD
          ? formatDayLabel(o.earliestEDD)
          : `${formatDayLabel(o.earliestEDD)} – ${formatDayLabel(o.latestEDD)}`,
      delivered: o.status === 'Delivered',
      why: express
        ? `Đơn Hỏa tốc được xác nhận trước ${String(DELIVERY_CONFIG.expressCutoff.hour).padStart(2, '0')}:00 (Thứ Hai – Thứ Sáu) sẽ giao ngay trong ngày; sau giờ này, đơn được giao vào ngày làm việc tiếp theo.`
        : `Gồm ${handling.min}–${handling.max} ngày làm việc để ${o.hasCustomItem ? 'in và kiểm tra chất lượng' : 'chuẩn bị hàng'}, cộng ${t.min === t.max ? t.min : `${t.min}–${t.max}`} ngày vận chuyển đến địa chỉ của bạn (không tính Chủ nhật và ngày lễ).`,
      adjusted: o.redeliveryUsed || o.qcReprintCount > 0 || o.tickets.some((t) => t.resolution === 'Reprint') || o.cancelRequests.some((r) => r.status === 'Rejected'),
    };
  });

  constructor() {
    effect(() => {
      const o = this.order();
      if (!o || o.orderCode === this.viewedCode) return;
      this.viewedCode = o.orderCode;
      untracked(() => track('order_detail_viewed', { status: o.status, orderType: o.hasCustomItem ? (isMixed(o) ? 'mixed' : 'custom') : 'stock' }, o.orderCode));
    });
    // Deep links: open the right dialog once (card buttons, notifications).
    effect(() => {
      const intent = this.action() as DetailIntent | undefined;
      const o = this.order();
      if (!o || !intent || this.intentHandled) return;
      this.intentHandled = true;
      untracked(() => this.runIntent(intent));
    });
  }

  protected runIntent(intent: DetailIntent): void {
    switch (intent) {
      case 'received':
        if (this.canConfirm()) this.confirmOpen.set(true);
        break;
      case 'redeliver':
        if (this.canRedeliver()) this.redeliveryOpen.set(true);
        break;
      case 'edit-design':
        if (this.canResubmit()) void this.resubmit();
        break;
      case 'refund':
        document.getElementById('refund-progress')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
    }
  }

  protected openCancel(mode: CancelMode): void {
    if (mode === 'cod' || mode === 'request') track('cancel_clicked', { kind: mode }, this.order()!.orderCode);
    this.cancelMode.set(mode);
  }

  protected openLightbox(item: OrderItem): void {
    track('design_preview_opened', {}, this.order()!.orderCode);
    this.lightbox.set(item);
  }

  protected onWhy(event: Event): void {
    if ((event.target as HTMLDetailsElement).open) track('edd_why_opened', {}, this.order()!.orderCode);
  }

  protected issueLabel(key: string): string {
    return ISSUE_TYPES.find((t) => t.key === key)?.label ?? key;
  }

  protected resolutionLabel(r: string | undefined): string {
    return r ? { Reprint: 'In lại / gửi lại miễn phí', Voucher: 'Voucher đền bù', Refund: 'Hoàn tiền 100%', Rejected: 'Từ chối' }[r] ?? r : 'Đã xử lý';
  }

  protected voucherLabel(kind: string): string {
    return { Late_Delivery: 'Voucher giao trễ', Express_Surcharge: 'Voucher bù phụ phí Hỏa tốc', Complaint_Compensation: 'Voucher đền bù' }[kind] ?? kind;
  }

  protected async confirmReceived(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    await simulateLatency();
    const r = this.service.confirmReceived(this.order()!.id, { opKey: crypto.randomUUID() });
    this.busy.set(false);
    this.confirmOpen.set(false);
    if (r.error) {
      this.toast.show({ variant: 'warning', title: 'Chưa thể xác nhận', message: r.error.message });
      return;
    }
    track('received_confirmed', {}, this.order()!.orderCode);
    this.toast.show({ variant: 'functional', title: 'Đơn hàng đã hoàn tất', message: "Cảm ơn bạn đã mua sắm tại CasEYE's! Bạn có thể đánh giá sản phẩm ngay bên dưới." });
  }

  protected async resubmit(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    await simulateLatency();
    const r = this.service.resubmitDesign(this.order()!.id, { opKey: crypto.randomUUID() });
    this.busy.set(false);
    this.toast.show(
      r.error
        ? { variant: 'warning', title: 'Chưa gửi lại được', message: r.error.message }
        : { variant: 'functional', title: 'Đã gửi lại thiết kế', message: 'Nhân viên sẽ kiểm tra lại bản thiết kế mới. (Mô phỏng: Design Studio chưa có trang chỉnh sửa.)' },
    );
  }
}
