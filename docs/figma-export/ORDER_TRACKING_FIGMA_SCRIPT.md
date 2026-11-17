# Kịch bản build màn hình Order Tracking lên Figma

Cách làm giống page **Profile**: mỗi màn là một frame. Một trang có nhiều trạng thái thì mỗi trạng thái là một frame riêng, đặt cạnh nhau.

- **File Figma:** https://www.figma.com/design/unvcMywk7ZbniRPCXhoCLy (team WEB, tài khoản edu).
- **Page mới:** `Order Tracking`.

## 0. Quy ước

| Mục | Quy ước |
|---|---|
| Tên frame | `OT/<nhóm>/<màn>--<desktop\|mobile>`, ví dụ `OT/Detail/Delivered--desktop` |
| Kích thước | Desktop 1440 × auto, Mobile 390 × auto. Trang admin chỉ cần desktop |
| Bố cục page | 5 section, mỗi section là một hàng frame: **1. Danh sách đơn · 2. Chi tiết đơn theo trạng thái · 3. Hộp thoại · 4. Điểm nối với phân hệ khác · 5. Trang nhân viên** |
| Hộp thoại | Chụp cả nền (trang chi tiết bị làm tối) để thấy ngữ cảnh. Tên frame có hậu tố `--dialog` |
| Dữ liệu mẫu | Dùng **một tài khoản khách demo** (ví dụ `khach.demo@caseyes.test`) và mã đơn cố định ở bảng 2. Không dùng tài khoản và địa chỉ thật của thành viên |
| Component cần tách sau khi import | Status badge (12 biến thể) · Order card · Timeline (4 hoặc 5 mốc × bước hiện tại) · Refund progress · Cancel request panel · Notification bell · Modal shell |

## 1. Chuẩn bị (làm 1 lần)

1. Chạy web: `npm start` (cổng 4200), nhánh `integration/local`.
2. Mở **hai cửa sổ tách phiên**. Trên cùng một trình duyệt, phiên Supabase dùng chung nên đăng nhập bên này sẽ đè bên kia.
   - Cửa sổ thường: tài khoản khách demo.
   - Cửa sổ ẩn danh hoặc profile Chrome khác: tài khoản nhân viên (role `admin` để xem được mọi vai trò).
3. **Dựng dữ liệu cho đủ trạng thái** theo bảng 2. Có hai cách:
   - **Cách A, khuyên dùng:** chạy script SQL seed. Script tạo sẵn khoảng 18 đơn ở đúng các trạng thái cho tài khoản khách demo, kể cả các trạng thái phụ thuộc thời gian (tự hoàn tất 72 giờ, giao trễ, hết hạn lưu kho). Script chưa có; mình viết khi bạn đồng ý.
   - **Cách B, thủ công:** khách đặt đơn thật qua Checkout, nhân viên đẩy trạng thái ở `/admin/order-tracking`, sự kiện vận chuyển bắn từ `/admin/order-tracking/simulator`. Các trạng thái phụ thuộc thời gian thì DB thật **không tua giờ được** (cột “Cách B” ghi ⏱).
4. **Cách chụp vào Figma**, chọn một:
   - **html.to.design** (extension Chrome): chạy trong cửa sổ đã đăng nhập, viewport 1440 rồi 390, tải file `.h2d`, sau đó import bằng plugin trong Figma. Ra layer chỉnh sửa được. Đây là cách nhóm đã dùng cho 7 màn đầu.
   - **Claude + Figma MCP** (`html_to_figma`): connector Figma trong session này **đang cần xác thực lại**. Gõ `/mcp`, chọn figma, đăng nhập bằng tài khoản edu. Vì Claude không đăng nhập thay bạn được, các màn cần đăng nhập vẫn phải chụp HTML từ Chrome của bạn. Chi tiết ở mục 6.

## 2. Bảng dữ liệu mẫu (mỗi đơn cho một hoặc nhiều frame)

