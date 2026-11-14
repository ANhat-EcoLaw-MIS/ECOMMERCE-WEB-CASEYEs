# Checkout Feature Module – CaseEYE's E-Commerce

> **Tài liệu Kỹ thuật & Hướng dẫn Tích hợp dành cho Developer Team**  
> **Phiên bản:** 2.0.0 (Refactored & Sub-component Architecture) | **Framework:** Angular 19+ (Standalone & Signal-based Reactivity)  
> **Tác giả:** Software Engineering Team  

---

## Mục lục (Table of Contents)

1. [Tổng quan Module (Overview)](#1-tổng-quan-module-overview)
2. [Yêu cầu Môi trường (Prerequisites)](#2-yêu-cầu-môi-trường-prerequisites)
3. [Cấu trúc Thư mục Đã Tái Cấu Trúc (Directory Structure)](#3-cấu-trúc-thư-mục-đã-tái-cấu-trúc-directory-structure)
4. [Mô hình Dữ liệu Độc lập & SSOT (Data Models)](#4-mô-hình-dữ-liệu-độc-lập--ssot-data-models)
5. [Hướng dẫn Tích hợp Chi tiết (Integration Guide)](#5-hướng-dẫn-tích-hợp-chi-tiết-integration-guide)
   - [5.1. Điểm khởi đầu Điều hướng (Routing Entry Point)](#51-điểm-khởi-đầu-điều-hướng-routing-entry-point)
   - [5.2. Điểm kết nối Dữ liệu (Service Entry Point)](#52-điểm-kết-nối-dữ-liệu-service-entry-point)
   - [5.3. Luồng nạp dữ liệu từ Giỏ hàng (Cart to Checkout)](#53-luồng-nạp-dữ-liệu-từ-giỏ-hàng-cart-to-checkout)
   - [5.4. Lắng nghe và Nhận kết quả Đơn hàng](#54-lắng-nghe-và-nhận-kết-quả-đơn-hàng)
6. [Ví dụ Sử dụng Chi tiết (Usage Example)](#6-ví-dụ-sử-dụng-chi-tiết-usage-example)
7. [Ánh xạ Cơ sở dữ liệu Supabase (Database Schema Mapping)](#7-ánh-xạ-cơ-sở-dữ-liệu-supabase-database-schema-mapping)
8. [Bộ công cụ Kiểm thử Dev Dock (Floating Dev Controls)](#8-bộ-công-cụ-kiểm-thử-dev-dock-floating-dev-controls)
9. [Các Quy tắc Nghiệp vụ Đặc thù (Business Rules)](#9-các-quy-tắc-nghiệp-vụ-đặc-thù-business-rules)

---

## 1. Tổng quan Module (Overview)

Module `checkout` chịu trách nhiệm điều phối toàn bộ quy trình hoàn tất đơn hàng và thanh toán trực tuyến cho thương hiệu ốp lưng Custom CaseEYE's. 

Sau đợt tái cấu trúc (refactor), module chuyển từ cấu trúc file nguyên khối (monolithic) sang kiến trúc **Modular Sub-components**, trong đó file root `checkout.html` đóng vai trò Orchestrator siêu tinh gọn (~50 dòng), mỗi màn hình và hộp thoại con được module hóa độc lập kèm scoped SCSS riêng biệt.

Quy trình trải nghiệm 4 màn hình liên tục:

```
[Màn 1: Form Đặt Hàng & Thanh Toán]
                │
                ▼ (Xác nhận đặt hàng)
[Màn 2: Cổng Đối Soát SafePay Mascot]
                │
        ┌───────┴───────┐
        ▼               ▼
[Màn 3: Thành Công]   [Màn 4: Gián Đoạn / Thử Lại]
```

### Nguyên lý Single Source of Truth (SSOT):
- Duy nhất một đơn hàng xuyên suốt từ Màn 1 đến Màn 4 (`activeOrder`).
- Khi thanh toán thất bại tại Màn 4 và thử lại hoặc chuyển đổi phương thức thanh toán, hệ thống **bảo lưu nguyên vẹn mã đơn hàng (`orderCode`)** và giỏ hàng, chỉ làm mới mã giao dịch (`transactionId`).
- Phục hồi tự động khi người dùng F5 hoặc truy cập bằng URL qua `sessionStorage` (`caseeye_active_checkout_order`).

---

## 2. Yêu cầu Môi trường (Prerequisites)

- **Node.js:** `>= 20.x`
- **Angular:** `>= 19.x` (Standalone Components, modern Control Flow `@if`, `@switch`, `@for`, Signals `signal`, `computed`, `output`).
- **Font chữ chuẩn thương hiệu:**
  - **Headings / Display:** `Plus Jakarta Sans` kết hợp fallback `Sora`, `system-ui`, `sans-serif` (được cấu hình qua token `--font-display`).
  - **Body text:** `Inter`, `system-ui`, `sans-serif` (kích thước chuẩn $\ge$ 16px, cấu hình qua token `--font-body`).
- **Google Material Symbols Outlined** (đã nhúng trong `src/index.html`).

---

## 3. Cấu trúc Thư mục Đã Tái Cấu Trúc (Directory Structure)

```
src/app/features/checkout/
├── checkout.ts                    # Root Orchestrator Standalone Component
├── checkout.html                  # Template Orchestrator (~50 dòng, điều khiển @switch)
├── checkout.scss                  # Layout container & Toast notifications
├── checkout.types.ts              # Common types (CheckoutStep)
├── checkout.routes.ts             # Route definition (/checkout)
├── components/                    # Modular Sub-components độc lập
│   ├── stepper/                   # Tiến trình 3 bước chuẩn TMĐT (loại bỏ Breadcrumb)
│   │   └── checkout-stepper.ts
│   ├── address-modal/             # Modal thay đổi địa chỉ nhận hàng 6 trường validated
│   │   └── address-modal.ts
│   ├── form/                      # Màn 1: Điền thông tin, nhóm Ví điện tử 3 cổng, Sidebar
│   │   ├── checkout-form.ts
│   │   ├── checkout-form.html
│   │   └── checkout-form.scss
│   ├── processing/                # Màn 2: Cổng SafePay Mascot căn giữa, thanh tiến trình
│   │   ├── checkout-processing.ts
│   │   ├── checkout-processing.html
│   │   └── checkout-processing.scss
│   ├── success/                   # Màn 3: Đơn hàng thành công, quy trình in UV 4 bước
│   │   ├── checkout-success.ts
│   │   ├── checkout-success.html
│   │   └── checkout-success.scss
│   ├── failed/                    # Màn 4: Gián đoạn, countdown 15:00, đổi ví trên cùng đơn
│   │   ├── checkout-failed.ts
│   │   ├── checkout-failed.html
│   │   └── checkout-failed.scss
│   └── dev-dock/                  # Nút icon nổi góc phải dưới & bảng popover giả lập demo
│       └── dev-dock.ts
├── models/
│   └── checkout.model.ts          # Models, 4 nhóm trạng thái tách biệt, E-Wallet options
└── services/
    └── checkout.service.ts        # Service quản lý trạng thái tập trung & Session persistence
```

---

## 4. Mô hình Dữ liệu Độc lập & SSOT (Data Models)

Định nghĩa tại `src/app/features/checkout/models/checkout.model.ts`:

### 4 nhóm trạng thái nghiệp vụ tách biệt:
```typescript
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'interrupted';
export type ProductionStatus = 'not_started' | 'printing' | 'qc' | 'packaging' | 'completed';
export type ShippingStatus = 'pending' | 'preparing' | 'shipping' | 'delivered';
```

### Phương thức thanh toán mở rộng:
```typescript
export type PaymentMethodType = 'vietqr' | 'e_wallet' | 'card' | 'cod';
export type EWalletProvider = 'momo' | 'zalopay' | 'shopeepay';
```

---

## 5. Hướng dẫn Tích hợp Chi tiết (Integration Guide)

### 5.1. Điểm khởi đầu Điều hướng (Routing Entry Point)
Route được cấu hình lười (lazy-loaded) trong hệ thống routing của ứng dụng:

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  // ...
  {
    path: 'checkout',
    loadChildren: () => import('./features/checkout/checkout.routes').then(m => m.CHECKOUT_ROUTES)
  }
];
```

### 5.2. Điểm kết nối Dữ liệu (Service Entry Point)
Team tích hợp inject `CheckoutService` để thiết lập dữ liệu trước khi chuyển trang:

```typescript
import { inject } from '@angular/core';
import { CheckoutService } from './features/checkout/services/checkout.service';
import { Router } from '@angular/router';

export class CartComponent {
  private checkoutService = inject(CheckoutService);
  private router = inject(Router);

  proceedToCheckout(cartItems: any[]) {
    // 1. Cập nhật danh sách sản phẩm
    this.checkoutService.setCartItems(cartItems);

    // 2. Chuyển hướng sang trang checkout
    this.router.navigate(['/checkout']);
  }
}
```

### 5.3. Luồng nạp dữ liệu từ Giỏ hàng (Cart to Checkout)
Khi bấm "Tiến hành Đặt hàng", gọi phương thức `setCartItems(items)` trên `CheckoutService`. Nếu có voucher hoặc địa chỉ đã lưu của khách hàng, nạp qua `applyVoucher()` và `updateAddress()`.

### 5.4. Lắng nghe và Nhận kết quả Đơn hàng
Các component hoặc trang tài khoản có thể lắng nghe `activeOrder()` từ `CheckoutService`:

```typescript
const currentOrder = this.checkoutService.activeOrder();
console.log('Mã đơn hàng:', currentOrder?.orderCode);
console.log('Trạng thái thanh toán:', currentOrder?.paymentStatus);
```

---

## 6. Ví dụ Sử dụng Chi tiết (Usage Example)

```typescript
import { Component, inject } from '@angular/core';
import { CheckoutService } from './features/checkout/services/checkout.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  template: `
    <button (click)="handleCheckout()" class="btn-checkout">
      Thanh toán ngay ({{ checkoutService.formatCurrency(checkoutService.totalAmount()) }})
    </button>
  `
})
export class CartDrawerComponent {
  readonly checkoutService = inject(CheckoutService);
  private readonly router = inject(Router);

  handleCheckout(): void {
    // Khởi tạo đơn hàng từ giỏ hàng hiện tại
    this.checkoutService.createNewOrder();
    this.router.navigate(['/checkout'], { queryParams: { step: 'form' } });
  }
}
```

---

## 7. Ánh xạ Cơ sở dữ liệu Supabase (Database Schema Mapping)

| Bảng Supabase | Trường trong `CheckoutOrder` | Ghi chú |
|---|---|---|
| `orders` | `id`, `orderCode`, `totalAmount`, `orderStatus`, `paymentStatus`, `paymentMethod`, `eWalletProvider` | Khóa chính `id`, mã hiển thị `CE-89421` |
| `order_items` | `items[]` (`name`, `device`, `material`, `price`, `quantity`, `imageUrl`) | Danh sách ốp lưng in UV |
| `shipping_addresses` | `address` (`fullName`, `phone`, `streetAddress`, `city`, `district`, `ward`) | Địa chỉ nhận hàng 6 trường validated |
| `payment_transactions` | `transactionId`, `paymentStatus`, `paymentTimestamp` | Mã giao dịch `TXN-CEY98241` |

---

## 8. Bộ công cụ Kiểm thử Dev Dock (Floating Dev Controls)

Nhằm phục vụ quá trình chấm điểm và demo kịch bản cho giảng viên:
- **Vị trí:** Nút tròn nổi tối giản cố định góc phải dưới màn hình.
- **Tính năng:**
  1. **Chuyển nhanh màn hình:** Nhảy trực tiếp giữa 4 bước (Form $\rightarrow$ Đối soát $\rightarrow$ Thành công $\rightarrow$ Gián đoạn).
  2. **3 Chế độ mô phỏng đối soát:**
     - `Ngẫu nhiên (80/20)`: 80% thành công, 20% gián đoạn.
     - `Luôn thành công`: Đảm bảo 100% qua màn hoàn tất.
     - `Luôn gián đoạn`: Demo kịch bản lỗi thanh toán và bảo lưu giỏ hàng.
  3. **Can thiệp tức thì (Force Outcome):** Nút "Thành công ngay", "Gián đoạn ngay", "Hết hạn giữ chỗ 00:00".

---

## 9. Các Quy tắc Nghiệp vụ Đặc thù (Business Rules)

1. **Khóa phương thức COD cho ốp Custom:** Sản phẩm in UV cá nhân hóa bắt buộc thanh toán trước 100% để xưởng lên khuôn in độc bản. Lựa chọn COD bị disable kèm tooltip giải thích lý do.
2. **Loại bỏ hoàn toàn Breadcrumb:** Thanh tiến trình sử dụng Tracker 3 bước (Giỏ hàng $\rightarrow$ Thanh toán $\rightarrow$ Hoàn tất) chuẩn TMĐT, không cho phép khách click nhảy cóc.
3. **Biểu tượng SafePay:** Ở màn 2, biểu tượng trung tâm chỉ chứa đôi mắt linh vật Mascot phát sáng căn giữa hoàn hảo, không có chữ hay thanh nhãn bên dưới.
4. **Nhóm Ví Điện Tử:** Hỗ trợ đầy đủ MoMo, ZaloPay, ShopeePay với thương hiệu nhận diện rõ ràng.
