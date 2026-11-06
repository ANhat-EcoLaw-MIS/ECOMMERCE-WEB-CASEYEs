import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { CANCEL_REASON_LABELS, DELIVERY_CONFIG, FAILURE_CAUSES, FAULT_PARTY_LABELS } from '../../config/delivery-config';
import { DANGER_OUTLINE, TONE_CLASSES } from '../../config/status-style';
import { addWorkingDays, formatFullDate } from '../../domain/calendar';
import { RefundChoice } from '../../domain/order-mutations';
import { failedDeliveryRefundSituation, faultParty, isPrepaid, orderTotal, refundAmountFor } from '../../domain/order-rules';
import { formatVnd } from '../../domain/shipping-fee';
import { CancelReason, Order, RefundSituation } from '../../models/order-tracking.model';
import { Clock } from '../../services/clock';
import { MESSAGES, OrderTrackingService } from '../../services/order-tracking.service';
import { OtModal } from '../ot-modal/ot-modal';
import { RefundChoiceForm } from '../refund-choice-form/refund-choice-form';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL, simulateLatency } from '../ui';

/**
 * 'cod'      = COD change of mind (FR-OT-05), no refund.
 * 'request'  = prepaid order asks CSKH (FR-OT-19); refund is chosen after acceptance.
 * 'rejected' = design rejected, cancel & refund 100% at once (situation 2).
 * 'failed'   = after a failed delivery (3a / 3b).
 */
export type CancelMode = 'cod' | 'request' | 'rejected' | 'failed';

export const CANCEL_REASONS = (Object.keys(CANCEL_REASON_LABELS) as CancelReason[]).map((key) => ({
  key,
  label: CANCEL_REASON_LABELS[key],
}));

@Component({
  selector: 'app-cancel-dialog',
  imports: [ReactiveFormsModule, OtModal, RefundChoiceForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cancel-dialog.html',
})
export class CancelDialog {
  readonly order = input.required<Order>();
  readonly mode = input<CancelMode>('cod');
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly service = inject(OrderTrackingService);
  private readonly clock = inject(Clock);
  private readonly toast = inject(NotificationManager);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly reasons = CANCEL_REASONS;
  protected readonly btnPrimary = BTN_PRIMARY;
  /** "Xác nhận" is the secondary action in warning colour; "Giữ đơn" is the primary one (P1-10). */
  protected readonly btnConfirm = `${BTN_SECONDARY} ${DANGER_OUTLINE}`;
  protected readonly field = FIELD;
  protected readonly label = LABEL;
  protected readonly errorBox = `rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES.danger.box}`;
  protected readonly formatVnd = formatVnd;

  protected readonly form = this.fb.group({ reason: this.fb.control<CancelReason | ''>(''), note: '' });
  protected readonly reason = signal<CancelReason | ''>('');
  protected readonly refundChoice = signal<RefundChoice | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Snapshot when the pop-up opens (EX-01 optimistic check, EX-06 idempotency key). */
  private opKey = '';
  private openedAt = '';

  protected readonly needsReason = computed(() => this.mode() === 'cod' || this.mode() === 'request');
  protected readonly title = computed(() => {
    switch (this.mode()) {
      case 'cod':
        return 'Bạn muốn hủy đơn này?';
      case 'request':
        return 'Gửi yêu cầu hủy đơn';
      default:
        return 'Hủy đơn và nhận hoàn tiền';
    }
  });
  protected readonly confirmLabel = computed(() => (this.mode() === 'request' ? 'Gửi yêu cầu hủy' : 'Xác nhận hủy'));
  protected readonly slaText = computed(() => {
    const due = addWorkingDays(this.clock.nowSignal(), DELIVERY_CONFIG.cancelRequestSlaDays, DELIVERY_CONFIG.holidays);
    return formatFullDate(due.toISOString());
  });

  protected readonly situation = computed<RefundSituation | null>(() => {
    switch (this.mode()) {
      case 'rejected':
        return 'S2';
      case 'failed':
        return failedDeliveryRefundSituation(this.order());
      default:
        return null;
    }
  });
  protected readonly refund = computed(() => {
    const s = this.situation();
    return s ? refundAmountFor(this.order(), s) : null;
  });
  protected readonly amountLabel = computed(() => (this.refund() ? formatVnd(this.refund()!.amount) : ''));
  protected readonly needsRefundChoice = computed(() => isPrepaid(this.order()) && !!this.refund() && this.refund()!.amount > 0);
  protected readonly total = computed(() => formatVnd(orderTotal(this.order())));
  protected readonly faultText = computed(() => {
    const o = this.order();
    const party = faultParty(o);
    return o.failureCause && party ? `${FAILURE_CAUSES[o.failureCause].label} (lỗi: ${FAULT_PARTY_LABELS[party]})` : '';
  });

  protected readonly canSubmit = computed(() => {
    if (this.busy()) return false;
    if (this.needsReason() && !this.reason()) return false;
    if (this.needsRefundChoice() && !this.refundChoice()) return false;
    return true;
  });

  constructor() {
    this.form.controls.reason.valueChanges.subscribe((v) => this.reason.set(v));
    effect(() => {
      if (this.open()) {
        this.opKey = crypto.randomUUID();
        // untracked: live updates of the order must not refresh the snapshot (EX-01).
        this.openedAt = untracked(() => this.order().updatedAt);
        this.error.set(null);
        this.busy.set(false);
        this.form.reset({ reason: '', note: '' });
      }
    });
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) {
      if (this.needsReason() && !this.reason()) this.error.set('Vui lòng chọn lý do hủy');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    await simulateLatency();

    const o = this.order();
    const reason = this.reason() as CancelReason;
    const note = this.form.controls.note.value;
    const choice = this.needsRefundChoice() ? (this.refundChoice() ?? undefined) : undefined;
    const opts = { opKey: this.opKey, expectedUpdatedAt: this.openedAt };
    const result =
      this.mode() === 'cod'
        ? this.service.cancelCodOrder(o.id, { reason, note }, opts)
        : this.mode() === 'request'
          ? this.service.requestCancel(o.id, { reason, note }, opts)
          : this.mode() === 'rejected'
            ? this.service.cancelRejectedOrder(o.id, choice, opts)
            : this.service.cancelAfterFailure(o.id, choice, opts);

    this.busy.set(false);
    if (result.error) {
      const conflict = ([MESSAGES.codConfirmed, MESSAGES.inProduction, MESSAGES.staleOrder, MESSAGES.cancelledByCustomer, MESSAGES.requestExists] as string[]).includes(result.error.message);
      if (conflict) {
        // EX-01 / EX-15: explain and close; the page already shows the fresh state.
        this.toast.show({ variant: 'warning', title: 'Không thể hủy đơn', message: result.error.message });
        this.closed.emit();
      } else {
        this.error.set(result.error.message);
      }
      return;
    }
    if (this.mode() === 'request') {
      this.toast.show({ variant: 'functional', title: 'Đã gửi yêu cầu hủy', message: `CSKH sẽ phản hồi trước ${this.slaText()}.` });
    } else {
      const pending = result.data.refunds.some((r) => r.status === 'Pending_Approval');
      this.toast.show({
        variant: 'functional',
        title: 'Hủy đơn thành công',
        message: pending ? 'Yêu cầu hoàn tiền đang chờ xác nhận.' : 'Đơn hàng đã được hủy.',
      });
    }
    this.closed.emit();
  }
}
