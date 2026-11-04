import { Order } from '../models/order-tracking.model';
import {
  canCustomerCancel,
  canReportIssue,
  failedDeliveryRefundSituation,
  isOrderOpen,
  lateVoucherValue,
  refundAmountFor,
  sameHolderName,
} from './order-rules';
import { canTransition } from './state-machine';
import { buildTimeline, matchesTab } from './timeline';

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
    shippingFee: 35_000,
    fastSurcharge: 0,
    zone: 'Z2',
    shippingTier: 'Standard',
    hasCustomItem: true,
    requiresModeration: false,
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
    refunds: [],
    tickets: [],
    vouchers: [],
    ...patch,
  };
}

describe('cancel rules (FR-OT-05)', () => {
  it('allows cancel within the hidden 30-minute window', () => {
    expect(canCustomerCancel(order(), new Date(2026, 10, 4, 10, 29))).toBe(true);
  });
  it('blocks cancel after 30 minutes while still Pending_Confirmation', () => {
    expect(canCustomerCancel(order(), new Date(2026, 10, 4, 10, 31))).toBe(false);
  });
  it('allows cancel at any time in Pending_Review', () => {
    expect(canCustomerCancel(order({ status: 'Pending_Review' }), new Date(2026, 10, 8))).toBe(true);
  });
  it('blocks cancel from In_Production', () => {
    expect(canCustomerCancel(order({ status: 'In_Production' }), new Date(2026, 10, 4, 10, 1))).toBe(false);
  });
});

describe('refund amounts (Table 3.4)', () => {
  it('S1 refunds goods plus shipping', () => {
    expect(refundAmountFor(order(), 'S1')).toEqual({ amount: 335_000, deductedFee: 0 });
  });
  it('S3b withholds two-way Standard shipping of the zone', () => {
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
  it('10% capped at 30.000 đ, plus the fast surcharge', () => {
    expect(lateVoucherValue(order({ goodsTotal: 500_000, shippingTier: 'Fast', fastSurcharge: 15_000 })))
      .toEqual({ late: 30_000, fastSurcharge: 15_000 });
  });
});

describe('state machine', () => {
  it('rejects jumping from Pending_Confirmation to Delivered', () => {
    expect(canTransition('Pending_Confirmation', 'Delivered')).toBe(false);
  });
  it('re-delivery goes back to Ready_for_Pickup, never straight to In_Transit', () => {
    expect(canTransition('Delivery_Failed', 'Ready_for_Pickup')).toBe(true);
    expect(canTransition('Delivery_Failed', 'In_Transit')).toBe(false);
  });
});

describe('timeline (Table 3.2)', () => {
  it('custom orders show 5 milestones, stock orders 4', () => {
    expect(buildTimeline(order()).steps.length).toBe(5);
    expect(buildTimeline(order({ hasCustomItem: false })).steps.length).toBe(4);
  });
  it('Pending_Review stays on "Xác nhận" with a moderation caption', () => {
    const t = buildTimeline(order({ status: 'Pending_Review' }));
    expect(t.steps[0].state).toBe('current');
    expect(t.caption).toBe('Thiết kế đang được kiểm duyệt');
  });
  it('exception statuses hide the bar', () => {
    expect(buildTimeline(order({ status: 'Delivery_Failed' })).visible).toBe(false);
  });
  it('"Cần xử lý" tab groups statuses that need customer action', () => {
    expect(matchesTab('Action_Required', 'action')).toBe(true);
    expect(matchesTab('Return_Requested', 'action')).toBe(true);
    expect(matchesTab('In_Transit', 'action')).toBe(false);
  });
});

describe('account holder check', () => {
  it('ignores accents and case', () => {
    expect(sameHolderName('NGUYEN VAN A', 'Nguyễn Văn A')).toBe(true);
    expect(sameHolderName('TRAN THI B', 'Nguyễn Văn A')).toBe(false);
  });
});
