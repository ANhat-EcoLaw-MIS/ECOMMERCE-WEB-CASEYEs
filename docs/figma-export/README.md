# Đưa giao diện CasEYE's lên Figma

> **File Figma chính (16/11/2026):** https://www.figma.com/design/unvcMywk7ZbniRPCXhoCLy (team **WEB**, gói Student, tài khoản edu)
> - **UI — Desktop**: 7 màn 1440px, **layer chỉnh sửa được** (frame/text/vector/auto-layout), import bằng `html_to_figma` từ `html/*--desktop.html`.
> - **UI — Mobile**: 7 màn 390px, làm giống bản desktop.
> - **Components**: Header/Desktop, Header/Mobile, Footer/Desktop, Footer/Mobile, Card/Product, Card/Template, Search bar, Button/Primary, Chip (variant State=Active|Default), Chat support button.
>   Trong các màn đã thay bằng instance: Footer + nút chat ở mọi màn desktop; Header desktop ở Shop và Chi tiết sản phẩm (các màn khác giữ bản gốc vì mục nav đang active khác nhau); Header + Footer ở mọi màn mobile. Card sản phẩm trong grid vẫn là layer thường, chưa đổi sang instance.
> - **Tokens**: bảng token dạng layer. **Variables**: Color (48), Dimension (11), Typography (2), kèm effect style `shadow/soft|lift|glow`.
> - Font `Liberation Mono` (chữ "Ctrl K") không có trên Figma nên được thay bằng `Cousine`.
>
> File cũ ở tài khoản cá nhân (https://www.figma.com/design/z5o1Shk2qFJ0Zp1l6Q8HzZ) làm dở vì gói Starter hết lượt MCP. Có thể xoá.
>
> **Cách tạo HTML:** `tools/snap.mjs` mở từng trang trong Chrome headless qua CDP. `tools/snap-inpage.js` inline style đã tính (đã áp media query), dựng lại `::before/::after`, thu nhỏ ảnh về 2× kích thước hiển thị rồi nhúng base64, bỏ script và stylesheet.
> Chạy lại (cần `ng serve` ở cổng 4200): `node docs/figma-export/tools/snap.mjs docs/figma-export/html [id,id]`.

Ngày tạo: 16/11/2026. Ảnh chụp từ `ng serve` (localhost:4200), nhánh `integration/local`.

## 1. Trạng thái Figma MCP trong Claude

- Session hiện tại **chưa có Figma MCP**: không nạp sẵn, không ở dạng deferred, cũng chưa kết nối trong Connectors.
- MCP registry có **Figma** chính thức (remote): `https://mcp.figma.com/mcp`.

### Kết nối

**Claude desktop (khuyến nghị):** Settings → Connectors → tìm **Figma** → Connect → đăng nhập Figma trong cửa sổ OAuth (bạn tự đăng nhập). Sau đó mở session mới, hoặc bật connector cho session đang dùng.

**Claude Code trong terminal:**

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

Sau đó gõ `/mcp` trong `claude`, chọn figma và đăng nhập.

### Server chính thức làm được gì

| Việc | Được không | Tool |
|---|---|---|
| Đọc frame/selection để sinh code | Được | `get_design_context`, `get_metadata`, `get_screenshot` |
| Đọc biến/token của file | Được | `get_variable_defs` |
| Code Connect, rules cho design system | Được | `get_code_connect_map`, `create_design_system_rules` |
| Vẽ sơ đồ lên FigJam | Được | `generate_diagram` |
| Tạo frame/layer trên canvas Figma Design | **Hạn chế** | Từ 2026 Figma có thêm tính năng chụp UI đang chạy thành layer chỉnh sửa được (`generate_figma_design`, "code to canvas"). Kết nối xong, kiểm tra danh sách tool có tool này không. Nếu không có thì MCP chỉ đọc. |

Kết luận: luồng chính của MCP là **Figma → code**. Đừng trông vào MCP để ghi token hay frame tùy ý lên canvas.

## 2. Cách thay thế (làm được ngay, không cần MCP)

### A. html.to.design: layer chỉnh sửa được (khuyến nghị)
1. Cài plugin **html.to.design** trong Figma, và **extension Chrome** của nó.
2. Plugin nhập theo URL thì không vào được `localhost`. Hãy dùng **extension Chrome**: mở từng trang ở `http://localhost:4200`, bấm extension, chọn viewport Desktop 1440 / Mobile 390, rồi tải file `.h2d` về.
3. Trong Figma: plugin → Import file `.h2d`. Mỗi lần import ra 1 frame.
4. Theo dõi đơn (`/order-tracking`) và Admin đơn hàng (`/admin/order-tracking`) cần đăng nhập. Bạn đăng nhập trong Chrome trước rồi chụp bằng extension, vì extension dùng phiên đăng nhập của bạn.

### B. Ảnh chụp + token: nhanh, chỉ để tham chiếu
1. Tạo page **Screens**. Kéo các PNG trong `screens/` vào. Chọn từng ảnh → Frame selection (Ctrl+Alt+G), đặt tên frame theo tên file.
2. Tạo page **Tokens**. Kéo `screens/00-tokens.png` vào, hoặc import `tokens.html` bằng html.to.design để có layer thật.
3. Tạo Variables: dùng plugin **Tokens Studio** (Load from file → `tokens.json`, định dạng W3C DTCG) rồi Export to Figma Variables. Hoặc dùng plugin "Variables Import" nhận JSON DTCG.

## 3. Các file trong thư mục này

| File | Nội dung |
|---|---|
| `screens/00-tokens.png` | Trang token (màu, gradient, chữ, bo góc, khoảng cách, đổ bóng) |
| `screens/01-trang-chu--{desktop,mobile}.png` | Trang chủ `/` |
| `screens/02-shop--*.png` | Shop `/shop` |
| `screens/03-chi-tiet-san-pham--*.png` | Chi tiết sản phẩm `/shop/lilac-dream` |
| `screens/04-design-studio-kho-mau--*.png` | Kho mẫu Design Studio `/design-studio/templates` |
| `screens/05-lop-phu-tim-kiem--*.png` | Lớp phủ Tìm kiếm (Ctrl+K), chụp trong khung nhìn |
| `screens/06-trang-tim-kiem--*.png` | Trang kết quả `/tim-kiem?q=tím` |
| `screens/07-chinh-sach-don-hang--*.png` | Chính sách đơn hàng `/order-tracking/chinh-sach` (trang công khai của Order Tracking) |
| `tokens.json` | Token dạng W3C DTCG: 48 màu, 9 spacing, 2 radius, 3 shadow, 4 gradient, 2 font |
| `tokens.html` | Bảng token xem được trong trình duyệt, import được bằng html.to.design |

Desktop rộng 1440px (DPR 1). Mobile rộng 390px (DPR 2, ảnh rộng 780px; khi đặt vào Figma, chỉnh frame về 390).

### Chưa chụp được
- **Theo dõi đơn** `/order-tracking` (customerGuard) và **Admin đơn hàng** `/admin/order-tracking` (roleGuard): cần đăng nhập Supabase. Claude không nhập mật khẩu thay bạn, nên hãy dùng cách A bước 4.
- Lớp phủ Tìm kiếm bản desktop: cột "Mẫu đang hot" còn trống lúc chụp vì dữ liệu chưa tải kịp. Bản mobile thì có.

Token lấy từ `src/styles/tokens.css` (khối `@theme` của Tailwind v4 và các gradient trong `:root`), file này được import trong `src/styles.scss`. Trong code không có token cỡ chữ riêng. Các cỡ chữ trên trang token lấy theo cách dùng thực tế (hero 56px, tiêu đề 32px, body 16px).
