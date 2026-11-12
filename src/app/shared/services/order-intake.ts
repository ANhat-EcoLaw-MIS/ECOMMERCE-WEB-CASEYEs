import { Result } from '../../core/supabase/supabase.types';
import { OrderHandoff } from '../models/order-handoff.model';

/** Checkout may leave the customer out: Quản lý đơn hàng fills it from the signed-in user. */
export type OrderIntakeRequest = Omit<OrderHandoff, 'customer'> & { readonly customer?: OrderHandoff['customer'] };

/**
 * Port Thanh toán calls to create an order, so Checkout never imports the Order Tracking feature.
 * Implemented by OrderTrackingService and bound in app.config.ts.
 */
export abstract class OrderIntake {
  abstract placeOrder(request: OrderIntakeRequest): Result<{ readonly orderCode: string }>;
}
