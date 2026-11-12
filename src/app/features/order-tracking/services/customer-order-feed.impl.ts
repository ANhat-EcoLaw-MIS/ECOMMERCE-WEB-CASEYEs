import { Injectable, computed, inject } from '@angular/core';
import { CustomerOrderFeed, CustomerOrderSummary } from '../../../shared/services/customer-order-feed';
import { orderTotal } from '../domain/order-rules';
import { formatVnd } from '../domain/shipping-fee';
import { statusLabel } from '../domain/timeline';
import { Clock } from './clock';
import { OrderTrackingService } from './order-tracking.service';

/** CustomerOrderFeed for Tài khoản (Lịch sử mua hàng), built from the customer's orders. */
@Injectable({ providedIn: 'root' })
export class OrderTrackingCustomerFeed extends CustomerOrderFeed {
  private readonly service = inject(OrderTrackingService);
  private readonly clock = inject(Clock);

  readonly orders = computed<readonly CustomerOrderSummary[]>(() => {
    const now = this.clock.nowSignal();
    return this.service.myOrders().map((o) => {
      const products = o.items.filter((i) => i.baseSku !== 'GIFT-HOLOGRAM');
      const first = products[0] ?? o.items[0];
      const more = products.length > 1 ? ` và ${products.length - 1} sản phẩm khác` : '';
      return {
        code: o.orderCode,
        placedOn: new Date(o.createdAt).toLocaleDateString('vi-VN'),
        statusLabel: statusLabel(o, now),
        itemsLabel: `${first.quantity}x ${first.productName}${more}`,
        device: first.phoneModel,
        total: formatVnd(orderTotal(o)),
        previewUrl: first.design?.previewUrl ?? first.imageUrl,
        link: `/order-tracking/${o.orderCode}`,
      };
    });
  });
}
