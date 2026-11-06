import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STATUS_META, TONE_CLASSES } from '../../config/status-style';
import { OrderStatus } from '../../models/order-tracking.model';

/** Status chip: colour + dot + text, so it still reads in greyscale (v8 UI rule). */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold" [class]="classes()">
      <span aria-hidden="true" class="size-1.5 rounded-full" [class]="dot()"></span>
      {{ text() }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<OrderStatus>();
  /** Customer label from statusLabel(order, now); falls back to the static label. */
  readonly label = input<string>();

  protected readonly text = computed(() => this.label() ?? STATUS_META[this.status()].label);
  protected readonly classes = computed(() => TONE_CLASSES[STATUS_META[this.status()].tone].badge);
  protected readonly dot = computed(() => TONE_CLASSES[STATUS_META[this.status()].tone].dot);
}
