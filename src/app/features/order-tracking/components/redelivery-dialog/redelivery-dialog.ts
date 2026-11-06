import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { FAILURE_CAUSES, FAULT_PARTY_LABELS } from '../../config/delivery-config';
import { TONE_CLASSES } from '../../config/status-style';
import { faultParty } from '../../domain/order-rules';
import { formatVnd, redeliveryFee } from '../../domain/shipping-fee';
import { Order } from '../../models/order-tracking.model';
import { OrderTrackingService } from '../../services/order-tracking.service';
import { OtModal } from '../ot-modal/ot-modal';
import { BTN_GHOST, BTN_PRIMARY, simulateLatency } from '../ui';

/** UC-OT-05 main flow: confirm address, pay the re-delivery fee by QR (mock) when it is the customer's fault. */
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

  private readonly service = inject(OrderTrackingService);
  private readonly toast = inject(NotificationManager);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly errorBox = `rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES.danger.box}`;

  protected readonly addressConfirmed = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private opKey = '';

  protected readonly party = computed(() => faultParty(this.order()));
  protected readonly fee = computed(() => (this.party() === 'Customer' ? redeliveryFee(this.order()) : 0));
  protected readonly feeLabel = computed(() => formatVnd(this.fee()));
  protected readonly reason = computed(() => {
    const o = this.order();
    const p = this.party();
    return o.failureCause && p ? `${FAILURE_CAUSES[o.failureCause].label} – lỗi thuộc ${FAULT_PARTY_LABELS[p].toLowerCase()}` : '';
  });
  /** Decorative QR pattern for the mock transfer. */
  protected readonly qrCells = Array.from({ length: 81 }, (_, i) => (i * 7 + (i % 5) * 3) % 3 === 0);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.opKey = crypto.randomUUID();
        this.addressConfirmed.set(false);
        this.error.set(null);
      }
    });
  }

  protected async submit(): Promise<void> {
    if (!this.addressConfirmed() || this.busy()) return;
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
      message: `Đơn sẽ được giao lại, dự kiến ${result.data.earliestEDD.split('-').reverse().slice(0, 2).join('/')} – ${result.data.latestEDD.split('-').reverse().slice(0, 2).join('/')}.`,
    });
    this.closed.emit();
  }
}
