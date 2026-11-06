# Báo cáo rà soát & hoàn thiện giao diện Quản lý đơn hàng (v8)

Nhánh `feature/order-tracking`, ngày 06/11/2026. Ảnh trước/sau ở `before/` và `after/` (danh sách, chi tiết đơn "Cần chỉnh sửa thiết kế", chi tiết đơn "Đã giao", chính sách × 375/768/1280 px), chụp bằng Chrome headless (script DevTools Protocol, không thêm thư viện).

Kiểm tra: `ng build` sạch (cảnh báo còn lại thuộc code chung của team), 70/70 test đơn vị và kịch bản pass.

## Đã sửa

| Mục | Kết quả |
|---|---|
| P0-1…P0-9 | Xem commit `05ad129` và `audit-v8.md`. |
| P1-1 | Tab cố định khi cuộn, số đếm, chấm đỏ "Cần xử lý", cuộn ngang + snap, tab lưu vào `?tab=`. |
| P1-2 | Ảnh preview thiết kế, tối đa 2 sản phẩm + "và N sản phẩm khác", nút sao chép mã, 1 nút chính theo trạng thái (Xem đơn hàng / Chỉnh sửa thiết kế / Chọn cách giao lại / Đã nhận được hàng / Mua lại / Đặt lại thiết kế này). |
| P1-3 | Tìm theo mã hoặc tên mẫu, không phân biệt dấu, debounce 300 ms, tô sáng; skeleton khi tải; trạng thái trống có "Bắt đầu thiết kế ốp lưng" / "Xem sản phẩm"; lỗi có "Tải lại". |
| P1-5 | Bố cục theo 4 câu hỏi; cột phải sticky (thanh toán, hoàn tiền, hỗ trợ); mobile 1 cột, tóm tắt thanh toán thu gọn, thanh hành động cố định đáy màn hình. |
| P1-6 | Banner "Bạn cần làm gì?" (sửa thiết kế trước ngày…, chọn cách giao lại, cung cấp tài khoản hoàn). |
| P1-7 | Ngày giao dự kiến dạng "Thứ Ba 10/11 – Thứ Năm 12/11" ngay dưới trạng thái, có "Vì sao?"; Hỏa tốc "Giao trong hôm nay"; đơn đã giao hiện ngày giao thực tế. |
| P1-8 | Tiến trình dọc trên mobile, ngang từ md; đường nối bằng `::before`; ngày giờ dưới từng bước. |
| P1-9 | Ảnh thiết kế lớn, lightbox (Esc / bấm nền để đóng), nhãn "Bản thiết kế bạn đã thanh toán". |
| P1-10 | Khối "Hỗ trợ đơn hàng"; pop-up hủy: tóm tắt đơn, lý do dạng radio ("Khác" mở ô ghi chú), "Giữ đơn" là nút chính. |
| P1-11 | Danh sách ngân hàng có gợi ý tìm kiếm, số TK chỉ nhận số, tên chủ TK tự viết hoa không dấu, cảnh báo khi khác người thanh toán, dòng "Kiểm tra lại" trước khi gửi, che số `****1234`. |
| P1-12 | "Đã nhận được hàng" + "Hàng có vấn đề – Báo sự cố" cùng một khối, kèm hạn báo sự cố. |
| P1-13 | Thẻ loại sự cố có icon + ví dụ, tiến trình tải, giới hạn dung lượng, ảnh thiết kế điền sẵn, hạn CSKH phản hồi. |
| P1-14 | Giao lại 3 bước (địa chỉ → cước → xác nhận), bên chịu cước kèm lý do, hạn giữ hàng, lối "Hủy & hoàn tiền" khi đúng chính sách. |
| P1-15 | Thẻ đánh giá trong trang (không chặn màn hình): sao, thẻ chủ đề, nhận xét, ảnh. |
| P1-16 | Chuông thông báo trong trang đơn hàng (danh sách, đánh dấu đã đọc, mở đúng `/order-tracking/:mã`). |
| P1-17 | "4 điều bạn cần biết", mục lục sticky (dropdown trên mobile), accordion, neo `#id`, nội dung v8. |
| P1-18 | Component `app-policy-consent` (pop-up cho giỏ có hàng thiết kế theo yêu cầu, tick nội tuyến cho giỏ hàng có sẵn); đang dùng trong form tạo đơn của Demo Console. |
| P2 | `track()` ghi `ot_events_v1` (17 sự kiện, không dữ liệu cá nhân); Demo Console có bảng Insights. |

## Chưa làm / làm một phần (lý do)

- **P1-4 chấm đỏ ở Header** và **chuông ở Header (P1-16)**: header thuộc layout chung của team; `core/` không được import từ `features/`. Module đã có sẵn `needsAttention()` và `CustomerInbox`; cần team quyết định chuyển phần đếm sang `core/` để header dùng.
- **P1-18 tại Checkout thật**: Checkout chưa có code; component cần chuyển sang `shared/` khi Thanh toán dùng.
- **Lighthouse Accessibility ≥ 90**: chưa chạy (cần `npx lighthouse`, tải tạm gói). Đã làm: nút ≥ 44 px, `aria-current="step"`, `aria-live` cho danh sách, trạng thái có chữ + chấm (không chỉ màu), modal native `<dialog>` (focus trap + Esc).
- **"Chỉnh sửa thiết kế" / "Mua lại"** dẫn sang `/design-studio`, `/shop` (trang của team, hiện trống); nút sửa thiết kế đang mô phỏng gửi lại.
- Thứ tự lý do hủy theo tần suất thật: chờ đủ dữ liệu từ Insights.

## Điểm đồng bộ (cần team khác)

1. **Layout/Header**: gắn chấm đỏ "Đơn hàng của tôi" và chuông thông báo (đề xuất service ở `core/`).
2. **Thanh toán**: truyền `OrderHandoff.shipping` (phí, phí Standard, phụ phí Hỏa tốc, số ngày vận chuyển); dùng `app-policy-consent`; phạm vi Hỏa tốc (kể cả COD); hàng chờ Hỏa tốc COD với 3PL.
3. **CSKH & Khiếu nại**: hàng chờ "Yêu cầu hủy đơn" (đang mô phỏng trong Demo Console), kênh liên hệ ở khối Hỗ trợ (`/customer-support`).
4. **Design Studio**: `previewUrl` của bản thiết kế, cờ ảnh tải lên, danh mục ViolationGroup, trang chỉnh sửa thiết kế.
5. **Tài liệu chung**: từ "epic" trong `docs/GIT_WORKFLOW.md` và conventions (không thuộc module này).

## Điểm cần team chốt
1. `refundEtaText` (thời gian tiền về sau khi Admin xác nhận) – đang để "1–3 ngày làm việc".
2. Hạn dùng voucher thay hoàn tiền – đang dùng 30 ngày.
3. Danh mục lý do hủy cuối cùng; kênh liên hệ CSKH (hotline/form).
4. Tab "Cần xử lý": tài liệu v8 (FR-OT-03) gồm Action_Required + Delivery_Failed + Return_Requested; prompt UI ghi "yêu cầu bị từ chối". Đang theo tài liệu.
