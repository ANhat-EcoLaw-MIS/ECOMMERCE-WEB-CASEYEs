import { Order } from '../models/order-tracking.model';

/**
 * Shipping amounts are owned by Thanh toán; this module only derives the two costs the
 * refund and re-delivery rules need from the snapshot stored in the order.
 */

/** Two-way carrier cost withheld in situation 3b (assumption A-04: 2 × Standard fee of the address). */
export function twoWayShippingCost(order: Order): number {
  return order.shipping.standardFee * 2;
}

/** Re-delivery fee paid by the customer when the failure was their fault. */
export function redeliveryFee(order: Order): number {
  return order.shipping.standardFee;
}

const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

/** Vietnamese currency format, e.g. "1.250.000 ₫". */
export function formatVnd(value: number): string {
  return VND.format(value);
}
