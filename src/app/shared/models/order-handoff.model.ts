/**
 * Contract between Thanh toán and Quản lý đơn hàng: what Checkout sends when an order is placed.
 * Shipping fee, transit days and Hỏa tốc eligibility are owned by Thanh toán.
 */
export type PaymentMethod = 'COD' | 'QR_Transfer';

/** Standard for every order; Hỏa tốc (Express) only for stock-only orders. */
export type ShippingTier = 'Standard' | 'Express';

export interface ShippingQuote {
  /** Amount the customer paid for shipping. */
  readonly fee: number;
  /** Standard fee for this address; basis for re-delivery and two-way costs. */
  readonly standardFee: number;
  /** Extra paid for Hỏa tốc over Standard (0 for Standard). */
  readonly expressSurcharge: number;
  /** Transit days (Mon–Sat) for Standard; ignored for Hỏa tốc. */
  readonly transitDays: { readonly min: number; readonly max: number };
}

export interface OrderHandoffItem {
  readonly productName: string;
  readonly phoneModel: string;
  readonly baseSku: string;
  /** true = thiết kế theo yêu cầu (CUSTOM), false = hàng có sẵn (IN_STOCK). */
  readonly isCustom: boolean;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly imageUrl?: string;
  readonly design?: {
    readonly previewUrl?: string;
    readonly caption?: string;
    readonly hasUploadedImage: boolean;
    readonly contentPolicyAcceptedAt?: string;
  };
}

export interface OrderHandoff {
  readonly orderCode?: string;
  readonly customer: {
    readonly id: string;
    readonly name: string;
    readonly phone: string;
    readonly email: string;
  };
  readonly payerName: string;
  readonly shippingAddress: string;
  readonly shippingTier: ShippingTier;
  readonly shipping: ShippingQuote;
  readonly paymentMethod: PaymentMethod;
  /** Set when the online payment was confirmed (prepaid orders). */
  readonly paymentTxnRef?: string;
  readonly items: readonly OrderHandoffItem[];
  readonly policyVersion: string;
  readonly policyAcceptedAt: string;
  /** Discount already applied at checkout (voucher, points). */
  readonly discount?: number;
  /** ISO time the order was placed. Defaults to now. */
  readonly createdAt?: string;
}
