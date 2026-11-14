import { CancelReason, FailureCause, FaultParty, ShippingTier } from '../models/order-tracking.model';

/** Day range in working days (processing) or shipping days (Mon–Sat). */
export interface DayRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Single source of every Order Management parameter (DeliveryConfig, v8 §3.6).
 * Shipping fees, delivery areas and free-shipping rules belong to Thanh toán and are NOT here:
 * they arrive with each order through OrderHandoff.shipping.
 */
export const DELIVERY_CONFIG = {
  /** Hidden "change of mind" window for COD orders (never shown to customers). */
  codRegretMinutes: 30,
  moderationSlaHours: 24,
  workHours: { from: '08:00', to: '17:00' },
  /** Daily order cut-off for custom designs on working days (Mon–Fri). */
  batchCutoff: { hour: 16, minute: 0 },
  /** Hỏa tốc confirmed before this time ships the same working day. */
  expressCutoff: { hour: 14, minute: 0 },
  handlingDays: {
    stock: { min: 1, max: 2 },
    custom: { min: 2, max: 3 },
  } satisfies Record<'stock' | 'custom', DayRange>,
  /** Re-pack before a re-delivery or a free re-send (assumption A-07). */
  redeliveryHandlingDays: { min: 1, max: 1 } satisfies DayRange,
  qcReprintExtraWorkingDays: 1,
  /** Packed parcels are handed to the carrier within this many working days (assumption, 15/11). */
  pickupSlaWorkingDays: 1,
  /** Customer service answers a cancel request within this many working days. */
  cancelRequestSlaDays: 1,
  lateVoucherPct: 10,
  lateVoucherCap: 30_000,
  voucherValidDays: 30,
  refundAccountDeadlineDays: 7,
  reminderDay: 3,
  autoCompleteHours: 72,
  complaintWindowDays: 7,
  warehouseHoldDays: 14,
  designFixDeadlineDays: 7,
  maxDesignResubmit: 2,
  maxRefundTransferAttempts: 2,
  /** Public holidays (YYYY-MM-DD) skipped by working-day counting. Empty until the team agrees. */
  holidays: [] as readonly string[],
  carrierName: 'Giao Hàng Nhanh',
  /** Shown at the "Đang chuyển khoản" step; to be confirmed by the team (open point 1). */
  refundEtaText: 'Tiền thường về tài khoản trong 1–3 ngày làm việc.',
} as const;

export const SHIPPING_TIER_LABELS: Record<ShippingTier, string> = {
  Standard: 'Tiêu chuẩn',
  Express: 'Hỏa tốc',
};

export const FAILURE_CAUSES: Record<FailureCause, { label: string; party: FaultParty }> = {
  Customer_Unreachable: { label: 'Khách không nghe máy', party: 'Customer' },
  Wrong_Address_By_Customer: { label: 'Sai địa chỉ do khách', party: 'Customer' },
  Customer_Refused: { label: 'Khách từ chối nhận', party: 'Customer' },
  Damaged_In_Transit: { label: 'Hàng hư hỏng do vận chuyển', party: 'Carrier' },
  Lost_In_Transit: { label: 'Thất lạc', party: 'Carrier' },
  Wrong_Packing_By_Shop: { label: 'Đóng gói sai hoặc thiếu hàng', party: 'Shop' },
  Wrong_Shipping_Info_By_Shop: { label: 'Sai thông tin giao từ shop', party: 'Shop' },
};

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  High_Shipping_Fee: 'Phí ship cao',
  Changed_Mind: 'Đổi ý',
  Wrong_Phone_Model: 'Đặt nhầm dòng máy',
  Wrong_Address: 'Sai địa chỉ',
  Other: 'Khác',
};

export const FAULT_PARTY_LABELS: Record<FaultParty, string> = {
  Customer: 'Khách hàng',
  Carrier: 'Đơn vị vận chuyển',
  Shop: 'Shop',
};

/** Placeholder list until Design Studio provides ViolationGroup (FR-OT-15). */
export const VIOLATION_GROUPS = [
  'Vi phạm bản quyền / thương hiệu',
  'Nội dung phản cảm hoặc bạo lực',
  'Ảnh chân dung người khác chưa được đồng ý',
  'Chất lượng ảnh quá thấp để in',
  'Khác',
] as const;
