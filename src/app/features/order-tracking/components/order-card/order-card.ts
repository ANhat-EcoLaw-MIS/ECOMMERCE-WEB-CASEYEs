import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { PhoneCaseMock } from '../../../../shared/ui/phone-case-mock/phone-case-mock';
import { needsAttention, primaryAction } from '../../domain/actions';
import { isMixed, orderTotal } from '../../domain/order-rules';
import { formatVnd } from '../../domain/shipping-fee';
import { captionFor, statusLabel } from '../../domain/timeline';
import { Order } from '../../models/order-tracking.model';
import { Clock } from '../../services/clock';
import { track } from '../../services/tracker';
import { HighlightText } from '../highlight-text/highlight-text';
import { StatusBadge } from '../status-badge/status-badge';
import { BTN_PRIMARY } from '../ui';

const MAX_ITEMS = 2;

/**
 * One order in "Đơn hàng của tôi" (P1-2): enough to recognise the order without opening it,
 * plus exactly one primary button that depends on the state.
 */
@Component({
  selector: 'app-order-card',
  imports: [RouterLink, DatePipe, StatusBadge, PhoneCaseMock, HighlightText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-card.html',
})
export class OrderCard {
  readonly order = input.required<Order>();
  /** Current search term, highlighted in the code and product names. */
  readonly query = input('');

  private readonly clock = inject(Clock);
  private readonly toast = inject(NotificationManager);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly formatVnd = formatVnd;
  protected readonly caption = computed(() => captionFor(this.order(), this.clock.nowSignal()));
  protected readonly label = computed(() => statusLabel(this.order(), this.clock.nowSignal()));
  protected readonly total = computed(() => formatVnd(orderTotal(this.order())));
  protected readonly mixed = computed(() => isMixed(this.order()));
  protected readonly attention = computed(() => needsAttention(this.order()));
  protected readonly action = computed(() => primaryAction(this.order()));
  protected readonly shownItems = computed(() => this.order().items.slice(0, MAX_ITEMS));
  protected readonly hiddenCount = computed(() => Math.max(0, this.order().items.length - MAX_ITEMS));

  protected onAction(): void {
    const a = this.action();
    if (a.reorder) track('reorder_clicked', { from: a.reorder }, this.order().orderCode);
  }

  protected async copyCode(): Promise<void> {
    const code = this.order().orderCode;
    try {
      await navigator.clipboard.writeText(code);
      this.toast.show({ variant: 'information', title: 'Đã sao chép', message: `Mã đơn ${code}`, duration: 2500 });
    } catch {
      this.toast.show({ variant: 'warning', title: 'Chưa sao chép được', message: `Bạn hãy chọn và sao chép mã ${code}.` });
    }
  }
}
