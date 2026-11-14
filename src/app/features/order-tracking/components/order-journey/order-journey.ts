import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { JourneyTone, buildJourney } from '../../domain/timeline';
import { Order } from '../../models/order-tracking.model';
import { Clock } from '../../services/clock';

const TONE_DOT: Record<JourneyTone, string> = {
  brand: 'bg-brand-600',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  muted: 'bg-ink-soft/50',
};

const COLLAPSED = 4;

/**
 * "Hành trình đơn hàng": the order history and the carrier's scans in one list (replaces the old
 * raw status log). While the parcel is on the way, a small route shows where it is.
 */
@Component({
  selector: 'app-order-journey',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-journey.html',
})
export class OrderJourney {
  readonly order = input.required<Order>();
  private readonly clock = inject(Clock);

  protected readonly events = computed(() => buildJourney(this.order(), this.clock.nowSignal()));
  protected readonly expanded = signal(false);
  protected readonly visible = computed(() => (this.expanded() ? this.events() : this.events().slice(0, COLLAPSED)));
  protected readonly hiddenCount = computed(() => Math.max(0, this.events().length - COLLAPSED));

  /** Route for the parcel while it is with the carrier: 0 picked up … 3 delivered. */
  protected readonly route = computed(() => {
    const o = this.order();
    if (!o.shipment || !['In_Transit', 'Delivered'].includes(o.status)) return null;
    const scans = this.events().filter((e) => e.fromCarrier);
    const attemptStart = o.shipment.attempts.at(-1)?.startedAt ?? '';
    const current = scans.filter((e) => e.at >= attemptStart).length; // 1..3
    const reached = o.status === 'Delivered' ? 3 : Math.min(2, Math.max(0, current - 1));
    const city = o.shippingAddress.split(',').at(-1)?.trim() ?? '';
    return {
      carrier: o.shipment.carrier,
      code: o.shipment.trackingCode,
      reached,
      stops: ['Kho CasEYE’s', `Kho ${city}`, 'Đang giao', 'Bạn'],
    };
  });

  protected dot(tone: JourneyTone): string {
    return TONE_DOT[tone];
  }

  protected async copy(code: string): Promise<void> {
    await navigator.clipboard?.writeText(code).catch(() => undefined);
  }
}
