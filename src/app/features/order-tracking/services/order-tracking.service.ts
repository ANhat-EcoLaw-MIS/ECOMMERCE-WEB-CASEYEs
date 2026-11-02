import { Injectable, computed, signal } from '@angular/core';
import {
  CancellationReason,
  ComplaintResolution,
  ComplaintType,
  Order,
  OrderStatus,
  OrderStatusLog,
} from '../models/order-tracking.model';

@Injectable({
  providedIn: 'root',
})
export class OrderTrackingService {
  // Bộ dữ liệu mẫu phong phú tương ứng với các kịch bản trong BRD/SRD
  private readonly initialOrders: Order[] = [
    {
      id: 'ord-001',
      orderCode: '#CASEYE-8892',
      customerId: 'user-01',
      customerName: 'Nguyễn Nhật Anh',
      customerPhone: '0903123456',
      customerEmail: 'nhatanh@example.com',
      shippingAddress: 'Số 12 Đường số 9, P. Linh Tây, TP. Thủ Đức, TP. Hồ Chí Minh',
      status: 'In_Production',
      paymentMethod: 'Online_Banking',
      paymentStatus: 'Paid',
      totalAmount: 358000,
      shippingFee: 25000,
      hasCustomItem: true, // Kích hoạt Timeline 5 mốc
      holdPackagingForCustom: true,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      cancellationWindowExpiresAt: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
      eddStart: '30/10/2026',
      eddEnd: '01/11/2026',
      redeliveryAttempts: 0,
      items: [
        {
          id: 'item-01',
          productId: 'prod-custom-01',
          productName: 'Ốp lưng Typography "Good Vibes Only"',
          isCustom: true,
          phoneModel: 'iPhone 15 Pro Max',
          caseMaterial: 'Kính cường lực viền dẻo',
          printSnapshotUrl: '/brand_signature/mock_custom_case.webp',
          quantity: 1,
          unitPrice: 289000,
          totalPrice: 289000,
        },
        {
          id: 'item-02',
          productId: 'prod-acc-02',
          productName: 'Dây đeo điện thoại ngọc trai tím đính đá',
          isCustom: false,
          phoneModel: 'Universal',
          caseMaterial: 'Dây hạt Acrylic',
          quantity: 1,
          unitPrice: 69000,
          totalPrice: 69000,
        },
      ],
      logs: [
        {
          id: 'log-01',
          orderId: 'ord-001',
          oldStatus: null,
          newStatus: 'Pending_Confirmation',
          actor: 'Khách hàng',
          reason: 'Đặt hàng & Thanh toán thành công',
          createdAt: '28/10/2026 14:20',
        },
        {
          id: 'log-02',
          orderId: 'ord-001',
          oldStatus: 'Pending_Confirmation',
          newStatus: 'In_Production',
          actor: 'Admin xưởng in',
          reason: 'Duyệt tệp in snapshot, chuyển xưởng in UV',
          createdAt: '28/10/2026 15:10',
        },
      ],
    },
    {
      id: 'ord-002',
      orderCode: '#CASEYE-5510',
      customerId: 'user-01',
      customerName: 'Nguyễn Nhật Anh',
      customerPhone: '0903123456',
      customerEmail: 'nhatanh@example.com',
      shippingAddress: 'Số 12 Đường số 9, P. Linh Tây, TP. Thủ Đức, TP. Hồ Chí Minh',
      status: 'Ready_for_Pickup',
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      totalAmount: 180000,
      shippingFee: 20000,
      hasCustomItem: false, // FR-OT-02: Ẩn bước in ấn, còn 4 mốc
      holdPackagingForCustom: false,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      eddStart: '29/10/2026',
      eddEnd: '31/10/2026',
      redeliveryAttempts: 0,
      items: [
        {
          id: 'item-03',
          productId: 'prod-ready-01',
          productName: 'Ốp lưng Clear Magnetic Shockproof',
          isCustom: false,
          phoneModel: 'iPhone 14',
          caseMaterial: 'Silicone trong suốt viền khí',
          quantity: 1,
          unitPrice: 160000,
          totalPrice: 160000,
        },
      ],
      logs: [
        {
          id: 'log-03',
          orderId: 'ord-002',
          oldStatus: null,
          newStatus: 'Pending_Confirmation',
          actor: 'Khách hàng',
          reason: 'Đặt hàng COD',
          createdAt: '28/10/2026 10:15',
        },
        {
          id: 'log-04',
          orderId: 'ord-002',
          oldStatus: 'Pending_Confirmation',
          newStatus: 'Ready_for_Pickup',
          actor: 'Admin xưởng in',
          reason: 'Hàng có sẵn, đóng gói xong chờ 3PL lấy hàng',
          createdAt: '28/10/2026 11:30',
        },
      ],
    },
    {
      id: 'ord-003',
      orderCode: '#CASEYE-7734',
      customerId: 'user-01',
      customerName: 'Nguyễn Nhật Anh',
      customerPhone: '0903123456',
      customerEmail: 'nhatanh@example.com',
      shippingAddress: 'Số 12 Đường số 9, P. Linh Tây, TP. Thủ Đức, TP. Hồ Chí Minh',
      status: 'Delivered', // Chờ khách xác nhận hoặc auto 72h
      paymentMethod: 'Online_Banking',
      paymentStatus: 'Paid',
      totalAmount: 299000,
      shippingFee: 0,
      hasCustomItem: true,
      holdPackagingForCustom: false,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      eddStart: '27/10/2026',
      eddEnd: '28/10/2026',
      autoCompleteAt: new Date(Date.now() + 3600000 * 70).toISOString(),
      redeliveryAttempts: 0,
      items: [
        {
          id: 'item-04',
          productId: 'prod-custom-02',
          productName: 'Ốp lưng Tranh trừu tượng Cosmic Dream',
          isCustom: true,
          phoneModel: 'Samsung Galaxy S24 Ultra',
          caseMaterial: 'Kính cường lực lưng gương',
          quantity: 1,
          unitPrice: 299000,
          totalPrice: 299000,
        },
      ],
      logs: [
        {
          id: 'log-05',
          orderId: 'ord-003',
          oldStatus: 'In_Transit',
          newStatus: 'Delivered',
          actor: 'Đối tác 3PL (GHN/GHTK)',
          reason: 'Giao hàng thành công cho người nhận',
          createdAt: '28/10/2026 16:30',
        },
      ],
    },
    {
      id: 'ord-004',
      orderCode: '#CASEYE-3391',
      customerId: 'user-01',
      customerName: 'Nguyễn Nhật Anh',
      customerPhone: '0903123456',
      customerEmail: 'nhatanh@example.com',
      shippingAddress: 'Số 12 Đường số 9, P. Linh Tây, TP. Thủ Đức, TP. Hồ Chí Minh',
      status: 'Delivery_Failed', // Giao thất bại, đếm ngược 14 ngày
      paymentMethod: 'Online_Banking',
      paymentStatus: 'Paid',
      totalAmount: 310000,
      shippingFee: 20000,
      hasCustomItem: true,
      holdPackagingForCustom: false,
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      eddStart: '26/10/2026',
      eddEnd: '28/10/2026',
      warehouseHoldExpiresAt: new Date(Date.now() + 3600000 * 24 * 13).toISOString(),
      failureReason: 'Customer_Unreachable',
      failureResponsibleParty: 'Customer',
      redeliveryAttempts: 0,
      items: [
        {
          id: 'item-05',
          productId: 'prod-custom-03',
          productName: 'Ốp lưng Hologram Neon Wave',
          isCustom: true,
          phoneModel: 'iPhone 15 Pro',
          caseMaterial: 'Viền TPU dẻo chống sốc',
          quantity: 1,
          unitPrice: 290000,
          totalPrice: 290000,
        },
      ],
      logs: [
        {
          id: 'log-06',
          orderId: 'ord-004',
          oldStatus: 'In_Transit',
          newStatus: 'Delivery_Failed',
          actor: 'Đối tác 3PL (GHN/GHTK)',
          reason: 'Giao thất bại: Khách không nghe máy sau 3 lần gọi',
          createdAt: '28/10/2026 17:00',
        },
      ],
    },
  ];

