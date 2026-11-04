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
import { RefundChoiceForm } from '../components/refund-choice-form/refund-choice-form';
import { ReviewDialog } from '../components/review-dialog/review-dialog';
import { StatusBadge } from '../components/status-badge/status-badge';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, simulateLatency } from '../components/ui';
import { DELIVERY_CONFIG, FAILURE_CAUSES, FAULT_PARTY_LABELS } from '../config/delivery-config';
import { REFUND_TONE, STATUS_META, TONE_CLASSES } from '../config/status-style';
import { formatShortDate } from '../domain/calendar';
import { RefundChoice } from '../domain/order-mutations';
import {
  canCancelAfterFailure,
  canCustomerCancel,
  canReportIssue,
  canRequestRedelivery,
  canResubmitDesign,
  complaintWindowExpired,
  failedDeliveryRefundSituation,
  faultParty,
  hasOpenTicket,
  isMixed,
  orderTotal,
  refundStatusLabel,
} from '../domain/order-rules';
import { formatVnd } from '../domain/shipping-fee';
import { ActorType, RefundRequest, RefundSituation } from '../models/order-tracking.model';
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

const SITUATION_LABELS: Record<RefundSituation, string> = {
  S1: 'Hủy đơn khi chưa vào sản xuất',
  S2: 'Thiết kế không được duyệt',
  S3a: 'Giao không thành công do vận chuyển/shop',
  S3b: 'Giao không thành công, hoàn tiền hàng trừ cước hai chiều',
  S3c: 'Không hoàn',
  S4: 'Khiếu nại được chấp nhận',
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
    RefundChoiceForm,
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
  protected readonly situationLabels = SITUATION_LABELS;
  protected readonly zoneLabels = DELIVERY_CONFIG.zoneLabels;
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
  protected readonly canCancel = computed(() => canCustomerCancel(this.order()!, this.now()));
  protected readonly showDisabledCancel = computed(() => {
    const s = this.order()!.status;
    return !this.canCancel() && ['Pending_Confirmation', 'In_Production', 'Ready_for_Pickup'].includes(s);
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
      Customer_Pending_Review: 'Bạn hủy đơn',
      Design_Rejected: 'Thiết kế không được duyệt, bạn chọn hủy',
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
    const ship = DELIVERY_CONFIG.zoneRates[o.zone][o.shippingTier];
    return {
      range: `${formatShortDate(o.earliestEDD)} – ${formatShortDate(o.latestEDD)}`,
      handling: `${handling.min}–${handling.max} ngày làm việc`,
      shipping: `${ship.days.min === ship.days.max ? ship.days.min : `${ship.days.min}–${ship.days.max}`} ngày (${ship.label})`,
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

  protected refundLabel(r: RefundRequest): string {
    return refundStatusLabel(r);
  }

  protected refundBadge(r: RefundRequest): string {
    return TONE_CLASSES[REFUND_TONE[r.status]].badge;
  }

  protected resolutionLabel(r: string | undefined): string {
    return r ? { Reprint: 'In lại / gửi lại miễn phí', Voucher: 'Voucher đền bù', Refund: 'Hoàn tiền 100%', Rejected: 'Từ chối' }[r] ?? r : 'Đã xử lý';
  }

  protected voucherLabel(kind: string): string {
    return { Late_Delivery: 'Voucher giao trễ', Fast_Surcharge: 'Voucher bù phụ phí Giao nhanh', Store_Credit: 'Voucher hoàn tiền', Complaint_Compensation: 'Voucher đền bù' }[kind] ?? kind;
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
        : { variant: 'functional', title: 'Đã gửi lại thiết kế', message: 'Thiết kế mới đang chờ kiểm duyệt.' },
    );
  }

  // pending refund account form (EX-13) / re-confirm after a failed transfer (EX-11)
  protected readonly pendingChoice = signal<RefundChoice | null>(null);

  protected submitAccount(r: RefundRequest): void {
    const choice = this.pendingChoice();
    if (!choice) return;
    const res = this.service.submitRefundAccount(this.order()!.id, r.id, choice);
    this.toast.show(
      res.error
        ? { variant: 'error', title: 'Chưa lưu được', message: res.error.message }
        : { variant: 'functional', title: 'Đã ghi nhận', message: 'Yêu cầu hoàn tiền đang chờ Admin xác nhận.' },
    );
  }
}
