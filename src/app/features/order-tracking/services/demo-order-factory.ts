import { Injectable, inject } from '@angular/core';
import { POLICY_VERSION } from '../config/order-policy';
import { OrderHandoff, OrderHandoffItem } from '../models/order-handoff.model';
import { PaymentMethod, ShippingQuote, ShippingTier } from '../models/order-tracking.model';
import { Clock } from './clock';
import { OpResult, OrderTrackingService } from './order-tracking.service';

export type DemoTemplate = 'custom_upload' | 'custom_plain' | 'stock' | 'mixed';

export const DEMO_TEMPLATES: Record<DemoTemplate, { label: string; items: readonly OrderHandoffItem[] }> = {
  custom_upload: {
    label: 'Thiết kế theo yêu cầu – có ảnh tải lên',
    items: [
      {
        productName: 'Ốp lưng ảnh cá nhân "Summer Trip"',
        phoneModel: 'iPhone 15 Pro',
        baseSku: 'PHOI-IP15P-KINH',
        isCustom: true,
        quantity: 1,
        unitPrice: 289_000,
        design: { caption: 'Summer Trip', hasUploadedImage: true },
      },
    ],
  },
  custom_plain: {
    label: 'Thiết kế theo yêu cầu – từ mẫu, không ảnh',
    items: [
      {
        productName: 'Ốp lưng Typography "Good Vibes Only"',
        phoneModel: 'Samsung Galaxy S24',
        baseSku: 'PHOI-S24-TPU',
        isCustom: true,
        quantity: 1,
        unitPrice: 259_000,
        design: { caption: 'Good Vibes', hasUploadedImage: false },
      },
    ],
  },
  stock: {
    label: 'Chỉ hàng có sẵn',
    items: [
      { productName: 'Ốp lưng Clear Magnetic chống sốc', phoneModel: 'iPhone 14', baseSku: 'SAN-IP14-CLEAR', isCustom: false, quantity: 1, unitPrice: 160_000 },
      { productName: 'Dây đeo điện thoại ngọc trai tím', phoneModel: 'Universal', baseSku: 'SAN-DAY-NGOCTRAI', isCustom: false, quantity: 1, unitPrice: 69_000 },
    ],
  },
  mixed: {
    label: 'Hỗn hợp (thiết kế theo yêu cầu + hàng có sẵn)',
    items: [
      {
        productName: 'Ốp lưng Tranh trừu tượng "Cosmic Dream"',
        phoneModel: 'iPhone 15 Pro Max',
        baseSku: 'PHOI-IP15PM-GUONG',
        isCustom: true,
        quantity: 1,
        unitPrice: 299_000,
        design: { caption: 'Cosmic', hasUploadedImage: false },
      },
      { productName: 'Giá đỡ MagSafe tím pastel', phoneModel: 'Universal', baseSku: 'SAN-MAGSAFE-TIM', isCustom: false, quantity: 1, unitPrice: 89_000 },
    ],
  },
};

/**
 * Stand-in for the quote Thanh toán returns for an address. The numbers are mock data of
 * Thanh toán, not rules of this module.
 */
export type DemoAddress = 'near' | 'far';

export const DEMO_ADDRESSES: Record<DemoAddress, { label: string; address: string; transitDays: { min: number; max: number }; standardFee: number; expressFee: number }> = {
  near: {
    label: 'Gần (vận chuyển 1–2 ngày, có Hỏa tốc)',
    address: '12 Đường số 9, P. Linh Tây, TP. Thủ Đức, TP.HCM',
    transitDays: { min: 1, max: 2 },
    standardFee: 25_000,
    expressFee: 45_000,
  },
  far: {
    label: 'Xa (vận chuyển 3–5 ngày)',
    address: '18 Phố Huế, Q. Hai Bà Trưng, Hà Nội',
    transitDays: { min: 3, max: 5 },
    standardFee: 40_000,
    expressFee: 0,
  },
};

export interface DemoOrderInput {
  readonly template: DemoTemplate;
  readonly paymentMethod: PaymentMethod;
  readonly address: DemoAddress;
  readonly tier: ShippingTier;
  /** "Đặt cách đây X phút" so the COD window and the cut-offs can be demoed. */
  readonly minutesAgo: number;
}

export function demoQuote(address: DemoAddress, tier: ShippingTier): ShippingQuote {
  const a = DEMO_ADDRESSES[address];
  const express = tier === 'Express';
  return {
    fee: express ? a.expressFee : a.standardFee,
    standardFee: a.standardFee,
    expressSurcharge: express ? a.expressFee - a.standardFee : 0,
    transitDays: a.transitDays,
  };
}

/**
 * Stands in for Thanh toán's Checkout: builds an OrderHandoff exactly like Checkout will
 * (policy consent, shipping quote); OrderTrackingService.receiveHandoff computes the EDD.
 */
@Injectable({ providedIn: 'root' })
export class DemoOrderFactory {
  private readonly clock = inject(Clock);
  private readonly orders = inject(OrderTrackingService);

  create(input: DemoOrderInput): OpResult {
    const customer = this.orders.customer();
    const createdAt = new Date(this.clock.now().getTime() - input.minutesAgo * 60_000).toISOString();
    const handoff: OrderHandoff = {
      customer,
      payerName: customer.name,
      shippingAddress: DEMO_ADDRESSES[input.address].address,
      shippingTier: input.tier,
      shipping: demoQuote(input.address, input.tier),
      paymentMethod: input.paymentMethod,
      items: DEMO_TEMPLATES[input.template].items,
      policyVersion: POLICY_VERSION,
      policyAcceptedAt: createdAt,
      createdAt,
    };
    return this.orders.receiveHandoff(handoff);
  }
}