| Mã đơn mẫu | Loại hàng / thanh toán | Trạng thái cần có | Cách B (thủ công) |
|---|---|---|---|
| CC-D01 | Thiết kế có ảnh tải lên, trả trước | Pending_Review | Đặt đơn custom, trả trước |
| CC-D02 | Thiết kế, trả trước | Action_Required (có lý do từ chối) | Operator → Từ chối, chọn nhóm vi phạm |
| CC-D03 | Toàn hàng có sẵn, COD | Pending_Confirmation, **còn trong 30 phút** | Đặt COD rồi chụp ngay trong 30 phút |
| CC-D04 | Thiết kế, trả trước | Pending_Confirmation (đã duyệt, chờ mẻ) | Operator → Duyệt |
| CC-D05 | Thiết kế, trả trước | Yêu cầu hủy **đang chờ** CSKH | Khách → Yêu cầu hủy |
| CC-D06 | Hỗn hợp, trả trước | In_Production | Duyệt → Chốt mẻ (Operator) |
| CC-D07 | Toàn hàng có sẵn, Hỏa tốc | Ready_for_Pickup | Đóng gói |
| CC-D08 | Thiết kế | In_Transit (có mã vận đơn) | Simulator → webhook “Đang giao” |
| CC-D09 | Thiết kế | Delivered (đang đếm 72 giờ) | Webhook “Đã giao” |
| CC-D10 | Thiết kế | Completed | Khách bấm “Đã nhận được hàng” |
| CC-D11 | Hàng có sẵn | Delivered **trễ hạn**, có voucher bồi thường | ⏱ cần seed |
| CC-D12 | Thiết kế | Delivery_Failed, lỗi vận chuyển (chọn giao lại / hoàn 100%) | Webhook thất bại, nguyên nhân phía hãng |
| CC-D13 | Hàng có sẵn, trả trước | Delivery_Failed, lỗi khách, đang lưu kho 14 ngày | Webhook thất bại, nguyên nhân phía khách |
| CC-D14 | Thiết kế | Return_Requested (phiếu đang mở) | Khách → Báo sự cố |
| CC-D15 | COD | Cancelled (không phát sinh tiền) | Khách hủy COD |
| CC-D16 | Trả trước | Cancelled + hoàn tiền **chờ khách nhập tài khoản** | CSKH chấp nhận yêu cầu hủy |
| CC-D17 | Trả trước | Cancelled + hoàn tiền **đang chuyển khoản** | Khách nhập tài khoản → Admin duyệt |
| CC-D18 | Thiết kế | Refunded (khiếu nại được hoàn, có mã đối soát) | CSKH chọn hoàn tiền → Admin ghi nhận |

## 3. Danh sách frame cần build

### Section 1: Danh sách đơn `/order-tracking` (desktop + mobile)

| Frame | Trạng thái màn | Ghi chú chụp |
|---|---|---|
| `OT/List/All` | Tab “Tất cả”, có nhiều đơn ở nhiều trạng thái | Cần ít nhất 6 đơn khác trạng thái để thấy đủ màu badge |
| `OT/List/Filtered` | Một tab lọc, ví dụ “Đang giao”, kèm tìm theo mã | Mobile: tab cuộn ngang, chụp khi tab đang active |
| `OT/List/Empty` | Chưa có đơn | Dùng tài khoản mới chưa đặt đơn |
| `OT/List/Loading` | Skeleton | Tùy chọn: chụp khi mạng chậm (DevTools → Slow 3G) |

### Section 2: Chi tiết đơn `/order-tracking/<mã>` theo trạng thái (desktop + mobile)

