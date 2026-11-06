import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { buildTimeline } from '../../domain/timeline';
import { Order } from '../../models/order-tracking.model';
import { Clock } from '../../services/clock';

/** 4/5-milestone progress bar (FR-OT-01, FR-OT-02); greyed out while a cancel request is pending (FR-OT-20). */
@Component({
  selector: 'app-order-timeline',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-timeline.html',
})
export class OrderTimeline {
  readonly order = input.required<Order>();
  private readonly clock = inject(Clock);

  protected readonly view = computed(() => buildTimeline(this.order(), this.clock.nowSignal()));

}
