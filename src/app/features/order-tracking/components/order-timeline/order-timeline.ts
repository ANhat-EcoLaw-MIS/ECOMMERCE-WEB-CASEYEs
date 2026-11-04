import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { buildTimeline } from '../../domain/timeline';
import { Order } from '../../models/order-tracking.model';

/** 4/5-milestone progress bar (FR-OT-01, FR-OT-02). Hidden for exception statuses. */
@Component({
  selector: 'app-order-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-timeline.html',
})
export class OrderTimeline {
  readonly order = input.required<Order>();

  protected readonly view = computed(() => buildTimeline(this.order()));
  protected readonly progress = computed(() => {
    const steps = this.view().steps;
    const idx = steps.findIndex((s) => s.state === 'current');
    const last = steps.length - 1;
    if (steps.every((s) => s.state === 'done')) return 100;
    return idx <= 0 ? 0 : Math.round((idx / last) * 100);
  });
}
