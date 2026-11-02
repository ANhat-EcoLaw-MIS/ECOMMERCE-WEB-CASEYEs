export type OrderStatus =
  | 'Pending_Confirmation' // Chờ xác nhận (Cửa sổ hủy 30 phút)
  | 'In_Production'        // Đang in ấn tại xưởng (chỉ áp dụng đơn có hàng Custom)
  | 'Ready_for_Pickup'     // Đóng gói xong / Sẵn sàng giao
  | 'In_Transit'           // Đang giao hàng (3PL)
  | 'Delivered'            // Đã giao hàng thành công
  | 'Completed'            // Hoàn tất đơn hàng (sau xác nhận hoặc 72h)
  | 'Cancelled'            // Đã hủy đơn
  | 'Delivery_Failed'      // Giao hàng thất bại
  | 'Warehouse_Received'   // Hàng hoàn về kho (Lưu kho 14 ngày)
  | 'Return_Requested'     // Đang yêu cầu khiếu nại / trả hàng
  | 'Refunded';            // Đã hoàn tiền

export type PaymentMethod = 'COD' | 'Online_Banking' | 'E_Wallet' | 'Credit_Card';

export type PaymentStatus =
  | 'Pending'
  | 'Paid'
  | 'Refunded'
  | 'Refund_Pending_Retry'
  | 'Refund_Pending_Manual';

export type FailureReason =
  | 'Customer_Unreachable'   // Khách không nghe máy
  | 'Wrong_Address'          // Sai địa chỉ / không tìm thấy
  | 'Damaged_In_Transit'     // Hàng hư hỏng do vận chuyển
  | 'Logistics_Delay'        // Trục trặc đơn vị vận chuyển
  | 'Customer_Refused';      // Khách từ chối nhận

export type ResponsibleParty = 'Customer' | 'Logistics' | 'Shop';

export type CancellationReason =
  | 'High_Shipping_Fee'     // Phí ship cao
  | 'Changed_Mind'          // Đổi ý không muốn mua nữa
  | 'Wrong_Phone_Model'     // Đặt nhầm dòng máy / ốp
  | 'Wrong_Delivery_Info'   // Sai thông tin giao hàng
  | 'Other';                // Khác

export type ComplaintType =
  | 'Print_Defect'                      // Hàng lỗi in ấn / mờ nhòe / lệch màu
  | 'Wrong_Model_Or_Design'             // Sai mẫu thiết kế hoặc sai dòng máy
  | 'Transit_Damage'                    // Hư hỏng móp méo do vận chuyển
  | 'Not_Received'                      // Chưa nhận được hàng nhưng báo đã giao
  | 'Disagree_With_Failure_Reason';     // Không đồng ý nguyên nhân shipper khai báo

export type ComplaintResolution =
  | 'Reprint_Free'        // Phương án A: In lại miễn phí cho hàng Custom
  | 'Exchange_Product'    // Phương án B: Đổi sản phẩm mới (hàng có sẵn)
  | 'Refund_100'          // Phương án C: Chấp thuận hoàn tiền 100%
  | 'Rejected';           // Phương án D: Từ chối khiếu nại

export interface OrderItem {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly isCustom: boolean;
  readonly phoneModel: string;
  readonly caseMaterial: string;      // Ốp kính cường lực, Silicone dẻo, Ốp viền chống sốc...
  readonly printSnapshotUrl?: string; // Ảnh snapshot thiết kế custom
  readonly originalImageUrl?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
}

export interface OrderStatusLog {
  readonly id: string;
  readonly orderId: string;
  readonly oldStatus: OrderStatus | null;
  readonly newStatus: OrderStatus;
  readonly actor: 'Khách hàng' | 'Hệ thống tự động' | 'Admin xưởng in' | 'Đối tác 3PL (GHN/GHTK)';
  readonly reason?: string;
  readonly createdAt: string;
}

export interface ReturnRequest {
  readonly id: string;
  readonly orderId: string;
  readonly issueType: ComplaintType;
  readonly description: string;
  readonly evidenceUrls: readonly string[];
  readonly status: 'Pending_Review' | 'Approved' | 'Rejected';
  readonly resolution?: ComplaintResolution;
  readonly adminNote?: string;
  readonly createdAt: string;
  readonly resolvedAt?: string;
}

export interface Review {
  readonly id: string;
  readonly orderId: string;
  readonly ratingStars: number;
  readonly comment: string;
  readonly createdAt: string;
}

export interface Order {
  readonly id: string;
  readonly orderCode: string;          // Ví dụ: #CASEYE-9821
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail: string;
  readonly shippingAddress: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  readonly totalAmount: number;
  readonly shippingFee: number;
  readonly hasCustomItem: boolean;     // Quyết định Timeline 5 mốc hay 4 mốc
  readonly holdPackagingForCustom: boolean; // Quy tắc gom kiện cho đơn hỗn hợp
  
  // Mốc thời gian & Ngày giao dự kiến (EDD)
  createdAt: string;
  updatedAt: string;
  cancellationWindowExpiresAt?: string; // Hạn 30 phút hủy đơn
  eddStart: string;                    // Ngày giao dự kiến (Từ)
  eddEnd: string;                      // Ngày giao dự kiến (Đến)
  autoCompleteAt?: string;             // Hạn 72h tự động hoàn tất
  warehouseHoldExpiresAt?: string;     // Hạn 14 ngày lưu kho sau giao thất bại
  isQcDefectReprinted?: boolean;       // Đánh dấu in lại do lỗi QC nội bộ

  // Giao thất bại & Xử lý
  failureReason?: FailureReason;
  failureResponsibleParty?: ResponsibleParty;
  redeliveryAttempts: number;          // Tối đa 1 lần
  redeliveryFee?: number;

  // Hủy & Khiếu nại
  cancellationReason?: CancellationReason;
  cancellationNote?: string;

  // Quan hệ
  items: readonly OrderItem[];
  logs: OrderStatusLog[];
  returnRequest?: ReturnRequest;
  review?: Review;
}

export interface TimelineStepInfo {
  readonly key: 'confirmed' | 'printing' | 'packaging' | 'shipping' | 'completed';
  readonly label: string;
  readonly description: string;
  readonly status: 'completed' | 'current' | 'upcoming';
  readonly timestamp?: string;
  readonly hidden?: boolean;
}
