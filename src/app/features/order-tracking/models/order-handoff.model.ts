import { PaymentMethod, ShippingQuote, ShippingTier } from './order-tracking.model';

/**
 * Contract Thanh toán calls when an order is placed (OrderTrackingService.receiveHandoff).
 * Shipping fee, transit days and Hỏa tốc eligibility come from Thanh toán (FR-P-06, 07).
 * Until Checkout exists, the Demo Console builds this object the same way Checkout will.
 */
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
  /** Set when the QR transfer was confirmed (prepaid orders). */
  readonly paymentTxnRef?: string;
  readonly items: readonly OrderHandoffItem[];
  readonly policyVersion: string;
  readonly policyAcceptedAt: string;
  /** ISO time the order was placed. Defaults to the clock's now. */
  readonly createdAt?: string;
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
