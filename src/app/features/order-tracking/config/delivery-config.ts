import { FailureCause, FaultParty, ShippingTier, Zone } from '../models/order-tracking.model';

/** Day range in working days (processing) or shipping days (Mon–Sat). */
export interface DayRange {
  readonly min: number;
  readonly max: number;
}

export interface ZoneRate {
  readonly label: string;
  readonly fee: number;
  readonly days: DayRange;
}

/**
 * Single source of every Epic 5 business parameter (DeliveryConfig, Tables 3.5 and 3.6).
 * Nothing else in the module may hard-code these numbers.
 */
export const DELIVERY_CONFIG = {
  shopCity: 'TP.HCM',
  cancelWindowMinutes: 30,
  moderationSlaHours: 24,
  moderationWindow: { from: '13:00', to: '16:00' },
  /** Daily batch cut-off on working days (Mon–Fri). */
  batchCutoff: { hour: 16, minute: 0 },
  handlingDays: {
    stock: { min: 1, max: 2 },
    custom: { min: 2, max: 3 },
  } satisfies Record<'stock' | 'custom', DayRange>,
  /** Re-pack before a re-delivery or a free re-send (assumption A-07). */
  redeliveryHandlingDays: { min: 1, max: 1 } satisfies DayRange,
  qcReprintExtraWorkingDays: 1,
  zoneRates: {
    Z1: {
      Standard: { label: 'Standard', fee: 25_000, days: { min: 1, max: 2 } },
      Fast: { label: 'Giao nhanh', fee: 40_000, days: { min: 1, max: 1 } },
    },
    Z2: {
      Standard: { label: 'Standard', fee: 35_000, days: { min: 2, max: 3 } },
      Fast: { label: 'Giao nhanh', fee: 55_000, days: { min: 1, max: 2 } },
    },
    Z3: {
      Standard: { label: 'Standard', fee: 45_000, days: { min: 3, max: 5 } },
      Fast: { label: 'Giao nhanh', fee: 70_000, days: { min: 2, max: 3 } },
    },
  } satisfies Record<Zone, Record<ShippingTier, ZoneRate>>,
  zoneLabels: {
    Z1: 'Khu vực 1 – Nội thành TP.HCM',
    Z2: 'Khu vực 2 – Cùng miền',
    Z3: 'Khu vực 3 – Liên miền',
  } satisfies Record<Zone, string>,
  /** "Giao nhanh" is offered only where the carrier supports it (Payment FR-P-06). */
  expressAvailability: { Z1: true, Z2: true, Z3: true } satisfies Record<Zone, boolean>,
  freeshipThreshold: 349_000,
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
  carrierName: 'GHN (mock)',
} as const;

export const FAILURE_CAUSES: Record<FailureCause, { label: string; party: FaultParty }> = {
  Customer_Unreachable: { label: 'Khách không nghe máy', party: 'Customer' },
  Wrong_Address_By_Customer: { label: 'Sai địa chỉ do khách', party: 'Customer' },
  Customer_Refused: { label: 'Khách từ chối nhận', party: 'Customer' },
  Damaged_In_Transit: { label: 'Hàng hư hỏng do vận chuyển', party: 'Carrier' },
  Lost_In_Transit: { label: 'Thất lạc', party: 'Carrier' },
  Wrong_Packing_By_Shop: { label: 'Đóng gói sai hoặc thiếu hàng', party: 'Shop' },
  Wrong_Shipping_Info_By_Shop: { label: 'Sai thông tin giao từ shop', party: 'Shop' },
};

export const FAULT_PARTY_LABELS: Record<FaultParty, string> = {
  Customer: 'Khách hàng',
  Carrier: 'Đơn vị vận chuyển',
  Shop: 'Shop',
};

/** Placeholder list until the team defines ViolationGroup (FR-OT-15). */
export const VIOLATION_GROUPS = [
  'Vi phạm bản quyền / thương hiệu',
  'Nội dung phản cảm hoặc bạo lực',
  'Ảnh chân dung người khác chưa được đồng ý',
  'Chất lượng ảnh quá thấp để in',
  'Khác',
] as const;
