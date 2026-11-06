import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationManager } from '../../../shared/ui/notification/notification.manager';
import { PhoneCaseMock } from '../../../shared/ui/phone-case-mock/phone-case-mock';
import { CancelDialog, CANCEL_REASONS, CancelMode } from '../components/cancel-dialog/cancel-dialog';
import { ISSUE_TYPES, ReportIssueDialog } from '../components/report-issue-dialog/report-issue-dialog';
import { OrderTimeline } from '../components/order-timeline/order-timeline';
import { OtModal } from '../components/ot-modal/ot-modal';
import { RedeliveryDialog } from '../components/redelivery-dialog/redelivery-dialog';
import { CancelRequestPanel } from '../components/cancel-request-panel/cancel-request-panel';
import { RefundProgress } from '../components/refund-progress/refund-progress';
import { ReviewDialog } from '../components/review-dialog/review-dialog';
import { StatusBadge } from '../components/status-badge/status-badge';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, simulateLatency } from '../components/ui';
import { DELIVERY_CONFIG, FAILURE_CAUSES, FAULT_PARTY_LABELS, SHIPPING_TIER_LABELS } from '../config/delivery-config';
import { STATUS_META, TONE_CLASSES } from '../config/status-style';
import { formatDayLabel, formatShortDate, toDateKey } from '../domain/calendar';
import {
  canCancelAfterFailure,
  canCancelCod,
  canRequestCancel,
  isOnHold,
  isPrepaid,
  canReportIssue,
  canRequestRedelivery,
  canResubmitDesign,
  complaintWindowExpired,
  failedDeliveryRefundSituation,
  faultParty,
  hasOpenTicket,
  isMixed,
  orderTotal,
} from '../domain/order-rules';
import { formatVnd } from '../domain/shipping-fee';
import { statusLabel } from '../domain/timeline';
import { ActorType } from '../models/order-tracking.model';
import { Clock } from '../services/clock';
import { OrderTrackingService } from '../services/order-tracking.service';

const ACTOR_LABELS: Record<ActorType, string> = {
  Customer: 'Bạn',
  Operator: "Xưởng CasEYE's",
  Admin: "CasEYE's",
  System: 'Hệ thống',
  Carrier: 'Đơn vị vận chuyển',
  CustomerService: 'Chăm sóc khách hàng',
};

