/**
 * Cart contract shared by Mua sắm, Design Studio, Giỏ hàng and Thanh toán.
 * IN_STOCK = hàng có sẵn, CUSTOM = thiết kế theo yêu cầu (needs design review before printing).
 */
export type ProductType = 'IN_STOCK' | 'CUSTOM';

export interface CartItem {
  readonly id: string;
  readonly productType: ProductType;
  readonly name: string;
  /** Phone model shown to the customer, e.g. "iPhone 15 Pro Max". */
  readonly device: string;
  /** Blank case SKU or product SKU. */
  readonly baseSku: string;
  readonly unitPrice: number;
  readonly quantity: number;
  /** Preview image (URL or data URL) of the product or the final design. */
  readonly previewUrl?: string;
  /** CUSTOM only: design saved in Design Studio. */
  readonly designId?: string;
  readonly designCode?: string;
  readonly material?: string;
  readonly hasUploadedImage?: boolean;
  /** CUSTOM only: when the customer accepted the content policy in Design Studio. */
  readonly contentPolicyAcceptedAt?: string;
  readonly addedAt: string;
}