  // State
  readonly orders = signal<Order[]>(this.initialOrders);
  readonly selectedOrderId = signal<string>('ord-001');

  // Computed
  readonly selectedOrder = computed(() => {
    const list = this.orders();
    return list.find((o) => o.id === this.selectedOrderId() || o.orderCode === this.selectedOrderId()) || list[0] || null;
  });

  // Actions
  selectOrder(idOrCode: string) {
    this.selectedOrderId.set(idOrCode);
  }

  searchOrder(query: string): boolean {
    const q = query.trim().toUpperCase();
    const found = this.orders().find(
      (o) => o.orderCode.toUpperCase() === q || o.customerPhone === query.trim() || o.id === query.trim()
    );
    if (found) {
      this.selectedOrderId.set(found.id);
      return true;
    }
    return false;
  }

  // FR-OT-05: Kiểm soát hủy đơn (cửa sổ 30 phút)
  cancelOrder(orderId: string, reason: CancellationReason, note?: string): { success: boolean; message: string } {
    const current = this.orders().find((o) => o.id === orderId);
    if (!current) {
      return { success: false, message: 'Không tìm thấy đơn hàng' };
    }

    // Kiểm tra trạng thái và thời gian
    if (current.status !== 'Pending_Confirmation') {
      return {
        success: false,
        message: 'Đơn hàng đã được chuyển sang xưởng sản xuất, không thể hủy theo chính sách hàng cá nhân hóa.',
      };
    }

    const updated = this.orders().map((o) => {
      if (o.id === orderId) {
        const newLogs: OrderStatusLog[] = [
          ...o.logs,
          {
            id: `log-${Date.now()}`,
            orderId: o.id,
            oldStatus: o.status,
            newStatus: 'Cancelled',
            actor: 'Khách hàng',
            reason: `Khách hủy đơn. Lý do: ${reason} ${note ? '(' + note + ')' : ''}`,
            createdAt: new Date().toLocaleString('vi-VN'),
          },
        ];
        return {
          ...o,
          status: 'Cancelled' as OrderStatus,
          paymentStatus: o.paymentMethod === 'Online_Banking' ? 'Refunded' : o.paymentStatus,
          cancellationReason: reason,
          cancellationNote: note,
          logs: newLogs,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });

    this.orders.set(updated);
    return { success: true, message: 'Đã hủy đơn hàng thành công.' };
  }

  // FR-OT-08: Xác nhận nhận hàng
  confirmDelivery(orderId: string): void {
    const updated = this.orders().map((o) => {
      if (o.id === orderId) {
        const newLogs: OrderStatusLog[] = [
          ...o.logs,
          {
            id: `log-${Date.now()}`,
            orderId: o.id,
            oldStatus: o.status,
            newStatus: 'Completed',
            actor: 'Khách hàng',
            reason: 'Khách hàng xác nhận đã nhận hàng thành công',
            createdAt: new Date().toLocaleString('vi-VN'),
          },
        ];
        return {
          ...o,
          status: 'Completed' as OrderStatus,
          logs: newLogs,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });
    this.orders.set(updated);
  }

  // Đánh giá sao (FR-OT-08 & FR-OT-14)
  submitReview(orderId: string, stars: number, comment: string): void {
    const updated = this.orders().map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          review: {
            id: `rev-${Date.now()}`,
            orderId,
            ratingStars: stars,
            comment,
            createdAt: new Date().toISOString(),
          },
        };
      }
      return o;
    });
    this.orders.set(updated);
  }

