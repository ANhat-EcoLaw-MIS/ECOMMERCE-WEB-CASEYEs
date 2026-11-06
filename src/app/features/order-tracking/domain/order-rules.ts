import { DELIVERY_CONFIG, FAILURE_CAUSES } from '../config/delivery-config';
import {
  CancelRequest,
  FaultParty,
  Order,
  RefundRequest,
  RefundSituation,
  RefundStatus,
} from '../models/order-tracking.model';
import { twoWayShippingCost } from './shipping-fee';

/**
 * Pure business rules used by both the customer UI (which button is enabled) and the
 * service (which re-checks them before writing). `now` is always passed in.
 */

const DAY = 86_400_000;

export function orderTotal(order: Order): number {
  return order.goodsTotal + order.shipping.fee;
}

export function isPrepaid(order: Order): boolean {
  return order.paymentStatus === 'Paid';
}

export function isMixed(order: Order): boolean {
  return order.hasCustomItem && order.items.some((i) => !i.isCustom);
}

/** COD change-of-mind window is still open (hidden rule, FR-OT-05). */
export function codWindowOpen(order: Order, now: Date): boolean {
  return !!order.confirmDueAt && now.getTime() <= new Date(order.confirmDueAt).getTime();
}

/**
 * "Đã xác nhận" (Table 3.2) without a new status: confirmedAt is set, or the COD window has
 * passed (the order confirms itself, no cancel job).
 */
export function isConfirmed(order: Order, now: Date): boolean {
  if (order.confirmedAt) return true;
  return order.paymentMethod === 'COD' && !!order.confirmDueAt && !codWindowOpen(order, now);
}

/** FR-OT-05 / EX-01: only COD orders, only inside the hidden window. */
export function canCancelCod(order: Order, now: Date): boolean {
  return order.paymentMethod === 'COD' && order.status === 'Pending_Confirmation' && codWindowOpen(order, now);
}

export function pendingCancelRequest(order: Order): CancelRequest | undefined {
  return order.cancelRequests.find((r) => r.status === 'Pending');
}

/** An order with a pending cancel request is held: no review, batch or packing (FR-OT-19). */
export function isOnHold(order: Order): boolean {
  return !!pendingCancelRequest(order);
}

/** FR-OT-19 / EX-15: prepaid orders before production can ask CSKH to cancel. */
export function canRequestCancel(order: Order): boolean {
  return (
    isPrepaid(order) &&
    (order.status === 'Pending_Review' || order.status === 'Pending_Confirmation') &&
    !isOnHold(order)
  );
}

export function faultParty(order: Order): FaultParty | undefined {
  if (order.faultOverride) return order.faultOverride;
  return order.failureCause ? FAILURE_CAUSES[order.failureCause].party : undefined;
}

export function hasOpenTicket(order: Order): boolean {
  return order.tickets.some((t) => t.open);
}

export function holdActive(order: Order, now: Date): boolean {
  const h = order.warehouseHold;
  if (!h || order.status !== 'Delivery_Failed') return false;
  return h.disputed || new Date(h.expiresAt).getTime() > now.getTime();
}

/** FR-OT-11 / UC-OT-04 pre-conditions. */
export function canReportIssue(order: Order, now: Date): boolean {
  if (hasOpenTicket(order)) return false;
  if (order.status === 'Delivery_Failed') return holdActive(order, now);
  if (order.status !== 'Delivered' && order.status !== 'Completed') return false;
  if (!order.deliveredAt) return false;
  return (
    now.getTime() <= new Date(order.deliveredAt).getTime() + DELIVERY_CONFIG.complaintWindowDays * DAY
  );
}

export function complaintWindowExpired(order: Order, now: Date): boolean {
  return (
    (order.status === 'Delivered' || order.status === 'Completed') &&
    !!order.deliveredAt &&
    !hasOpenTicket(order) &&
    !canReportIssue(order, now)
  );
}

