import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { FAILURE_CAUSES, FAULT_PARTY_LABELS } from '../../config/delivery-config';
import { TONE_CLASSES } from '../../config/status-style';
import { formatDayLabel, formatFullDate } from '../../domain/calendar';
import { canCancelAfterFailure, faultParty } from '../../domain/order-rules';
import { formatVnd, redeliveryFee } from '../../domain/shipping-fee';
import { Order } from '../../models/order-tracking.model';
import { Clock } from '../../services/clock';
import { OrderTrackingService } from '../../services/order-tracking.service';
import { OtModal } from '../ot-modal/ot-modal';
import { BTN_GHOST, BTN_PRIMARY, simulateLatency } from '../ui';

type Step = 'address' | 'fee' | 'confirm';

/**
 * UC-OT-05 / P1-14 in three clear steps: confirm address → pay the fee if it was the
 * customer's fault (QR mock) → confirm. "Hủy & hoàn tiền" is offered when the policy allows.
 */
@Component({
  selector: 'app-redelivery-dialog',
  imports: [OtModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './redelivery-dialog.html',
})
export class RedeliveryDialog {
  readonly order = input.required<Order>();
  readonly open = input(false);
  readonly closed = output<void>();
  /** The customer prefers to cancel and get a refund (opens the cancel dialog). */
  readonly cancelInstead = output<void>();

  private readonly service = inject(OrderTrackingService);
  private readonly clock = inject(Clock);
  private readonly toast = inject(NotificationManager);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly errorBox = `rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES.danger.box}`;

  protected readonly step = signal<Step>('address');
  protected readonly addressConfirmed = signal(false);
  protected readonly paid = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private opKey = '';

  protected readonly party = computed(() => faultParty(this.order()));
  protected readonly fee = computed(() => (this.party() === 'Customer' ? redeliveryFee(this.order()) : 0));
  protected readonly feeLabel = computed(() => formatVnd(this.fee()));
  protected readonly steps = computed<{ key: Step; label: string }[]>(() => [
    { key: 'address', label: 'Xác nhận địa chỉ' },
    ...(this.fee() > 0 ? [{ key: 'fee' as Step, label: 'Trả cước giao lại' }] : []),
    { key: 'confirm', label: 'Xác nhận' },
  ]);
  protected readonly stepIndex = computed(() => this.steps().findIndex((s) => s.key === this.step()));
  protected readonly holdUntil = computed(() => {
    const h = this.order().warehouseHold;
    return h ? formatFullDate(h.expiresAt) : '';
  });
  protected readonly whoPays = computed(() => {
    const o = this.order();
    const p = this.party();
    if (!o.failureCause || !p) return '';
    const cause = FAILURE_CAUSES[o.failureCause].label;
    return p === 'Customer'
      ? `Bạn trả cước giao lại vì nguyên nhân thuộc về người nhận (${cause}).`
      : `Giao lại miễn phí vì lỗi thuộc ${FAULT_PARTY_LABELS[p].toLowerCase()} (${cause}).`;
  });
  protected readonly canCancel = computed(() => canCancelAfterFailure(this.order(), this.clock.nowSignal()));
  /** Decorative QR pattern for the mock transfer. */
  protected readonly qrCells = Array.from({ length: 81 }, (_, i) => (i * 7 + (i % 5) * 3) % 3 === 0);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.opKey = crypto.randomUUID();
        this.step.set('address');
        this.addressConfirmed.set(false);
        this.paid.set(false);
        this.error.set(null);
      }
    });
  }

  protected next(): void {
    const list = this.steps();
    const i = this.stepIndex();
    if (i < list.length - 1) this.step.set(list[i + 1].key);
  }

  protected back(): void {
    const i = this.stepIndex();
    if (i > 0) this.step.set(this.steps()[i - 1].key);
  }

  protected chooseCancel(): void {
    this.closed.emit();
    this.cancelInstead.emit();
  }

  protected async submit(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    await simulateLatency();
    const result = this.service.requestRedelivery(this.order().id, { opKey: this.opKey });
    this.busy.set(false);
    if (result.error) {
      this.error.set(result.error.message);
      return;
    }
    this.toast.show({
      variant: 'functional',
      title: 'Đã yêu cầu giao lại',
      message: `Dự kiến giao ${formatDayLabel(result.data.earliestEDD)} – ${formatDayLabel(result.data.latestEDD)}.`,
    });
    this.closed.emit();
  }
}
