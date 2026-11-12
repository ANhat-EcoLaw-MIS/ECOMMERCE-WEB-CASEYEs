# Checkout Feature Module – CaseEYE's E-Commerce

> **Tài liệu Kỹ thuật & Hướng dẫn Tích hợp dành cho Developer Team**  
> **Phiên bản:** 1.0.0 | **Framework:** Angular 19+ (Standalone & Signal-based Reactivity)  
> **Tác giả:** Software Engineering Team  

---

## Mục lục (Table of Contents)

1. [Tổng quan Module (Overview)](#1-tổng-quan-module-overview)
2. [Yêu cầu Môi trường (Prerequisites)](#2-yêu-cầu-môi-trường-prerequisites)
3. [Cấu trúc Thư mục (Directory Structure)](#3-cấu-trúc-thư-mục-directory-structure)
4. [Mô hình Dữ liệu (Data Models)](#4-mô-hình-dữ-liệu-data-models)
5. [Hướng dẫn Tích hợp (Integration Guide)](#5-hướng-dẫn-tích-hợp-integration-guide)
   - [5.1. Điểm khởi đầu Điều hướng (Routing Entry Point)](#51-điểm-khởi-đầu-điều-hướng-routing-entry-point)
   - [5.2. Điểm kết nối Dữ liệu (Service Entry Point)](#52-điểm-kết-nối-dữ-liệu-service-entry-point)
   - [5.3. Luồng nạp dữ liệu từ Giỏ hàng (Cart to Checkout)](#53-luồng-nạp-dữ-liệu-từ-giỏ-hàng-cart-to-checkout)
   - [5.4. Lắng nghe và Nhận kết quả Đơn hàng](#54-lắng-nghe-và-nhận-kết-quả-đơn-hàng)
6. [Ví dụ Sử dụng Chi tiết (Usage Example)](#6-ví-dụ-sử-dụng-chi-tiết-usage-example)
7. [Ánh xạ Cơ sở dữ liệu Supabase (Database Schema Mapping)](#7-ánh-xạ-cơ-sở-dữ-liệu-supabase-database-schema-mapping)
8. [Bộ công cụ Kiểm thử & Giả lập (Dev Simulation Tools)](#8-bộ-công-cụ-kiểm-thử--giả-lập-dev-simulation-tools)
9. [Các Quy tắc Nghiệp vụ Đặc thù (Business Rules & Caveats)](#9-các-quy-tắc-nghiệp-vụ-đặc-thù-business-rules--caveats)

---

## 1. Tổng quan Module (Overview)

Module `checkout` chịu trách nhiệm quản lý toàn bộ quy trình đặt hàng và thanh toán cho hệ thống thương mại điện tử CaseEYE's (chuyên dòng sản phẩm ốp lưng in UV Custom theo yêu cầu). 

Module được thiết kế theo mô hình **Standalone Component** kết hợp **State Machine nội bộ** điều khiển bằng **Angular Signals**, vận hành độc lập qua 4 trạng thái màn hình liên tục:

```
[Form Điền thông tin & Chọn thanh toán] 
             │
             ▼ (Xác nhận đặt hàng)
  [Cổng đối soát SafePay (Processing)]
             │
      ┌──────┴──────┐
      ▼             ▼
[Thành công]    [Gián đoạn / Thử lại]
 (Success)           (Failed)
```

- **Màn 1 (`form`):** Thu thập địa chỉ giao nhận (modal xác thực 6 trường), chọn gói quà Hologram & thiệp chúc mừng, chọn phương thức vận chuyển, nhập voucher, chọn cổng thanh toán (VietQR Pro, MoMo, Visa/Mastercard).
- **Màn 2 (`processing`):** Cổng đối soát thanh toán đa ngân hàng VietQR Pro với hoạt ảnh SafePay Mascot phát sáng.
- **Màn 3 (`success`):** Xác nhận đơn hàng thành công, hiển thị tiến độ 4 bước tại xưởng in UV Mimaki, tích lũy điểm thưởng Cosmic Club, tóm tắt đơn đóng băng.
- **Màn 4 (`failed`):** Xử lý sự cố thanh toán gián đoạn, kích hoạt đồng hồ đếm ngược 15:00 giữ chỗ khuôn in UV và voucher, checklist khắc phục nhanh, nút đổi phương thức hoặc thử lại.

---

## 2. Yêu cầu Môi trường (Prerequisites)

Trước khi tích hợp module vào luồng ứng dụng chính, hãy đảm bảo dự án đáp ứng các điều kiện sau:

- **Node.js:** `>= 20.x`
- **Angular CLI / Core:** `>= 19.x`
- **Font & Icon:**
  - Font Display: `Plus Jakarta Sans` (đã nạp trong `index.html` hoặc token `--font-display`)
  - Font Body: `Inter` (đã nạp trong `index.html` hoặc token `--font-body`)
  - Google Material Symbols Outlined (nạp trong `index.html`)
- **Tokens & Styling:**
  - File `src/styles/tokens.css` phải chứa định nghĩa biến CSS: `--color-primary`, `--color-brand-*`, `--color-surface-*`, `--color-state-*`.

---

## 3. Cấu trúc Thư mục (Directory Structure)

```
src/app/features/checkout/
├── checkout.ts             # Main Standalone Component (State machine, UI Signals, Actions)
├── checkout.html           # Template HTML (Chia 4 case @switch, Modal, Floating Dev Dock)
├── checkout.scss           # Scss styles, responsive grid, luminous glow animations
├── checkout.routes.ts      # Route definition cho module Checkout
├── models/
│   └── checkout.model.ts   # Toàn bộ Types & Interfaces (Mapping sẵn với Supabase)
└── services/
    └── checkout.service.ts # Root Injectable Service (State Signals, Computed totals, Order Factory)
```

---

## 4. Mô hình Dữ liệu (Data Models)

Các interface chính được định nghĩa tại `src/app/features/checkout/models/checkout.model.ts`:

### `CustomOrderItem` (Sản phẩm trong đơn hàng)
```typescript
export interface CustomOrderItem {
  id: string;
  name: string;
  tag: string;
  device: string;           // Dòng máy (ví dụ: 'iPhone 15 Pro Max')
  material: string;         // 'Lưng kính 9H viền TPU chống sốc'
  edge: string;             // 'Chống sốc Air-Shield tím'
  surface: string;          // 'Phủ bóng 3D'
  quantity: number;
  price: number;            // Đơn giá VNĐ
  imageUrl: string;         // URL ảnh mock 3D
  resolutionText: string;   // 'Đạt chuẩn 300 DPI'
  resolutionPercent: number;// 100
  leadTime: string;         // 'In trong 24h'
  designCode: string;       // Mã bản thiết kế từ Studio
}
```

### `ShippingAddress` (Địa chỉ giao hàng)
```typescript
export interface ShippingAddress {
  id?: string;
  user_id?: string;
  fullName: string;
  phone: string;
  streetAddress: string;    // Chuỗi địa chỉ ghép đầy đủ
  detailAddress?: string;   // Số nhà, toà nhà, tên đường
  ward?: string;            // Phường/Xã
  district?: string;        // Quận/Huyện
  city?: string;            // Tỉnh/Thành phố
  isDefault: boolean;
  isVerified: boolean;
}
```

### `CheckoutOrder` (Đơn hàng sau khi đặt)
```typescript
export interface CheckoutOrder {
  id: string;
  orderCode: string;        // Mã hiển thị (VD: 'CE-89421')
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
  status: 'pending' | 'processing' | 'paid' | 'cancelled';
  loyaltyStars: number;
  stages: ProductionStage[];
}
```

---

## 5. Hướng dẫn Tích hợp (Integration Guide)

### 5.1. Điểm khởi đầu Điều hướng (Routing Entry Point)

Module Checkout đã được đăng ký lazy-loading trong `src/app/app.routes.ts`:

```typescript
{
  path: 'checkout',
  loadChildren: () => import('./features/checkout/checkout.routes').then(m => m.CHECKOUT_ROUTES),
}
```

#### Query Parameters được hỗ trợ:
Team tích hợp có thể chuyển hướng kèm query params để kiểm thử hoặc điều phối:
- `?step=form`: Mở màn hình điền thông tin đặt hàng (mặc định).
- `?step=processing`: Nhảy nhanh vào màn hình đang đối soát giao dịch.
- `?step=success`: Xem màn hình đơn hàng thành công (kèm tiến độ in UV).
- `?step=failed`: Xem màn hình giao dịch bị gián đoạn (kèm bộ đếm 15:00).
- `?dev=true` hoặc `?debug=true`: Kích hoạt hiển thị quyền mở Dev Dock trên màn hình.

---

### 5.2. Điểm kết nối Dữ liệu (Service Entry Point)

`CheckoutService` được khai báo `providedIn: 'root'`. Bất kỳ Service hoặc Component nào trong dự án (như `CartService`, `AuthService`, `DesignStudioService`) đều có thể inject trực tiếp để nạp hoặc đọc dữ liệu:

```typescript
import { CheckoutService } from '@features/checkout/services/checkout.service';

@Injectable({ providedIn: 'root' })
export class CartIntegrationService {
  private checkoutService = inject(CheckoutService);
}
```

---

### 5.3. Luồng nạp dữ liệu từ Giỏ hàng (Cart to Checkout)

Trước khi gọi `router.navigate(['/checkout'])`, team Cart cần thiết lập dữ liệu sang `CheckoutService`:

1. **Nạp danh sách sản phẩm Custom:**
   ```typescript
   this.checkoutService.items.set(cartItems);
   ```
2. **Nạp địa chỉ người nhận (nếu User đã đăng nhập):**
   ```typescript
   this.checkoutService.updateAddress({
     fullName: userProfile.fullName,
     phone: userProfile.phone,
     streetAddress: userProfile.fullAddress,
     city: userProfile.city,
     district: userProfile.district,
     ward: userProfile.ward,
     detailAddress: userProfile.street,
     isVerified: true
   });
   ```
3. **Áp dụng Voucher mặc định (nếu có):**
   ```typescript
   this.checkoutService.applyVoucher('CASEFIRST');
   ```

---

### 5.4. Lắng nghe và Nhận kết quả Đơn hàng

1. **Nhận snapshot đơn hàng qua Signal:**
   ```typescript
   // Đọc giá trị hiện tại
   const currentOrder = this.checkoutService.currentOrder();

   // Hoặc theo dõi reactive qua effect()
   effect(() => {
     const order = this.checkoutService.currentOrder();
     if (order && order.status === 'pending') {
       console.log('Đơn hàng mới được tạo:', order.orderCode);
     }
   });
   ```

2. **Trigger tạo đơn thủ công từ code ngoài:**
   ```typescript
   const newOrder = this.checkoutService.generateOrder();
   // newOrder chứa đầy đủ thông tin chuẩn bị insert vào Supabase
   ```

---

## 6. Ví dụ Sử dụng Chi tiết (Usage Example)

Dưới đây là đoạn code mẫu chuẩn Angular minh họa việc kết nối từ màn hình Giỏ hàng (`CartComponent`) sang `Checkout`:

```typescript
// cart.component.ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutService } from '../checkout/services/checkout.service';
import { CustomOrderItem } from '../checkout/models/checkout.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  template: `
    <button (click)="proceedToCheckout()" class="btn-checkout">
      Tiến hành Thanh toán
    </button>
  `
})
export class CartComponent {
  private router = inject(Router);
  private checkoutService = inject(CheckoutService);

  proceedToCheckout(): void {
    // 1. Chuẩn bị danh sách sản phẩm custom từ Giỏ hàng
    const checkoutItems: CustomOrderItem[] = [
      {
        id: 'cart-item-101',
        name: 'Cyberpunk Neon Genesis',
        tag: '#CustomDesign',
        device: 'iPhone 15 Pro Max',
        material: 'Lưng kính 9H viền TPU chống sốc',
        edge: 'Chống sốc Air-Shield tím',
        surface: 'Phủ bóng 3D dạ quang',
        quantity: 1,
        price: 464000,
        imageUrl: 'https://example.com/custom-case-preview.png',
        resolutionText: 'Đạt chuẩn 300 DPI',
        resolutionPercent: 100,
        leadTime: 'In trong 24h',
        designCode: '#CP-2026'
      }
    ];

    // 2. Nạp dữ liệu vào Checkout Service
    this.checkoutService.items.set(checkoutItems);

    // 3. Tùy chọn: nạp thông tin người dùng có sẵn
    this.checkoutService.updateAddress({
      fullName: 'Trần Văn Nam',
      phone: '0909123456',
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 7',
      ward: 'Phường Tân Phong',
      detailAddress: 'Khu dân cư Him Lam',
      streetAddress: 'Khu dân cư Him Lam, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh',
      isVerified: true
    });

    // 4. Thiết lập ghi chú nếu khách có yêu cầu từ giỏ hàng
    this.checkoutService.setShipperNote('Giao giờ hành chính, gọi trước khi đến.');

    // 5. Điều hướng sang module Checkout
    this.router.navigate(['/checkout']);
  }
}
```

---

## 7. Ánh xạ Cơ sở dữ liệu Supabase (Database Schema Mapping)

Cấu trúc state trong `checkout.service.ts` được thiết kế 1-1 tương thích với các bảng Supabase dự kiến:

| Checkout Model Field | Bảng Supabase | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- | :--- |
| `order.id` | `orders.id` | `UUID` | Primary Key |
| `order.orderCode` | `orders.order_code` | `VARCHAR(20)` | Mã hiển thị khách hàng (VD: `CE-89421`) |
| `order.totalAmount` | `orders.total_amount` | `NUMERIC(12,2)` | Tổng số tiền đã trừ voucher + ship + quà |
| `order.paymentMethod` | `orders.payment_method` | `VARCHAR(20)` | `'vietqr'` \| `'momo'` \| `'card'` |
| `order.status` | `orders.status` | `VARCHAR(20)` | `'pending'`, `'paid'`, `'processing'` |
| `order.items[]` | `order_items` | Bảng liên kết | Lưu `device`, `material`, `design_code`, `image_url` |
| `order.address` | `shipping_addresses` | Bảng địa chỉ | Lưu chi tiết Tỉnh/Thành, Quận/Huyện, Xã/Phường |
| `order.giftPackage` | `orders.gift_options` | `JSONB` | `{ enabled: bool, message: string, price: int }` |

> **Snippet mẫu lưu đơn vào Supabase khi đối soát thành công:**
> ```typescript
> async function persistOrderToSupabase(order: CheckoutOrder) {
>   const { data, error } = await supabase.from('orders').insert({
>     order_code: order.orderCode,
>     total_amount: order.totalAmount,
>     payment_method: order.paymentMethod,
>     status: 'paid',
>     address_snapshot: order.address,
>     gift_package: order.giftPackage,
>     shipper_note: order.shipperNote
>   }).select().single();
> }
> ```

---

## 8. Bộ công cụ Kiểm thử & Giả lập (Dev Simulation Tools)

Để hỗ trợ developer và presenter demo mượt mà trước Giảng viên mà không làm lộ các nút điều khiển kỹ thuật cho khách hàng, module tích hợp **Floating Dev Dock**:

1. **Vị trí:** Nằm cố định ở góc dưới cùng bên phải màn hình (`bottom: 1.5rem; right: 1.25rem`). Biểu tượng hình tròn nhỏ trung tính (`tune`), hoàn toàn không làm gián đoạn trải nghiệm giao diện người dùng thông thường.
2. **Cách mở:** Click vào nút tròn để mở Popover bảng điều khiển. Nhấn ra ngoài (backdrop) hoặc nhấn nút đóng để thu gọn.
3. **Các tính năng bên trong:**
   - **Fast Switch:** Nhảy tức thì giữa 4 bước: `1. Đặt hàng` $\rightarrow$ `2. Đối soát` $\rightarrow$ `3. Thành công` $\rightarrow$ `4. Gián đoạn`.
   - **3 Chế độ mô phỏng đối soát:**
     - `Ngẫu nhiên (80/20)`: Tỷ lệ $80\%$ thành công, $20\%$ gián đoạn mạng.
     - `Luôn thành công`: Phê duyệt thanh toán ngay và đẩy sang xưởng in UV.
     - `Luôn gián đoạn`: Luôn chuyển sang màn hình thông báo gián đoạn & thử lại.
   - **Kích hoạt nhanh cho Demo:**
     - Nút `Thành công ngay` / `Gián đoạn ngay`: Bỏ qua đếm thời gian 3s, lập tức chuyển màn hình.
     - Nút `Hết hạn (00:00)`: Ép thời gian bảo lưu giỏ hàng về `00:00` để demo cơ chế nhả voucher và tạo lại đơn hàng mới.

---

## 9. Các Quy tắc Nghiệp vụ Đặc thù (Business Rules & Caveats)

1. **Khóa phương thức COD (Thanh toán khi nhận hàng):**
   - Sản phẩm của CaseEYE là **hàng Custom in độc bản theo yêu cầu** (chế tác khuôn in UV riêng cho từng khách). Do đó, phương thức COD bị **khóa cứng** theo chính sách chống bùng hàng. Bắt buộc thanh toán trước $100\%$ qua VietQR, MoMo hoặc Thẻ.
2. **Cơ chế Bảo lưu Giỏ hàng (Hold Timer - 15 phút):**
   - Khi thanh toán bị gián đoạn (Màn 4), hệ thống kích hoạt timer 15 phút.
   - Trong thời gian này, slot phôi ốp và voucher (VD: `CASEFIRST`) được bảo lưu riêng cho khách.
   - Nếu hết $15$ phút (`00:00`), nút "Tạo lại đơn hàng mới" sẽ nhả phôi về kho chung và khởi tạo lại phiên đặt hàng mới.
3. **VietQR Mockup:**
   - Mã VietQR trên giao diện là mô phỏng SVG vector trực quan có kèm STK, Ngân hàng và Cú pháp chuyển khoản thật, cho phép sao chép 1 chạm vào clipboard. Chưa tích hợp Open Banking Webhook thật.

---

*Mọi thắc mắc trong quá trình tích hợp module Checkout, vui lòng liên hệ trực tiếp phụ trách module hoặc tạo Issue trên Git repository của dự án.*

