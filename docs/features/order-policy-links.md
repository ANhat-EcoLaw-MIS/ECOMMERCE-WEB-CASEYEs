# Link tới Chính sách đơn hàng (cho Giỏ hàng / Thanh toán)

Trang chính sách thuộc module Quản lý đơn hàng, ai cũng mở được, không cần đăng nhập:

```
/order-tracking/chinh-sach
```

## Cách gắn link trong component của bạn

Chỉ cần một `routerLink`, không import gì từ `features/order-tracking` (giữ đúng quy tắc không import chéo feature):

```ts
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  // ...
})
```

```html
<!-- cả trang -->
<a routerLink="/order-tracking/chinh-sach">Chính sách đơn hàng</a>

<!-- mở thẳng một mục: trang tự mở mục đó và cuộn tới -->
<a routerLink="/order-tracking/chinh-sach" fragment="hoan-tien">Điều kiện hoàn tiền</a>

<!-- mở tab mới để khách không rời giỏ hàng -->
<a routerLink="/order-tracking/chinh-sach" fragment="huy-don" target="_blank" rel="noopener">Cách hủy đơn</a>
```

## Mã các mục (`fragment`)

| fragment | Mục |
|---|---|
| `huy-don` | Hủy đơn hàng |
| `duyet-thiet-ke` | Nhân viên duyệt bản thiết kế |
| `thoi-gian` | Thời gian xử lý và giao hàng (có Hỏa tốc) |
| `giao-that-bai` | Giao hàng không thành công |
| `su-co` | Báo sự cố, nhận hàng và hoàn tất đơn |
| `hoan-tien` | Các tình huống được hoàn tiền |
| `mau-in` | Dung sai màu in |
| `dung-han` | Bảo đảm giao đúng hạn |

## Ô tick đồng ý ở Checkout (FR-OT-17)

Module đã có sẵn component `app-policy-consent` (pop-up 4–5 ý khi giỏ có hàng thiết kế theo yêu cầu, một dòng tick khi giỏ chỉ có hàng có sẵn) và nó trả về phiên bản chính sách để lưu `PolicyConsent`. Vì các feature không được import lẫn nhau, khi Thanh toán cần dùng thì team thống nhất chuyển component này cùng nội dung tóm tắt sang `src/app/shared/` (báo bạn phụ trách Quản lý đơn hàng để chuyển, tránh conflict). Khi đặt hàng, truyền `policyVersion` và `policyAcceptedAt` vào `OrderHandoff`.

Lưu ý: link chỉ chạy trên nhánh đã có module này (sau khi `feature/order-tracking` được merge vào `develop`).
