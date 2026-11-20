import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerOrderFeed } from '../../../../shared/services/customer-order-feed';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-orders-tab',
  imports: [RouterLink],
  templateUrl: './orders-tab.html',
})
export class OrdersTab {
  // Integration: real orders from Quản lý đơn hàng (was the static ORDERS mock).
  protected readonly orders = inject(CustomerOrderFeed).orders;
}
