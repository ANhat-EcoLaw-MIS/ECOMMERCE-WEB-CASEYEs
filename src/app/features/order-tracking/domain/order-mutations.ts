import { DELIVERY_CONFIG } from '../config/delivery-config';
import {
  ActorType,
  CancelCause,
  CancelReason,
  Order,
  OrderStatus,
  RefundRequest,
  RefundSituation,
  Voucher,
  VoucherKind,
} from '../models/order-tracking.model';
import { addDaysIso } from './calendar';
import { failedDeliveryRefundSituation, faultParty, refundAmountFor } from './order-rules';
import { SEQUENCE_ERROR, canTransition } from './state-machine';

/** A rule violation shown to the user as-is. */
export class BusinessError extends Error {}

export interface Actor {
  readonly type: ActorType;
  readonly id: string;
}

export const SYSTEM: Actor = { type: 'System', id: 'scheduler' };
export const CARRIER: Actor = { type: 'Carrier', id: 'mock-3pl' };

export type RefundChoice =
  | { readonly method: 'Bank'; readonly bank: string; readonly accountNo: string; readonly holder: string }
  | { readonly method: 'Voucher' }
  | { readonly method: 'Later' };

function rid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function withLog(
  o: Order,
  from: OrderStatus | null,
  to: OrderStatus,
  actor: Actor,
  reason: string,
  nowIso: string,
): Order {
  return {
    ...o,
    logs: [
      ...o.logs,
      { id: rid('log'), from, to, actorType: actor.type, actorId: actor.id, reason, createdAt: nowIso },
    ],
  };
}

/** Validated status change + audit log (prompt §2: no jumps). */
export function withTransition(o: Order, to: OrderStatus, actor: Actor, reason: string, nowIso: string): Order {
  if (!canTransition(o.status, to)) throw new BusinessError(SEQUENCE_ERROR);
  return withLog({ ...o, status: to }, o.status, to, actor, reason, nowIso);
}

export function applyRefundChoice(r: RefundRequest, choice: RefundChoice | undefined): RefundRequest {
  if (!choice || choice.method === 'Later') return r;
  if (choice.method === 'Voucher') {
    return { ...r, refundMethod: 'Voucher', refundBank: undefined, refundAccountNo: undefined, refundAccountHolder: undefined };
  }
  return {
    ...r,
    refundMethod: 'Bank',
    refundBank: choice.bank.trim(),
    refundAccountNo: choice.accountNo.trim(),
    refundAccountHolder: choice.holder.trim().toUpperCase(),
  };
}

/** Creates a RefundRequest in Pending_Approval when the situation refunds anything (FR-OT-13). */
export function withRefund(
  o: Order,
  situation: RefundSituation,
  choice: RefundChoice | undefined,
  nowIso: string,
): { order: Order; refund: RefundRequest | null } {
  const amount = refundAmountFor(o, situation);
  if (!amount || amount.amount <= 0) return { order: o, refund: null };
  const refund = applyRefundChoice(
    {
      id: rid('rf'),
      situation,
      amount: amount.amount,
      deductedFee: amount.deductedFee,
      status: 'Pending_Approval',
      transferAttempts: 0,
      createdAt: nowIso,
    },
    choice,
  );
  return { order: { ...o, refunds: [...o.refunds, refund] }, refund };
}

const VOUCHER_PREFIX: Record<VoucherKind, string> = {
  Late_Delivery: 'TRE',
  Fast_Surcharge: 'NHANH',
  Store_Credit: 'HOAN',
  Complaint_Compensation: 'DENBU',
};

export function withVoucher(
  o: Order,
  kind: VoucherKind,
  value: number,
  nowIso: string,
): { order: Order; voucher: Voucher } {
  const voucher: Voucher = {
    code: `${VOUCHER_PREFIX[kind]}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    kind,
    value,
    expiresAt: addDaysIso(nowIso, DELIVERY_CONFIG.voucherValidDays),
    createdAt: nowIso,
  };
  return { order: { ...o, vouchers: [...o.vouchers, voucher] }, voucher };
}

export function withCancellation(
  o: Order,
  actor: Actor,
  cause: CancelCause,
  customerFault: boolean,
  reasonText: string,
  nowIso: string,
  extra: { reason?: CancelReason; note?: string } = {},
): Order {
  const cancelled = withTransition(o, 'Cancelled', actor, reasonText, nowIso);
  return {
    ...cancelled,
    cancellation: { reason: extra.reason, note: extra.note, cause, customerFault, createdAt: nowIso },
  };
}

/**
 * Closes a failed delivery (second failure, or warehouse hold expired): Cancelled, refund per
 * Table 3.4 (3a/3b; 3c refunds nothing), destruction record for Custom goods.
 */
export function finalizeFailedDelivery(
  o: Order,
  actor: Actor,
  reasonText: string,
  expired: boolean,
  nowIso: string,
): { order: Order; customerFault: boolean; cause: CancelCause; refund: RefundRequest | null } {
  const party = faultParty(o);
  const customerFault = party === 'Customer';
  const cause: CancelCause = expired
    ? 'Warehouse_Hold_Expired'
    : customerFault
      ? 'Delivery_Failed_Customer'
      : 'Delivery_Failed_Carrier_Or_Shop';
  let next = withCancellation(o, actor, cause, customerFault, reasonText, nowIso);
  if (o.hasCustomItem) {
    next = { ...next, destruction: { createdAt: nowIso, note: 'Tiêu hủy hàng Custom có biên bản (bảo mật dữ liệu khách)' } };
  }
  const situation = failedDeliveryRefundSituation(o);
  let refund: RefundRequest | null = null;
  if (situation && situation !== 'S3c') {
    const r = withRefund(next, situation, undefined, nowIso);
    next = r.order;
    refund = r.refund;
  }
  return { order: next, customerFault, cause, refund };
}
