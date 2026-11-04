import { OrderStatus } from '../models/order-tracking.model';

/**
 * Allowed status transitions (prompt §2, BPMN SP1–SP10). Anything not listed is a
 * "jump" and must be rejected by the service.
 * Assumption A-02: Completed -> Return_Requested (complaint after completion) and
 * Return_Requested -> Completed (back to previousStatus) are added because FR-OT-EX-04
 * allows reporting issues on completed orders.
 */
export const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  Pending_Confirmation: ['Pending_Review', 'In_Production', 'Ready_for_Pickup', 'Cancelled'],
  Pending_Review: ['In_Production', 'Action_Required', 'Cancelled'],
  Action_Required: ['Pending_Review', 'Cancelled'],
  In_Production: ['Ready_for_Pickup'],
  Ready_for_Pickup: ['In_Transit'],
  In_Transit: ['Delivered', 'Delivery_Failed'],
  Delivered: ['Completed', 'Return_Requested'],
  Completed: ['Return_Requested'],
  Delivery_Failed: ['Ready_for_Pickup', 'Cancelled'],
  Return_Requested: ['In_Production', 'Ready_for_Pickup', 'Delivered', 'Completed', 'Refunded'],
  Cancelled: [],
  Refunded: [],
};

export const SEQUENCE_ERROR = 'Thao tác vi phạm luồng tuần tự của trạng thái đơn hàng';

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Terminal statuses never change again. */
export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
