import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { CANCEL_REASON_LABELS } from '../../config/delivery-config';
import { TONE_CLASSES } from '../../config/status-style';
import { Order } from '../../models/order-tracking.model';
import { Clock } from '../../services/clock';
import { OrderTrackingService } from '../../services/order-tracking.service';
import { track } from '../../services/tracker';
import { BTN_SECONDARY, simulateLatency } from '../ui';

/**
 * "Yêu cầu hủy đơn" block above the progress bar (FR-OT-20):
 * Đã gửi yêu cầu → CSKH đang xem xét (respond before …) → Kết quả.
 * Rejected / withdrawn collapse into one line.
 */
@Component({
  selector: 'app-cancel-request-panel',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cancel-request-panel.html',
})
export class CancelRequestPanel {
  readonly order = input.required<Order>();

  private readonly service = inject(OrderTrackingService);
  private readonly clock = inject(Clock);
  private readonly toast = inject(NotificationManager);

  protected readonly btnSecondary = BTN_SECONDARY;
  protected readonly reasonLabels = CANCEL_REASON_LABELS;
  protected readonly box = `rounded-card border p-5 ${TONE_CLASSES.warning.box}`;
  protected readonly busy = signal(false);

  /** Latest request, if any. */
  protected readonly request = computed(() => this.order().cancelRequests.at(-1));
  protected readonly overdue = computed(() => {
    const r = this.request();
    return !!r && r.status === 'Pending' && this.clock.nowSignal().getTime() > new Date(r.slaDueAt).getTime();
  });

  protected async withdraw(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    await simulateLatency();
    const r = await this.service.withdrawCancelRequest(this.order().id, { opKey: crypto.randomUUID() });
    this.busy.set(false);
    if (!r.error) track('cancel_withdrawn', {}, this.order().orderCode);
    this.toast.show(
      r.error
        ? { variant: 'warning', title: 'Không rút lại được', message: r.error.message }
        : { variant: 'functional', title: 'Đã rút lại yêu cầu hủy', message: 'Đơn hàng tiếp tục được xử lý.' },
    );
  }
}
