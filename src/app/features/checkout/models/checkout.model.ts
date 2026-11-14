/**
 * Checkout feature data models
 * Structured to integrate seamlessly with Supabase tables ('orders', 'order_items', 'addresses', 'profiles')
 * Follows Single Source of Truth (SSOT) architecture.
 */

export interface ShippingAddress {
  id?: string;
  user_id?: string;
  fullName: string;
  phone: string;
  streetAddress: string;
  detailAddress?: string;
  ward?: string;
  district?: string;
  city?: string;
  isDefault: boolean;
  isVerified: boolean;
}

export type PaymentSimulationMode = 'random' | 'always_success' | 'always_failed';

export interface ShippingMethod {
  id: 'standard' | 'express';
  name: string;
  badge: string;
  estimatedDelivery: string;
  description: string;
  price: number;
  available: boolean;
  disabledReason?: string;
}

export interface CustomOrderItem {
  id: string;
  name: string;
  tag: string;
  device: string;
  material: string;
  edge: string;
  surface: string;
  quantity: number;
  price: number;
  imageUrl: string;
  resolutionText: string;
  resolutionPercent: number;
  leadTime: string;
  designCode: string;
}

export interface GiftPackageOption {
  enabled: boolean;
  price: number;
  title: string;
  description: string;
  message: string;
  maxChars: number;
}

/**
 * Payment Methods & E-Wallet Providers
 */
export type PaymentMethodType = 'vietqr' | 'e_wallet' | 'card' | 'cod';
export type EWalletProvider = 'momo' | 'zalopay' | 'shopeepay';

export interface EWalletOption {
  id: EWalletProvider;
  name: string;
  shortName: string;
  badge?: string;
  color: string;
  textColor: string;
  icon?: string;
  description: string;
}

export interface PaymentOption {
  type: PaymentMethodType;
  title: string;
  description: string;
  badge?: string;
  enabled: boolean;
  lockReason?: string;
  icons?: string[];
  subWallets?: EWalletOption[];
}

export interface VietQrConfig {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferSyntax: string;
  branch: string;
}

export interface Voucher {
  code: string;
  discountAmount: number;
  description: string;
  isApplied: boolean;
}

export interface ProductionStage {
  id: number;
  stepNumber: number;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  timestamp?: string;
  meta?: string;
}

/**
 * Tách biệt rõ ràng 4 nhóm trạng thái nghiệp vụ theo yêu cầu:
 */
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'interrupted';
export type ProductionStatus = 'not_started' | 'printing' | 'qc' | 'packaging' | 'completed';
export type ShippingStatus = 'pending' | 'preparing' | 'shipping' | 'delivered';

/**
 * Đơn hàng thống nhất xuyên suốt mọi bước Checkout (SSOT)
 */
export interface CheckoutOrder {
  id: string;
  orderCode: string;
  transactionId: string;
  createdAt: string;
  items: CustomOrderItem[];
  address: ShippingAddress;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethodType;
  eWalletProvider?: EWalletProvider;
  paymentMethodTitle: string;
  giftPackage: GiftPackageOption;
  voucher: Voucher | null;
  shipperNote: string;
  subtotal: number;
  shippingFee: number;
  giftPrice: number;
  discountAmount: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  productionStatus: ProductionStatus;
  shippingStatus: ShippingStatus;
  paymentTimestamp?: string;
  loyaltyStars: number;
  stages: ProductionStage[];
}
