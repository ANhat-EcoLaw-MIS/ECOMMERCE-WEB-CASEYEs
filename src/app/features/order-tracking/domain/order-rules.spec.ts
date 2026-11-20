import { Order } from '../models/order-tracking.model';
import {
  canCancelCod,
  canRequestCancel,
  isConfirmed,
  canReportIssue,
  failedDeliveryRefundSituation,
  isOrderOpen,
  lateVoucherValue,
  refundAmountFor,
  sameHolderName,
} from './order-rules';
import { canTransition } from './state-machine';
import { buildTimeline, matchesTab, statusLabel } from './timeline';

const NOW = new Date(2026, 10, 4, 12, 0);

function order(patch: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderCode: 'CC-TEST',
    customerId: 'c1',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0900000000',
    customerEmail: 'a@example.com',
    payerName: 'Nguyễn Văn A',
    shippingAddress: 'HCM',
    status: 'Pending_Confirmation',
    paymentMethod: 'QR_Transfer',
    paymentStatus: 'Paid',
    goodsTotal: 300_000,
    shipping: { fee: 35_000, standardFee: 35_000, expressSurcharge: 0, transitDays: { min: 2, max: 3 } },
    shippingTier: 'Standard',
    hasCustomItem: true,
    hasUploadedImage: false,
    earliestEDD: '2026-11-07',
    latestEDD: '2026-11-11',
    batchDate: '2026-11-04',
    policyVersion: 'v1',
    policyAcceptedAt: '2026-11-04T03:00:00.000Z',
    createdAt: new Date(2026, 10, 4, 10, 0).toISOString(),
    updatedAt: new Date(2026, 10, 4, 10, 0).toISOString(),
    designResubmitCount: 0,
    autoCompleteFrozenOnce: false,
    reviewInvitePending: false,
    redeliveryUsed: false,
    qcReprintCount: 0,
    lateVoucherIssued: false,
    items: [
      { id: 'i1', productName: 'Ốp', phoneModel: 'iPhone 15', baseSku: 'B-IP15', isCustom: true, quantity: 1, unitPrice: 300_000 },
    ],
    logs: [],
    moderationReviews: [],
    cancelRequests: [],
    refunds: [],
    tickets: [],
    vouchers: [],
    ...patch,
  };
}

describe('cancel rules v8 (FR-OT-05, FR-OT-19)', () => {
  const placed = new Date(2026, 10, 4, 10, 0);
  const cod = (patch: Partial<Order> = {}) =>
    order({
      paymentMethod: 'COD',
      paymentStatus: 'Unpaid',
      hasCustomItem: false,
      confirmDueAt: new Date(placed.getTime() + 30 * 60_000).toISOString(),
      ...patch,
    });

  it('COD can cancel inside the hidden window, then confirms itself', () => {
    expect(canCancelCod(cod(), new Date(2026, 10, 4, 10, 29))).toBe(true);
    expect(isConfirmed(cod(), new Date(2026, 10, 4, 10, 29))).toBe(false);
    expect(canCancelCod(cod(), new Date(2026, 10, 4, 10, 31))).toBe(false);
    expect(isConfirmed(cod(), new Date(2026, 10, 4, 10, 31))).toBe(true);
  });
  it('prepaid orders never cancel directly', () => {
    expect(canCancelCod(order({ status: 'Pending_Review' }), new Date(2026, 10, 4, 10, 1))).toBe(false);
  });
  it('prepaid orders can request cancel before production, once', () => {
    expect(canRequestCancel(order({ status: 'Pending_Review' }))).toBe(true);
    expect(canRequestCancel(order({ status: 'Pending_Confirmation' }))).toBe(true);
    expect(canRequestCancel(order({ status: 'In_Production' }))).toBe(false);
    const pending = { id: 'cr', reason: 'Other' as const, status: 'Pending' as const, slaDueAt: '', createdAt: '' };
    expect(canRequestCancel(order({ status: 'Pending_Review', cancelRequests: [pending] }))).toBe(false);
  });
  it('COD orders cannot use the cancel request', () => {
    expect(canRequestCancel(cod())).toBe(false);
  });
});

describe('refund amounts (Table 3.4)', () => {
  it('S1 refunds goods plus shipping', () => {
    expect(refundAmountFor(order(), 'S1')).toEqual({ amount: 335_000, deductedFee: 0 });
  });
  it('S3b withholds two-way Standard shipping of the address', () => {
    expect(refundAmountFor(order({ hasCustomItem: false }), 'S3b')).toEqual({ amount: 230_000, deductedFee: 70_000 });
  });
  it('S3c refunds nothing', () => {
    expect(refundAmountFor(order(), 'S3c')).toBeNull();
  });
  it('COD orders have nothing to refund', () => {
    expect(refundAmountFor(order({ paymentMethod: 'COD', paymentStatus: 'Unpaid' }), 'S3a')).toBeNull();
  });
});

describe('failed delivery situation (Table 3.3)', () => {
  it('carrier fault -> 3a even for Custom', () => {
    expect(failedDeliveryRefundSituation(order({ failureCause: 'Lost_In_Transit' }))).toBe('S3a');
  });
  it('customer fault + stock + prepaid -> 3b', () => {
    expect(failedDeliveryRefundSituation(order({ hasCustomItem: false, failureCause: 'Customer_Refused' }))).toBe('S3b');
  });
  it('customer fault + Custom -> 3c', () => {
    expect(failedDeliveryRefundSituation(order({ failureCause: 'Customer_Unreachable' }))).toBe('S3c');
  });
});