  // FR-OT-11: Báo sự cố / Khiếu nại
  submitIssue(orderId: string, issueType: ComplaintType, description: string, evidenceUrls: string[]): void {
    const updated = this.orders().map((o) => {
      if (o.id === orderId) {
        const newLogs: OrderStatusLog[] = [
          ...o.logs,
          {
            id: `log-${Date.now()}`,
            orderId: o.id,
            oldStatus: o.status,
            newStatus: 'Return_Requested',
            actor: 'Khách hàng',
            reason: `Gửi khiếu nại: ${issueType}. Chi tiết: ${description}`,
            createdAt: new Date().toLocaleString('vi-VN'),
          },
        ];
        return {
          ...o,
          status: 'Return_Requested' as OrderStatus,
          returnRequest: {
            id: `ret-${Date.now()}`,
            orderId,
            issueType,
            description,
            evidenceUrls,
            status: 'Pending_Review' as const,
            createdAt: new Date().toISOString(),
          },
          logs: newLogs,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });
    this.orders.set(updated);
  }

  // FR-OT-09: Yêu cầu giao lại đơn thất bại
  requestRedelivery(orderId: string): void {
    const updated = this.orders().map((o) => {
      if (o.id === orderId) {
        const newLogs: OrderStatusLog[] = [
          ...o.logs,
          {
            id: `log-${Date.now()}`,
            orderId: o.id,
            oldStatus: o.status,
            newStatus: 'In_Transit',
            actor: 'Khách hàng',
            reason: 'Khách yêu cầu giao lại kiện hàng (Lần 2)',
            createdAt: new Date().toLocaleString('vi-VN'),
          },
        ];
        return {
          ...o,
          status: 'In_Transit' as OrderStatus,
          redeliveryAttempts: o.redeliveryAttempts + 1,
          eddStart: '01/11/2026',
          eddEnd: '03/11/2026',
          logs: newLogs,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });
    this.orders.set(updated);
  }

  // FR-OT-07: Giả lập 3PL Webhook (Simulator)
  mockWebhook(orderId: string, event: 'In_Transit' | 'Delivered' | 'Delivery_Failed' | 'Warehouse_Received'): void {
    const updated = this.orders().map((o) => {
      if (o.id === orderId) {
        let newStatus: OrderStatus = o.status;
        let reason = '';

        if (event === 'In_Transit') {
          newStatus = 'In_Transit';
          reason = '3PL Webhook: Kiện hàng rời trung tâm khai thác, đang giao';
        } else if (event === 'Delivered') {
          newStatus = 'Delivered';
          reason = '3PL Webhook: Giao hàng thành công';
        } else if (event === 'Delivery_Failed') {
          newStatus = 'Delivery_Failed';
          reason = '3PL Webhook: Giao thất bại - Khách không bắt máy';
        } else if (event === 'Warehouse_Received') {
          newStatus = 'Warehouse_Received';
          reason = '3PL Webhook: Hàng hoàn về kho shop, bắt đầu đếm 14 ngày lưu kho';
        }

        const newLogs: OrderStatusLog[] = [
          ...o.logs,
          {
            id: `log-${Date.now()}`,
            orderId: o.id,
            oldStatus: o.status,
            newStatus,
            actor: 'Đối tác 3PL (GHN/GHTK)',
            reason,
            createdAt: new Date().toLocaleString('vi-VN'),
          },
        ];

        return {
          ...o,
          status: newStatus,
          logs: newLogs,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });
    this.orders.set(updated);
  }

  // Admin: Đánh dấu in lại do lỗi QC (cộng thêm 2 ngày vào EDD)
  markQcDefect(orderId: string): void {
    const updated = this.orders().map((o) => {
      if (o.id === orderId) {
        const newLogs: OrderStatusLog[] = [
          ...o.logs,
          {
            id: `log-${Date.now()}`,
            orderId: o.id,
            oldStatus: o.status,
            newStatus: 'In_Production',
            actor: 'Admin xưởng in',
            reason: 'Phát hiện ốp in bị lệch màu trong khâu QC nội bộ. Duyệt in lại và gia hạn EDD +2 ngày.',
            createdAt: new Date().toLocaleString('vi-VN'),
          },
        ];
        return {
          ...o,
          status: 'In_Production' as OrderStatus,
          isQcDefectReprinted: true,
          eddStart: '02/11/2026',
          eddEnd: '04/11/2026',
          logs: newLogs,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });
    this.orders.set(updated);
  }
}