/** UC-OT-05 pre-conditions for "Yêu cầu giao lại". */
export function canRequestRedelivery(order: Order, now: Date): boolean {
  if (!holdActive(order, now) || order.redeliveryUsed) return false;
  if (order.warehouseHold?.disputed) return false;
  return true;
}

/**
 * Which "Hủy & hoàn" option a failed delivery offers (Table 3.4):
 * 3a carrier/shop fault (any order), 3b customer fault + stock-only + prepaid.
 * Custom + customer fault (3c) offers no cancel button.
 */
export function failedDeliveryRefundSituation(order: Order): RefundSituation | null {
  const party = faultParty(order);
  if (!party) return null;
  if (party !== 'Customer') return 'S3a';
  if (!order.hasCustomItem && isPrepaid(order)) return 'S3b';
  if (order.hasCustomItem) return 'S3c';
  return null;
}

export function canCancelAfterFailure(order: Order, now: Date): boolean {
  if (!holdActive(order, now) || order.warehouseHold?.disputed) return false;
  const s = failedDeliveryRefundSituation(order);
  return s === 'S3a' || s === 'S3b';
}

export function canResubmitDesign(order: Order): boolean {
  return (
    order.status === 'Action_Required' &&
    order.designResubmitCount < DELIVERY_CONFIG.maxDesignResubmit
  );
}

/** Amount and withheld fee for a refund situation; null when nothing is refundable. */
export function refundAmountFor(
  order: Order,
  situation: RefundSituation,
): { amount: number; deductedFee: number } | null {
  if (!isPrepaid(order)) return null;
  switch (situation) {
    case 'S1':
    case 'S2':
    case 'S3a':
    case 'S4':
      return { amount: orderTotal(order), deductedFee: 0 };
    case 'S3b': {
      const fee = twoWayShippingCost(order);
      return { amount: Math.max(0, order.goodsTotal - fee), deductedFee: fee };
    }
    case 'S3c':
      return null;
  }
}

export const OPEN_REFUND_STATUSES: readonly RefundStatus[] = [
  'Pending_Approval',
  'Processing',
  'Refund_Pending_Retry',
  'Refund_Pending_Manual',
];

export function openRefund(order: Order): RefundRequest | undefined {
  return order.refunds.find((r) => OPEN_REFUND_STATUSES.includes(r.status));
}

/** Table 3.1: an order blocks account deletion until it is closed. */
export function isOrderOpen(order: Order): boolean {
  if (openRefund(order) || isOnHold(order)) return true;
  return !['Completed', 'Cancelled', 'Refunded'].includes(order.status);
}

/** Late-delivery guarantee (FR-OT-18, EX-14). */
export function lateVoucherValue(order: Order): { late: number; expressSurcharge: number } {
  const cfg = DELIVERY_CONFIG;
  const late = Math.min(Math.round((order.goodsTotal * cfg.lateVoucherPct) / 100), cfg.lateVoucherCap);
  return { late, expressSurcharge: order.shippingTier === 'Express' ? order.shipping.expressSurcharge : 0 };
}

/** Customer-facing refund label (FR-OT-13). */
export function refundStatusLabel(r: RefundRequest): string {
  if (r.status === 'Pending_Approval' && !r.refundMethod) return 'Chờ bạn cung cấp tài khoản';
  switch (r.status) {
    case 'Pending_Approval':
      return 'Đang duyệt';
    case 'Processing':
      return 'Đang hoàn';
    case 'Refunded':
      return r.refundMethod === 'Voucher' ? 'Đã hoàn bằng voucher' : 'Đã hoàn tiền';
    case 'Rejected':
      return 'Từ chối';
    case 'Refund_Pending_Retry':
    case 'Refund_Pending_Manual':
      return 'Đang xử lý';
  }
}

/** Accent-insensitive comparison for the account-holder check. */
export function sameHolderName(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  return norm(a) === norm(b);
}
