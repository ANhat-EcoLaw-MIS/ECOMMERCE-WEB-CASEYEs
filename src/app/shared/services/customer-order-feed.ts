import { Signal } from '@angular/core';

/** One line in "Lịch sử mua hàng" (Tài khoản), already formatted for display. */
export interface CustomerOrderSummary {
  readonly code: string;
  /** dd/MM/yyyy */
  readonly placedOn: string;
  /** Customer-facing status label (never an internal code). */
  readonly statusLabel: string;
  readonly itemsLabel: string;
  readonly device: string;
  readonly total: string;
  readonly previewUrl?: string;
  /** Route to the order detail page. */
  readonly link: string;
}

/**
 * Read-only feed of the signed-in customer's orders, so Tài khoản shows real orders without
 * importing Quản lý đơn hàng. Implemented by the order-tracking feature, bound in app.config.ts.
 */
export abstract class CustomerOrderFeed {
  abstract readonly orders: Signal<readonly CustomerOrderSummary[]>;
  /**
   * CasEYE Club points shown on Tài khoản. Loyalty is an external system (Spec §0.3), so this is a
   * stand-in computed from the customer's own completed orders: 0 for a new account.
   */
  abstract readonly loyaltyPoints: Signal<number>;
}