| Frame | Đơn | Phải thấy trên màn |
|---|---|---|
| `OT/Detail/PendingReview` | D01 | Timeline mốc 1, nhãn “Chờ duyệt thiết kế”, ảnh thiết kế, nút Yêu cầu hủy |
| `OT/Detail/ActionRequired` | D02 | Hộp lý do từ chối và nhóm vi phạm, nút Sửa và gửi lại, lựa chọn hủy hoàn 100% |
| `OT/Detail/CODConfirm` | D03 | Nút Hủy đơn (không có đồng hồ đếm ngược), timeline 4 mốc (hàng có sẵn) |
| `OT/Detail/Confirmed` | D04 | Khoảng ngày giao dự kiến, mốc Xác nhận |
| `OT/Detail/CancelRequestPending` | D05 | Khối “Yêu cầu hủy đơn” ở trên, timeline mờ, nút Rút lại yêu cầu |
| `OT/Detail/InProduction` | D06 | Mốc Đang in, đơn hỗn hợp (cả 2 loại hàng) |
| `OT/Detail/ReadyForPickup` | D07 | Mốc Đóng gói, gói Hỏa tốc |
| `OT/Detail/InTransit` | D08 | Mã vận đơn, mốc Đang giao |
| `OT/Detail/Delivered` | D09 | Nút Đã nhận được hàng, Báo sự cố, hạn 72 giờ |
| `OT/Detail/Completed` | D10 | Thẻ đánh giá, hạn báo sự cố 7 ngày |
| `OT/Detail/LateVoucher` | D11 | Thông báo giao trễ và voucher 10% |
| `OT/Detail/FailedCarrier` | D12 | Nguyên nhân phía hãng, chọn Giao lại miễn phí hoặc Hủy và hoàn 100% |
| `OT/Detail/FailedCustomer` | D13 | Lưu kho 14 ngày, giao lại có phí, khiếu nại nguyên nhân |
| `OT/Detail/ReturnRequested` | D14 | Phiếu đang mở, đồng hồ tự hoàn tất tạm dừng |
| `OT/Detail/CancelledCOD` | D15 | Lý do hủy, không có khối hoàn tiền |
| `OT/Detail/RefundNeedAccount` | D16 | Tiến độ hoàn tiền ở bước “Chờ bạn cung cấp tài khoản” |
| `OT/Detail/RefundProcessing` | D17 | Tiến độ hoàn tiền ở bước “Đang chuyển khoản” |
| `OT/Detail/Refunded` | D18 | Đã hoàn tiền, mã đối soát, lịch sử |
| `OT/Detail/NotFound` | mã sai | Thông báo không tìm thấy đơn |

### Section 3: Hộp thoại (desktop + mobile, chụp cả nền)

| Frame | Mở từ | Nội dung |
|---|---|---|
| `OT/Dialog/CancelCOD` | D03 → Hủy đơn | Chọn lý do hủy, xác nhận |
| `OT/Dialog/CancelRequest` | D04 → Yêu cầu hủy | Lý do (5 lựa chọn) và ghi chú |
| `OT/Dialog/RefundAccount` | D16 → Nhập tài khoản | Form ngân hàng, số tài khoản, chủ tài khoản (dùng số giả) |
| `OT/Dialog/ReportIssue` | D09 → Báo sự cố | Lý do, mô tả, đính kèm ảnh |
| `OT/Dialog/Redelivery` | D12 hoặc D13 → Giao lại | Xác nhận giao lại, phí (nếu lỗi do khách) |
| `OT/Dialog/Lightbox` | D01 → bấm ảnh thiết kế | Xem ảnh thiết kế phóng to |
| `OT/Dialog/Notifications` | Chuông ở header | Danh sách thông báo, chấm chưa đọc |

### Section 4: Điểm nối với phân hệ khác

| Frame | Trang | Ghi chú |
|---|---|---|
| `OT/Link/AccountOrdersTab` | `/account?tab=orders` | Tab Lịch sử mua hàng trong My Profile |
| `OT/Link/CheckoutSuccess` | Màn thành công Checkout | Có nút “Theo dõi đơn hàng” |
| `OT/Link/SearchOrderCode` | Ctrl K, gõ mã đơn | Dòng “📦 Mở đơn CC-…” trong lớp phủ tìm kiếm |
| `OT/Link/Policy` | `/order-tracking/chinh-sach` | **Đã có** (`07-chinh-sach-don-hang`), chỉ cần chuyển frame sang page này |

