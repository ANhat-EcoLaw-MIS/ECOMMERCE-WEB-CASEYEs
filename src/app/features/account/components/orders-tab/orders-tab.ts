import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ORDERS } from '../../models/account.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-orders-tab',
  templateUrl: './orders-tab.html',
})
export class OrdersTab {
  protected readonly orders = ORDERS;
  // TODO: load orders from the database when an account orders query is available.
}