/** UC-OT-01 detail view (FR-OT-01..04, 13, 18) with the customer actions of UC-OT-02..05. */
@Component({
  selector: 'app-order-detail',
  imports: [
    DatePipe,
    RouterLink,
    PhoneCaseMock,
    StatusBadge,
    OrderTimeline,
    OtModal,
    CancelDialog,
    ReportIssueDialog,
    RedeliveryDialog,
    ReviewDialog,
    RefundProgress,
    CancelRequestPanel,
  ],
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail {
  /** Route param (withComponentInputBinding). */
  readonly orderCode = input.required<string>();

  private readonly service = inject(OrderTrackingService);
  private readonly clock = inject(Clock);
  private readonly toast = inject(NotificationManager);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnSecondary = BTN_SECONDARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly formatVnd = formatVnd;
  protected readonly formatShortDate = formatShortDate;
  protected readonly actorLabels = ACTOR_LABELS;
  protected readonly tierLabels = SHIPPING_TIER_LABELS;
  protected readonly fixDays = DELIVERY_CONFIG.designFixDeadlineDays;

  protected starsText(n: number): string {
    return '★'.repeat(n);
  }

  protected readonly order = computed(() => {
    const o = this.service.findByCode(decodeURIComponent(this.orderCode()));
    return o && o.customerId === this.service.customer().id ? o : undefined;
  });
  private readonly now = computed(() => this.clock.nowSignal());

  // dialogs
  protected readonly cancelMode = signal<CancelMode | null>(null);
  protected readonly issueOpen = signal(false);
  protected readonly redeliveryOpen = signal(false);
  protected readonly reviewOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly busy = signal(false);
  private reviewInviteShown = false;

  // derived state for buttons (UI hint; the service re-checks every rule)
  protected readonly meta = computed(() => STATUS_META[this.order()!.status]);
  protected readonly infoBox = computed(() => `rounded-card border p-5 ${TONE_CLASSES[this.meta().tone].box}`);
  protected readonly mixed = computed(() => isMixed(this.order()!));
  protected readonly total = computed(() => orderTotal(this.order()!));
  protected readonly label = computed(() => statusLabel(this.order()!, this.now()));
  /** COD inside the hidden window: direct cancel (FR-OT-05). */
  protected readonly canCancelCod = computed(() => canCancelCod(this.order()!, this.now()));
  /** Prepaid before production: "Yêu cầu hủy đơn" to CSKH (FR-OT-19). */
  protected readonly canRequestCancel = computed(() => canRequestCancel(this.order()!));
  protected readonly onHold = computed(() => isOnHold(this.order()!));
  /** Prepaid order already in production: explain instead of a button (P0-4). */
  protected readonly cannotCancelNote = computed(() => {
    const o = this.order()!;
    return isPrepaid(o) && ['In_Production', 'Ready_for_Pickup', 'In_Transit'].includes(o.status);
  });
  protected readonly canResubmit = computed(() => canResubmitDesign(this.order()!));
  protected readonly resubmitsLeft = computed(() => DELIVERY_CONFIG.maxDesignResubmit - this.order()!.designResubmitCount);
  protected readonly lastRejection = computed(() => this.order()!.moderationReviews.filter((r) => r.decision === 'Rejected').at(-1));
  protected readonly canConfirm = computed(() => this.order()!.status === 'Delivered' && !hasOpenTicket(this.order()!));
  protected readonly canReport = computed(() => canReportIssue(this.order()!, this.now()));
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
  protected readonly showEdd = computed(() => !['Cancelled', 'Delivery_Failed', 'Refunded'].includes(this.order()!.status));
  protected readonly edd = computed(() => {
    const o = this.order()!;
    const handling = o.hasCustomItem ? DELIVERY_CONFIG.handlingDays.custom : DELIVERY_CONFIG.handlingDays.stock;
    const t = o.shipping.transitDays;
    const express = o.shippingTier === 'Express';
    return {
      express,
      range: express || o.earliestEDD === o.latestEDD
        ? formatDayLabel(o.earliestEDD)
        : `${formatDayLabel(o.earliestEDD)} – ${formatDayLabel(o.latestEDD)}`,
      handling: `${handling.min}–${handling.max} ngày làm việc`,
      shipping: `${t.min === t.max ? t.min : `${t.min}–${t.max}`} ngày`,
      expressLine: o.earliestEDD === toDateKey(new Date(o.confirmedAt ?? o.confirmDueAt ?? o.createdAt)) ? 'Giao trong ngày' : 'Giao trong ngày làm việc kế tiếp',
      adjusted: o.redeliveryUsed || o.qcReprintCount > 0 || o.tickets.some((t) => t.resolution === 'Reprint'),
    };
  });
  protected readonly logs = computed(() => [...this.order()!.logs].reverse());

  constructor() {
    // UC-OT-09 step 6: invite to review the first time the order is opened after auto-completion.
    effect(() => {
      const o = this.order();
      if (!o || this.reviewInviteShown) return;
      if (o.status === 'Completed' && o.reviewInvitePending && !o.review) {
        this.reviewInviteShown = true;
        untracked(() => this.reviewOpen.set(true));
      }
    });
  }

  protected issueLabel(key: string): string {
    return ISSUE_TYPES.find((t) => t.key === key)?.label ?? key;
  }



  protected resolutionLabel(r: string | undefined): string {
    return r ? { Reprint: 'In lại / gửi lại miễn phí', Voucher: 'Voucher đền bù', Refund: 'Hoàn tiền 100%', Rejected: 'Từ chối' }[r] ?? r : 'Đã xử lý';
  }

  protected voucherLabel(kind: string): string {
    return { Late_Delivery: 'Voucher giao trễ', Express_Surcharge: 'Voucher bù phụ phí Hỏa tốc', Store_Credit: 'Voucher hoàn tiền', Complaint_Compensation: 'Voucher đền bù' }[kind] ?? kind;
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
    this.toast.show({ variant: 'functional', title: 'Đơn hàng đã hoàn tất', message: 'Cảm ơn bạn đã mua sắm tại CasEYE\'s!' });
    this.reviewInviteShown = true;
    this.reviewOpen.set(true);
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
        : { variant: 'functional', title: 'Đã gửi lại thiết kế', message: 'Nhân viên sẽ kiểm tra lại bản thiết kế mới.' },
    );
  }
}