### Section 5: Trang nhân viên `/admin/...` (chỉ desktop 1440)

| Frame | Vai trò (đổi ở thanh trên cùng) | Hàng chờ / nội dung |
|---|---|---|
| `OT/Admin/SignIn` | — | `/admin/dang-nhap` (để trống ô mật khẩu khi chụp) |
| `OT/Admin/Op-Review` | Operator | Chờ duyệt thiết kế, mở chi tiết D01 |
| `OT/Admin/Op-RejectForm` | Operator | Form từ chối: nhóm vi phạm, lý do |
| `OT/Admin/Op-Production` | Operator | Chờ sản xuất · Đang sản xuất · Chờ bàn giao (chụp một hàng hoặc ba) |
| `OT/Admin/CS-CancelRequests` | CSKH | Yêu cầu hủy, chấp nhận / từ chối D05 |
| `OT/Admin/CS-Tickets` | CSKH | Báo sự cố D14, chọn kết quả in lại / voucher / hoàn tiền / từ chối |
| `OT/Admin/Ad-RefundApprove` | Admin | Hoàn tiền chờ duyệt |
| `OT/Admin/Ad-RefundTransfer` | Admin | Đang chuyển khoản, ô nhập mã giao dịch |
| `OT/Admin/Ad-RefundWaiting` | Admin | Chờ khách nhập tài khoản |
| `OT/Admin/Late` | bất kỳ | Hàng “Trễ hẹn” |
| `OT/Admin/AllOrders` | bất kỳ | Tất cả đơn, mở lịch sử thao tác của một đơn |
| `OT/Admin/Toast` | bất kỳ | Thông báo thành công (xanh) và lỗi “Đơn vừa được cập nhật” (đỏ) |
| `OT/Admin/Simulator` | Admin | `/admin/order-tracking/simulator`, gắn nhãn “Mô phỏng – chỉ dùng khi demo” |

**Tổng:** khoảng 34 màn khách × 2 kích thước + 13 màn admin ≈ **80 frame**.

## 4. Thứ tự build gợi ý

1. Section 2, các trạng thái chính: PendingReview, ActionRequired, CODConfirm, InTransit, Delivered, Completed, Cancelled, Refunded. Tám màn này đủ để demo luồng chính.
2. Section 1 và 3.
3. Tách component: Status badge, Order card, Timeline, Refund progress, Modal. Thay các bản trong frame bằng instance.
4. Các trạng thái ngoại lệ còn lại của Section 2.
5. Section 5 (admin), rồi Section 4.

## 5. Kiểm tra sau khi import

- Font hiển thị đúng (chữ tiêu đề Plus Jakarta Sans, chữ thường Inter); không còn ô vuông thay ký tự (emoji 📦 có thể cần thay icon).
- Mobile: chỉnh frame về rộng 390 nếu import ra 780 (ảnh DPR 2).
- Không có dữ liệu thật: email, số điện thoại, số tài khoản đều là dữ liệu giả.
- Header: dùng instance `Header/Desktop`, `Header/Mobile` đã có, bật trạng thái chuông có thông báo.

## 6. Nếu dùng Claude + Figma MCP

1. Gõ `/mcp`, đăng nhập lại connector **figma** (tài khoản edu).
2. Chụp HTML các màn cần đăng nhập. Có hai cách:
   - Bạn chạy html.to.design trong Chrome đã đăng nhập.
   - Mở Chrome với `--remote-debugging-port=9222`, tự đăng nhập, rồi chạy `tools/snap.mjs` gắn vào Chrome đó với danh sách màn ở mục 3. Script hiện chỉ chạy Chrome headless chưa đăng nhập, cần sửa để gắn vào phiên có sẵn và để bấm mở hộp thoại.
3. Claude import từng file bằng `html_to_figma` vào page `Order Tracking`, đặt tên theo mục 0 và xếp theo section.