describe('complaint window (FR-OT-11)', () => {
  const deliveredAt = new Date(2026, 10, 10, 9).toISOString();
  it('open within 7 days of delivery, also when Completed', () => {
    expect(canReportIssue(order({ status: 'Completed', deliveredAt }), new Date(2026, 10, 16, 9))).toBe(true);
  });
  it('closed after 7 days', () => {
    expect(canReportIssue(order({ status: 'Delivered', deliveredAt }), new Date(2026, 10, 17, 10))).toBe(false);
  });
});

describe('open orders (Table 3.1)', () => {
  it('a pending cancel request keeps the order open', () => {
    const pending = { id: 'cr', reason: 'Other' as const, status: 'Pending' as const, slaDueAt: '', createdAt: '' };
    expect(isOrderOpen(order({ status: 'Cancelled', cancelRequests: [pending] }))).toBe(true);
  });
  it('Cancelled with a pending refund is still open', () => {
    const refund = {
      id: 'r', situation: 'S1' as const, amount: 1, deductedFee: 0, status: 'Pending_Approval' as const,
      transferAttempts: 0, createdAt: '',
    };
    expect(isOrderOpen(order({ status: 'Cancelled', refunds: [refund] }))).toBe(true);
    expect(isOrderOpen(order({ status: 'Cancelled' }))).toBe(false);
  });
});

describe('late voucher (FR-OT-18)', () => {
  it('10% capped at 30.000 đ, plus the Hỏa tốc surcharge', () => {
    const shipping = { fee: 45_000, standardFee: 25_000, expressSurcharge: 20_000, transitDays: { min: 1, max: 2 } };
    expect(lateVoucherValue(order({ goodsTotal: 500_000, shippingTier: 'Express', shipping })))
      .toEqual({ late: 30_000, expressSurcharge: 20_000 });
  });
});

describe('state machine', () => {
  it('rejects jumping from Pending_Confirmation to Delivered', () => {
    expect(canTransition('Pending_Confirmation', 'Delivered')).toBe(false);
  });
  it('design approval returns to Pending_Confirmation, never straight to In_Production', () => {
    expect(canTransition('Pending_Review', 'Pending_Confirmation')).toBe(true);
    expect(canTransition('Pending_Review', 'In_Production')).toBe(false);
  });
  it('re-delivery goes back to Ready_for_Pickup, never straight to In_Transit', () => {
    expect(canTransition('Delivery_Failed', 'Ready_for_Pickup')).toBe(true);
    expect(canTransition('Delivery_Failed', 'In_Transit')).toBe(false);
  });
});

describe('timeline (linked to the status)', () => {
  const step = (o: ReturnType<typeof order>, key: string) => buildTimeline(o, NOW).steps.find((s) => s.key === key)!;

  it('custom orders: placed → design review → production → shipping → delivered', () => {
    expect(buildTimeline(order(), NOW).steps.map((s) => s.key)).toEqual(['placed', 'review', 'production', 'shipping', 'delivered']);
    expect(buildTimeline(order({ hasCustomItem: false }), NOW).steps.map((s) => s.key)).toEqual(['placed', 'confirm', 'production', 'shipping', 'delivered']);
  });
  it('Pending_Review: design review is the current step', () => {
    const o = order({ status: 'Pending_Review' });
    expect(step(o, 'placed').state).toBe('done');
    expect(step(o, 'review').state).toBe('current');
    expect(statusLabel(o, NOW)).toBe('Đang duyệt thiết kế');
  });
  it('"Đã xác nhận" never sits on the confirmation step', () => {
    const o = order({ confirmedAt: NOW.toISOString() });
    expect(statusLabel(o, NOW)).toBe('Đã xác nhận');
    expect(step(o, 'review').state).toBe('done');
    expect(step(o, 'production').state).toBe('current');
    const cod = order({ hasCustomItem: false, paymentMethod: 'COD', confirmDueAt: new Date(NOW.getTime() + 60_000).toISOString() });
    expect(statusLabel(cod, NOW)).toBe('Chờ xác nhận');
    expect(step(cod, 'confirm').state).toBe('current');
  });
  it('caption never names the internal batch', () => {
    expect(buildTimeline(order({ confirmedAt: NOW.toISOString() }), NOW).caption).not.toMatch(/mẻ/);
  });
  it('a pending cancel request dims the bar', () => {
    const pending = { id: 'cr', reason: 'Other' as const, status: 'Pending' as const, slaDueAt: '', createdAt: '' };
    const t = buildTimeline(order({ status: 'Pending_Review', cancelRequests: [pending] }), NOW);
    expect(t.dimmed).toBe(true);
    expect(t.caption).toContain('yêu cầu hủy');
  });
  it('failed delivery marks the shipping step; cancelled orders hide the bar', () => {
    expect(step(order({ status: 'Delivery_Failed' }), 'shipping').state).toBe('attention');
    expect(buildTimeline(order({ status: 'Cancelled' }), NOW).visible).toBe(false);
  });
  it('tabs: "Cần xử lý" needs the customer, "Đang xử lý" is the shop working', () => {
    expect(matchesTab('Action_Required', 'action')).toBe(true);
    expect(matchesTab('Return_Requested', 'action')).toBe(true);
    expect(matchesTab('In_Transit', 'action')).toBe(false);
    expect(matchesTab('Pending_Review', 'processing')).toBe(true);
    expect(matchesTab('Ready_for_Pickup', 'processing')).toBe(true);
  });
});

describe('account holder check', () => {
  it('ignores accents and case', () => {
    expect(sameHolderName('NGUYEN VAN A', 'Nguyễn Văn A')).toBe(true);
    expect(sameHolderName('TRAN THI B', 'Nguyễn Văn A')).toBe(false);
  });
});
