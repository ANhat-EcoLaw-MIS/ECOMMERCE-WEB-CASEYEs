import { Injectable, computed, inject } from '@angular/core';
import { CustomerOrderFeed, CustomerOrderSummary } from '../../../shared/services/customer-order-feed';
import { orderTotal } from '../domain/order-rules';
import { formatVnd } from '../domain/shipping-fee';
import { statusLabel } from '../domain/timeline';
import { Clock } from './clock';
import { OrderTrackingService } from './order-tracking.service';

const LOYALTY_VND_PER_POINT = 1000;

/** CustomerOrderFeed for Tài khoản (Lịch sử mua hàng), built from the customer's orders. */
@Injectable({ providedIn: 'root' })
export class OrderTrackingCustomerFeed extends CustomerOrderFeed {
  private readonly service = inject(OrderTrackingService);
  private readonly clock = inject(Clock);

  /** Mock Loyalty rule (external system): 1 point per 1.000 ₫ of completed orders. */
  readonly loyaltyPoints = computed(() =>
    this.service
      .myOrders()
      .filter((o) => o.status === 'Completed')
      .reduce((sum, o) => sum + Math.floor(orderTotal(o) / LOYALTY_VND_PER_POINT), 0),
  );

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
