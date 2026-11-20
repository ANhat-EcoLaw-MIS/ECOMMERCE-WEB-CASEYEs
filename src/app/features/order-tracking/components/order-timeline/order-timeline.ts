import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { StepState, buildTimeline } from '../../domain/timeline';
import { Order } from '../../models/order-tracking.model';
import { Clock } from '../../services/clock';

const DOT: Record<StepState, string> = {
  done: 'bg-brand-600 text-white',
  current: 'bg-surface-alt ring-2 ring-brand-800 shadow-glow',
  attention: 'bg-amber-500 text-white ring-4 ring-amber-100',
  upcoming: 'bg-surface-alt ring-1 ring-line',
};

const STATE_TEXT: Record<StepState, string> = {
  done: 'đã xong',
  current: 'đang ở bước này',
  attention: 'cần bạn xử lý',
  upcoming: 'chưa tới',
};

/** 5-step progress bar derived from the order status (FR-OT-01, 02); greyed out while a cancel request is pending. */
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

  protected dotClass(state: StepState): string {
    return DOT[state];
  }

  protected stateText(state: StepState): string {
    return STATE_TEXT[state];
  }
}
