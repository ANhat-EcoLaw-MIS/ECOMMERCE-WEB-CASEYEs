import { Injectable, inject } from '@angular/core';
import { POLICY_VERSION } from '../config/order-policy';
import { OrderHandoff, OrderHandoffItem } from '../models/order-handoff.model';
import { PaymentMethod, ShippingTier, Zone } from '../models/order-tracking.model';
import { Clock } from './clock';
import { OpResult, OrderTrackingService } from './order-tracking.service';

export type DemoTemplate = 'custom_upload' | 'custom_plain' | 'stock' | 'mixed';

export const DEMO_TEMPLATES: Record<DemoTemplate, { label: string; items: readonly OrderHandoffItem[] }> = {
  custom_upload: {
    label: 'Custom có ảnh tải lên (cần kiểm duyệt)',
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
    label: 'Custom không có ảnh (mẫu chữ)',
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
    label: 'Hỗn hợp (Custom + phụ kiện)',
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

const ADDRESSES: Record<Zone, string> = {
  Z1: '12 Đường số 9, P. Linh Tây, TP. Thủ Đức, TP.HCM',
  Z2: '45 Nguyễn Văn Linh, P. Tân An, TP. Cần Thơ',
  Z3: '18 Phố Huế, Q. Hai Bà Trưng, Hà Nội',
};

export interface DemoOrderInput {
  readonly template: DemoTemplate;
  readonly paymentMethod: PaymentMethod;
  readonly zone: Zone;
  readonly tier: ShippingTier;
  /** "Đặt cách đây X phút" so the 30-minute window and 16:00 cut-off can be demoed. */
  readonly minutesAgo: number;
}

/**
 * Stands in for Payment's Checkout: builds an OrderHandoff exactly like Checkout will
 * (policy consent, fees and EDD are computed by OrderTrackingService.receiveHandoff).
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
      shippingAddress: ADDRESSES[input.zone],
      zone: input.zone,
      shippingTier: input.tier,
      paymentMethod: input.paymentMethod,
      items: DEMO_TEMPLATES[input.template].items,
      policyVersion: POLICY_VERSION,
      policyAcceptedAt: createdAt,
      createdAt,
    };
    return this.orders.receiveHandoff(handoff);
  }
}
