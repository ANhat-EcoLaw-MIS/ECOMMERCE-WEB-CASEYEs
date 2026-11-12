/**
 * Checkout feature data models
 * Structured to integrate seamlessly with Supabase tables ('orders', 'order_items', 'addresses', 'profiles')
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

export type PaymentMethodType = 'vietqr' | 'momo' | 'card' | 'cod';

export interface PaymentOption {
  type: PaymentMethodType;
  title: string;
  description: string;
  badge?: string;
  enabled: boolean;
  lockReason?: string;
  icons?: string[];
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

export interface CheckoutOrder {
  id: string;
  orderCode: string;
  createdAt: string;
  items: CustomOrderItem[];
  address: ShippingAddress;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethodType;
  giftPackage: GiftPackageOption;
  voucher: Voucher | null;
  shipperNote: string;
  subtotal: number;
  shippingFee: number;
  giftPrice: number;
  discountAmount: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  loyaltyStars: number;
  stages: ProductionStage[];
}

