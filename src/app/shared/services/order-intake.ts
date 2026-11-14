import { Result } from '../../core/supabase/supabase.types';
import { OrderHandoff } from '../models/order-handoff.model';

/** Checkout may leave the customer out: Quản lý đơn hàng fills it from the signed-in user. */
export type OrderIntakeRequest = Omit<OrderHandoff, 'customer'> & {
  readonly customer?: OrderHandoff['customer'];
  /** Mock payment channel picked at checkout (vietqr / e_wallet / card / cod). */
  readonly paymentChannel?: string;
  /** Recipient entered at checkout; shown as the delivery contact on the order. */
  readonly recipient?: { readonly name: string; readonly phone: string };
};

/**
 * Port Thanh toán calls to create an order, so Checkout never imports the Order Tracking feature.
 * Implemented by OrderTrackingService and bound in app.config.ts.
 */
export abstract class OrderIntake {
  /** Signed-in customers: an async call to Supabase place_order; demo customer: local mock. */
  abstract placeOrder(request: OrderIntakeRequest): Result<{ readonly orderCode: string }> | Promise<Result<{ readonly orderCode: string }>>;
}
