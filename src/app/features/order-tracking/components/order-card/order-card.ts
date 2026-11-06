import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PhoneCaseMock } from '../../../../shared/ui/phone-case-mock/phone-case-mock';
import { captionFor, statusLabel } from '../../domain/timeline';
import { Clock } from '../../services/clock';
import { isMixed, orderTotal } from '../../domain/order-rules';
import { formatVnd } from '../../domain/shipping-fee';
import { Order } from '../../models/order-tracking.model';
import { StatusBadge } from '../status-badge/status-badge';

/** One order in "Đơn hàng của tôi" (Shopee-style card kept from the draft). */
@Component({
  selector: 'app-order-card',
  imports: [RouterLink, DatePipe, StatusBadge, PhoneCaseMock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-card.html',
})
export class OrderCard {
  readonly order = input.required<Order>();
  /** true when the customer has something to do (tab "Cần xử lý"). */
  readonly needsAction = input(false);

  private readonly clock = inject(Clock);
  protected readonly caption = computed(() => captionFor(this.order(), this.clock.nowSignal()));
  protected readonly label = computed(() => statusLabel(this.order(), this.clock.nowSignal()));
  protected readonly total = computed(() => formatVnd(orderTotal(this.order())));
  protected readonly mixed = computed(() => isMixed(this.order()));
  protected readonly formatVnd = formatVnd;
}
