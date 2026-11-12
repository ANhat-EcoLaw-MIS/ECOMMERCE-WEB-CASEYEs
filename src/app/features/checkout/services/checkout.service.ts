import { Injectable, computed, signal } from '@angular/core';
import {
  CheckoutOrder,
  CustomOrderItem,
  GiftPackageOption,
  PaymentMethodType,
  PaymentOption,
  ProductionStage,
  ShippingAddress,
  ShippingMethod,
  VietQrConfig,
  Voucher,
} from '../models/checkout.model';

/**
 * Utility: Tính ngày giao hàng dự kiến động theo lịch thực tế (Tiếng Việt)
 */
export function calculateDeliveryRange(startOffsetDays = 2, endOffsetDays = 4): string {
  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const now = new Date();

  const start = new Date(now);
  start.setDate(now.getDate() + startOffsetDays);

  const end = new Date(now);
  end.setDate(now.getDate() + endOffsetDays);

  const startDay = daysOfWeek[start.getDay()];
  const startDate = `${start.getDate()}/${start.getMonth() + 1}`;

  const endDay = daysOfWeek[end.getDay()];
  const endDate = `${end.getDate()}/${end.getMonth() + 1}`;

  return `Dự kiến: ${startDay}, ${startDate} - ${endDay}, ${endDate}`;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  // --- Shipping Address State (ready for Supabase 'addresses' table) ---
  readonly address = signal<ShippingAddress>({
    fullName: 'Nguyễn Minh Anh',
    phone: '0912345678',
    streetAddress: 'Căn hộ 12.04 Tháp B, Saigon Riverside Complex, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    detailAddress: 'Căn hộ 12.04 Tháp B, Saigon Riverside Complex',
    ward: 'Phường Bến Nghé',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    isDefault: true,
    isVerified: true,
  });

  // --- Shipper Note ---
  readonly shipperNote = signal<string>(
    'Gọi trước 15 phút khi giao. Gửi sảnh lễ tân nếu không có nhà.'
  );

  // --- Dynamic Delivery Dates ---
  readonly estimatedDeliveryText = signal<string>(calculateDeliveryRange(2, 4));

  // --- Shipping Methods ---
  readonly shippingMethods = signal<ShippingMethod[]>([
    {
      id: 'standard',
      name: 'Giao tiêu chuẩn',
      badge: 'Tiết kiệm',
      estimatedDelivery: calculateDeliveryRange(2, 4),
      description: 'Bao gồm 24h xưởng in UV + 1-2 ngày vận chuyển',
      price: 25000,
      available: true,
    },
    {
      id: 'express',
      name: 'Hỏa tốc 24H',
      badge: 'Tạm khóa',
      estimatedDelivery: 'Giao nhanh trong 24 giờ',
      description: 'Chỉ áp dụng cho hàng có sẵn (không áp dụng cho đơn có ốp lưng Custom in theo yêu cầu)',
      price: 45000,
      available: false,
      disabledReason: 'Chỉ áp dụng cho hàng có sẵn',
    },
  ]);

  readonly selectedShippingId = signal<'standard' | 'express'>('standard');

  // --- Gift Package & Card Add-on ---
  readonly giftOption = signal<GiftPackageOption>({
    enabled: true,
    price: 25000,
    title: 'Gói quà Hologram & Thiệp viết tay xinh xắn',
    description: 'Hộp quà ánh kim xà cừ 7 màu, ruy băng dạ quang tím pastel kèm thiệp thư do CaseEYE nắn nót viết tay.',
    message: 'Chúc em bé tuổi mới luôn rực rỡ, xinh đẹp và nhiều may mắn nhe! From Minh Anh with love ❤️',
    maxChars: 150,
  });

  // --- Payment Methods ---
  readonly paymentOptions = signal<PaymentOption[]>([
    {
      type: 'vietqr',
      title: 'Chuyển khoản VietQR Pro (Khuyên dùng)',
      description: 'Quét mã QR từ mọi ứng dụng ngân hàng và ví điện tử, tự động khớp đơn 3s',
      badge: 'Khuyên dùng • Tốc độ cao',
      enabled: true,
    },
    {
      type: 'momo',
      title: 'Ví MoMo',
      description: 'Mở ứng dụng MoMo để thanh toán 1 chạm liền mạch',
      enabled: true,
    },
    {
      type: 'card',
      title: 'Thẻ Quốc Tế (Visa, Mastercard, JCB)',
      description: 'Cổng thanh toán quốc tế bảo mật OnePay chuẩn 3D-Secure',
      enabled: true,
      icons: ['VISA', 'MC'],
    },
    {
      type: 'cod',
      title: 'Thanh toán khi nhận hàng (COD)',
      description: 'Không khả dụng cho đơn hàng có sản phẩm Custom cá nhân hóa',
      badge: 'Tạm khóa',
      enabled: false,
      lockReason: 'Đơn có sản phẩm in theo yêu cầu cần thanh toán trước 100% để xưởng chế tác khuôn in UV độc bản.',
    },
  ]);

  readonly selectedPaymentType = signal<PaymentMethodType>('vietqr');

  // --- VietQR Configuration (Can be fetched or updated via Supabase/Backend) ---
  readonly vietQrConfig = signal<VietQrConfig>({
    bankName: 'MB Bank (Quân Đội)',
    accountNumber: '0912 888 999',
    accountHolder: 'CTY TNHH CASEEYE VIETNAM',
    transferSyntax: 'CEY89421',
    branch: 'Hà Nội',
  });

  // --- Cart Items (Ready for Supabase 'order_items') ---
  readonly items = signal<CustomOrderItem[]>([
    {
      id: 'item-01',
      name: 'Cloud Bear Edition (Phiên bản Gấu Vũ Trụ)',
      tag: '#CustomDesign',
      device: 'iPhone 15 Pro Max',
      material: 'Lưng kính 9H viền TPU chống sốc',
      edge: 'Chống sốc Air-Shield tím',
      surface: 'Phủ bóng 3D bóng bẩy',
      quantity: 1,
      price: 464000,
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD1v112R_7ZfELY_FPkjh8jGY8emF8-6Cy1lm2DeRYvh1EdMWHyHn0e2qv4O-2ecA_FIL4pQLK-G--qB8YJjeyG5oFTx0jSf_NAG_Pvuk9V0bK0z-FmL4GroZRBXDiHqrvZiLOana-QtHSbVQ4QLhF7eeoO-2KF8_DnplCN1PVNBBe1gT3sNtpXl3rntowJTicce5dKqo2oad__qC5g4YcukPN8z_LEbAqWSVmn8g',
      resolutionText: 'Đạt chuẩn 300 DPI (Cực nét)',
      resolutionPercent: 100,
      leadTime: 'In trong 24h • x1 cái',
      designCode: '#CB-99',
    },
  ]);

  // --- Voucher ---
  readonly voucher = signal<Voucher | null>({
    code: 'CASEFIRST',
    discountAmount: 50000,
    description: 'Voucher khách hàng mới',
    isApplied: true,
  });

  // --- Custom consent agreement ---
  readonly designConfirmed = signal<boolean>(true);

  // --- Current active order ---
  readonly currentOrder = signal<CheckoutOrder | null>(null);

  // --- Computed financial totals ---
  readonly selectedShippingMethod = computed(() => {
    const list = this.shippingMethods();
    const id = this.selectedShippingId();
    return list.find((m) => m.id === id) ?? list[0];
  });

  readonly subtotal = computed(() => {
    return this.items().reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  readonly shippingFee = computed(() => {
    return this.selectedShippingMethod().price;
  });

  readonly giftFee = computed(() => {
    const gift = this.giftOption();
    return gift.enabled ? gift.price : 0;
  });

  readonly discountAmount = computed(() => {
    const v = this.voucher();
    return v && v.isApplied ? v.discountAmount : 0;
  });

  readonly totalAmount = computed(() => {
    const total = this.subtotal() + this.shippingFee() + this.giftFee() - this.discountAmount();
    return Math.max(0, total);
  });

  readonly formattedTotal = computed(() => {
    return this.formatCurrency(this.totalAmount());
  });

  // --- Actions ---

  setShippingMethod(id: 'standard' | 'express'): void {
    const target = this.shippingMethods().find((m) => m.id === id);
    if (target && target.available) {
      this.selectedShippingId.set(id);
    }
  }

  setPaymentMethod(type: PaymentMethodType): void {
    const option = this.paymentOptions().find((p) => p.type === type);
    if (option && option.enabled) {
      this.selectedPaymentType.set(type);
    }
  }

  toggleGiftPackage(enabled: boolean): void {
    this.giftOption.update((prev) => ({ ...prev, enabled }));
  }

  updateGiftMessage(message: string): void {
    this.giftOption.update((prev) => ({
      ...prev,
      message: message.slice(0, prev.maxChars),
    }));
  }

  setShipperNote(note: string): void {
    this.shipperNote.set(note);
  }

  toggleDesignConfirmed(): void {
    this.designConfirmed.update((val) => !val);
  }

  applyVoucher(code: string): boolean {
    const clean = code.trim().toUpperCase();
    if (clean === 'CASEFIRST') {
      this.voucher.set({
        code: 'CASEFIRST',
        discountAmount: 50000,
        description: 'Voucher khách hàng mới',
        isApplied: true,
      });
      return true;
    } else if (clean === 'VIP30') {
      this.voucher.set({
        code: 'VIP30',
        discountAmount: 30000,
        description: 'Voucher giảm giá CaseEYE VIP',
        isApplied: true,
      });
      return true;
    }
    return false;
  }

  removeVoucher(): void {
    this.voucher.update((v) => (v ? { ...v, isApplied: false } : null));
  }

  updateAddress(newAddress: Partial<ShippingAddress>): void {
    this.address.update((prev) => ({ ...prev, ...newAddress }));
  }

  /**
   * Finalizes order object and stores current order snapshot
   * (Ready to be wired to: await supabase.from('orders').insert(...))
   */
  generateOrder(): CheckoutOrder {
    const orderCode = `CE-${Math.floor(10000 + Math.random() * 90000)}`;
    const stages: ProductionStage[] = [
      {
        id: 1,
        stepNumber: 1,
        title: '1. Tiếp nhận & Thiết kế',
        description: 'File in độ phân giải 300 DPI đã xử lý layer chuẩn màu CMYK.',
        status: 'completed',
        timestamp: '14:30 - Hôm nay',
      },
      {
        id: 2,
        stepNumber: 2,
        title: '2. In Phun UV & Phủ Bóng 3D',
        description: 'Dàn máy Mimaki Nhật Bản đang phủ bóng nổi 8 lớp và sấy LED tia cực tím.',
        status: 'in_progress',
        meta: 'Đang gia công tại Lab Q7',
      },
      {
        id: 3,
        stepNumber: 3,
        title: '3. Kiểm Định QC 99%',
        description: 'Test kháng cào xước chì 4H, chống bám vân tay & khớp nút viền camera.',
        status: 'pending',
        timestamp: 'Dự kiến: Sáng mai',
      },
      {
        id: 4,
        stepNumber: 4,
        title: '4. Hộp Hologram & Giao Hàng',
        description: 'Đóng gói box ánh nhũ bảo vệ, kèm thư cảm ơn & sticker độc quyền.',
        status: 'pending',
        timestamp: calculateDeliveryRange(2, 4),
      },
    ];

    const order: CheckoutOrder = {
      id: `ord-${Date.now()}`,
      orderCode,
      createdAt: new Date().toISOString(),
      items: this.items(),
      address: this.address(),
      shippingMethod: this.selectedShippingMethod(),
      paymentMethod: this.selectedPaymentType(),
      giftPackage: this.giftOption(),
      voucher: this.voucher(),
      shipperNote: this.shipperNote(),
      subtotal: this.subtotal(),
      shippingFee: this.shippingFee(),
      giftPrice: this.giftFee(),
      discountAmount: this.discountAmount(),
      totalAmount: this.totalAmount(),
      status: 'pending',
      loyaltyStars: 480,
      stages,
    };

    this.currentOrder.set(order);
    return order;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value) + '₫';
  }

  copyToClipboard(text: string): Promise<boolean> {
    if (navigator?.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    return Promise.resolve(false);
  }
}

