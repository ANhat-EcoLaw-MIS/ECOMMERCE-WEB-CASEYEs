import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { TONE_CLASSES } from '../../config/status-style';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { CANCEL_REASON_LABELS, FAILURE_CAUSES, FAULT_PARTY_LABELS } from '../../config/delivery-config';
import { RefundChoice } from '../../domain/order-mutations';
import { failedDeliveryRefundSituation, faultParty, isPrepaid, refundAmountFor } from '../../domain/order-rules';
import { formatVnd } from '../../domain/shipping-fee';
import { CancelReason, Order, RefundSituation } from '../../models/order-tracking.model';
import { MESSAGES, OrderTrackingService } from '../../services/order-tracking.service';
import { OtModal } from '../ot-modal/ot-modal';
import { RefundChoiceForm } from '../refund-choice-form/refund-choice-form';
import { BTN_GHOST, BTN_PRIMARY, FIELD, LABEL, simulateLatency } from '../ui';

/** 'cancel' = UC-OT-02 main flow, 'rejected' = AF 1.2 (situation 2), 'failed' = UC-OT-05 (3a/3b). */
export type CancelMode = 'cancel' | 'rejected' | 'failed';

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
  readonly mode = input<CancelMode>('cancel');
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly service = inject(OrderTrackingService);
  private readonly toast = inject(NotificationManager);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly reasons = CANCEL_REASONS;
  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly field = FIELD;
  protected readonly label = LABEL;
  protected readonly errorBox = `rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES.danger.box}`;

  protected readonly form = this.fb.group({ reason: this.fb.control<CancelReason | ''>(''), note: '' });
  protected readonly refundChoice = signal<RefundChoice | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Snapshot when the pop-up opens (EX-01 optimistic check, EX-06 idempotency key). */
  private opKey = '';
  private openedAt = '';

  protected readonly title = computed(() =>
    this.mode() === 'cancel' ? 'Hủy đơn hàng' : 'Hủy đơn và nhận hoàn tiền',
  );

  protected readonly situation = computed<RefundSituation | null>(() => {
    switch (this.mode()) {
      case 'cancel':
        return 'S1';
      case 'rejected':
        return 'S2';
      case 'failed':
        return failedDeliveryRefundSituation(this.order());
    }
  });

  protected readonly refund = computed(() => {
    const s = this.situation();
    return s ? refundAmountFor(this.order(), s) : null;
  });

  protected readonly amountLabel = computed(() => (this.refund() ? formatVnd(this.refund()!.amount) : ''));
  protected readonly needsRefundChoice = computed(() => isPrepaid(this.order()) && !!this.refund() && this.refund()!.amount > 0);
  protected readonly faultText = computed(() => {
    const o = this.order();
    const party = faultParty(o);
    return o.failureCause && party ? `${FAILURE_CAUSES[o.failureCause].label} (lỗi: ${FAULT_PARTY_LABELS[party]})` : '';
  });
  protected readonly deductedLabel = computed(() => formatVnd(this.refund()?.deductedFee ?? 0));

  protected readonly canSubmit = computed(() => {
    if (this.busy()) return false;
    if (this.needsRefundChoice() && !this.refundChoice()) return false;
    return true;
  });

  constructor() {
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
    const reason = this.form.controls.reason.value;
    if (this.mode() === 'cancel' && !reason) {
      this.error.set('Vui lòng chọn lý do hủy');
      return;
    }
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.error.set(null);
    await simulateLatency();

    const choice = this.needsRefundChoice() ? (this.refundChoice() ?? undefined) : undefined;
    const opts = { opKey: this.opKey, expectedUpdatedAt: this.openedAt };
    const o = this.order();
    const result =
      this.mode() === 'cancel'
        ? this.service.cancelOrder(o.id, { reason: reason as CancelReason, note: this.form.controls.note.value, refund: choice }, opts)
        : this.mode() === 'rejected'
          ? this.service.cancelRejectedOrder(o.id, choice, opts)
          : this.service.cancelAfterFailure(o.id, choice, opts);

    this.busy.set(false);
    if (result.error) {
      const conflict = [MESSAGES.cancelConflict, MESSAGES.staleOrder, MESSAGES.cancelledByCustomer].includes(result.error.message as never);
      if (conflict) {
        this.toast.show({ variant: 'warning', title: 'Không thể hủy đơn', message: result.error.message });
        this.closed.emit();
      } else {
        this.error.set(result.error.message);
      }
      return;
    }
    const pending = result.data.refunds.some((r) => r.status === 'Pending_Approval');
    this.toast.show({
      variant: 'functional',
      title: 'Hủy đơn thành công',
      message: pending ? 'Yêu cầu hoàn tiền đang chờ xác nhận.' : 'Đơn hàng đã được hủy.',
    });
    this.closed.emit();
  }
}
