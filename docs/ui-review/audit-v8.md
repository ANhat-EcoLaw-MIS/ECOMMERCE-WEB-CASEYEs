# Audit Quản lý đơn hàng so với v8 (06/11/2026)

Phạm vi: `src/app/features/order-tracking/**` trên nhánh `feature/order-tracking` (commit `dedd706`). Đây chỉ là audit, chưa sửa code.
Ký hiệu: **Đạt**, **Lệch** (có nhưng sai v8), **Thiếu** (chưa có). Đường dẫn file tính từ thư mục `order-tracking/`.

## P0 – Logic v8

| Mục | Hiện trạng trong code | KQ | File liên quan |
|---|---|---|---|
| P0-1 Hai loại SP, bỏ từ cấm | Còn chữ "Thiết kế riêng" trên thẻ/chi tiết đơn, "Demo Console – Epic 5", "Epic 6" trong UI và comment, "Giao nhanh", Z1–Z3, freeship. Docs chung của team (`docs/angular_project_conventions_skills.md`: "one folder per epic") không thuộc module này | Lệch | order-card.html, order-detail.html, demo-console.*, integrations.ts, delivery-config.ts, order-policy.ts, model + mọi comment "Epic" |
| P0-2 Mọi đơn custom vào duyệt bản thiết kế ngay | Chỉ đơn có ảnh mới cần duyệt (`requiresModeration`); Job 0 chờ 30 phút; duyệt xong nhảy thẳng `In_Production` | Lệch | order-tracking.service.ts (`receiveHandoff`, `moderateDesign`), scheduled-jobs.ts (job0), state-machine.ts |
| P0-3 Hủy COD trong thời gian đổi ý | Cửa sổ 30 phút đang áp cho **mọi** đơn (kể cả trả trước); chưa có `confirmDueAt`/`confirmedAt`; thông báo race chưa đúng câu v8 | Lệch | order-rules.ts (`canCustomerCancel`), cancel-dialog.*, service `cancelOrder` |
| P0-4 Yêu cầu hủy đơn (trả trước) qua CSKH | Chưa có `CancelRequest`, chưa tạm giữ, chưa làm mờ tiến trình, chưa có rút lại hay SLA | Thiếu | model, service, order-detail.*, order-timeline.*, chốt mẻ/duyệt phải bỏ qua đơn đang giữ |
| P0-5 Hủy & hoàn khi thiết kế bị từ chối | Đã có nút "Hủy đơn & nhận hoàn tiền", hoàn 100% (S2) | Đạt | cancel-dialog (mode `rejected`) |
| P0-6 Khối "Tiến độ hoàn tiền" dùng chung | Có thẻ "Hoàn tiền" với nhãn trạng thái và form tài khoản, nhưng chưa phải dạng các bước (stepper), chưa hiện ngày hoàn | Lệch | order-detail.html (phần refund) |
| P0-7 Chỉ Standard + Hỏa tốc; bỏ phí/vùng | Đang có 3 vùng × Standard/Giao nhanh, freeship 349k; phí tính trong module | Lệch | delivery-config.ts, shipping-fee.ts, model (`zone`, `ShippingTier`), handoff, demo factory, order-detail, policy |
| P0-8 EDD v8 + 3 test | Hàm EDD đúng 2 test Standard; chưa có Hỏa tốc (14:00); số ngày vận chuyển đang lấy từ bảng vùng thay vì tham số | Lệch | edd.ts, edd.spec.ts |
| P0-9 Vai trò CSKH trong Console | Chỉ có Operator/Admin; kết quả khiếu nại hiện cho mọi vai trò; nút 3PL không phân quyền | Thiếu | demo-console.*, demo-settings.ts |

## P1 – Giao diện

| Mục | Hiện trạng | KQ | File |
|---|---|---|---|
| P1-1 Tab sticky, số đếm, chấm đỏ, `?tab=` | Có tab và số đếm, cuộn ngang; **chưa sticky**, chưa chấm đỏ cho "Cần xử lý", chưa lưu vào URL, chưa scroll-snap | Lệch | order-tracking.html/.ts |
| P1-2 Thẻ đơn có ảnh thật, nút chính theo trạng thái, copy mã, "+N sản phẩm" | Ảnh là mockup CSS; chỉ có nút "Xem chi tiết"; chưa có copy mã, chưa gom "và N sản phẩm khác" | Thiếu | order-card.* |
| P1-3 Tìm theo mã/tên mẫu, debounce, skeleton, trống/lỗi | Tìm theo mã, chưa debounce, chưa tô sáng; có trạng thái trống và lỗi + "Tải lại"; chưa có skeleton; nút trống là "Tiếp tục mua sắm" | Lệch | order-tracking.* |
| P1-4 Chấm đỏ ở Header | Header thuộc team (`core/layout/header`), module không được sửa | Thiếu – cần team | (điểm đồng bộ) |
| P1-5 Bố cục 2 cột / mobile 1 cột + thanh hành động fixed | Có 2 cột, cột phải sticky; thứ tự khối chưa theo 4 câu hỏi; chưa có thanh hành động cố định trên mobile; tóm tắt thanh toán chưa thu gọn được | Lệch | order-detail.html |
| P1-6 Banner "Bạn cần làm gì?" | Chưa có (đang dùng hộp thông tin ngoại lệ) | Thiếu | order-detail.html |
| P1-7 EDD chữ lớn + "Vì sao?" | Có khối EDD 3 cột; chưa có thứ trong tuần, chưa có nút "Vì sao?" mở rộng | Lệch | order-detail.html, calendar.ts |
| P1-8 Tiến trình ngang/dọc, ngày giờ mỗi bước, `::before` | Ngang ở mọi màn; chưa có ngày giờ từng bước; đường nối là div; đã có `aria-current` | Lệch | order-timeline.* |
| P1-9 Ảnh thiết kế lớn + lightbox | Chưa có | Thiếu | order-detail, (component mới) |
| P1-10 Khối "Hỗ trợ đơn hàng", pop-up hủy dạng radio, "Giữ đơn" làm nút chính | Có khối "Thao tác"; lý do là `<select>`; nút chính là "Xác nhận hủy" | Lệch | order-detail.html, cancel-dialog.* |
| P1-11 Form hoàn: dropdown ngân hàng, viết hoa không dấu, tóm tắt, `****1234` | Ngân hàng nhập tay; đã kiểm tra trùng tên người thanh toán; đã che `••••1234`; chưa có bước tóm tắt | Lệch | refund-choice-form.* |
| P1-12 "Đã nhận hàng" + "Báo sự cố" chung một khối, kèm hạn | Hai nút có nhưng chưa ghi "báo sự cố đến hết ngày dd/MM" | Lệch | order-detail.html |
| P1-13 Form sự cố: thẻ có icon, tiến trình tải, giới hạn dung lượng, hạn phản hồi | Có `<select>`, bằng chứng bắt buộc, xem trước/xóa, "Thử gửi lại"; thiếu thẻ icon, thanh tiến trình, giới hạn dung lượng, hạn phản hồi | Lệch | report-issue-dialog.* |
| P1-14 Giao lại 3 bước | Có địa chỉ, QR cước, bên chịu lỗi, hạn lưu kho theo ngày; chưa tách thành 3 bước | Lệch | redelivery-dialog.* |
| P1-15 Đánh giá dạng thẻ trong trang + thẻ chủ đề + ảnh | Hiện bằng modal bật lên, chưa có thẻ chủ đề và ảnh | Lệch | review-dialog.ts, model `Review` |
| P1-16 Chuông thông báo | Hộp thư chỉ nằm trong Console; chuông ở header thuộc team | Thiếu – cần team | (điểm đồng bộ; có thể làm danh sách thông báo trong trang đơn) |
| P1-17 Chính sách: "4 điều", mục lục, accordion, nội dung v8 | Có tóm tắt + mục lục; nội dung còn số 30 phút, bảng phí 3 vùng, Giao nhanh, "kiểm duyệt ảnh"; chưa có accordion; mục lục chưa có dropdown trên mobile | Lệch | order-policy.*, order-policy config |
| P1-18 Pop-up/tick ở Checkout | Checkout chưa có code; module mới có nội dung `POLICY_HIGHLIGHTS` + ghi PolicyConsent qua `OrderHandoff` | Thiếu – cần Thanh toán | config/order-policy.ts |

## P2 – Thu thập hành vi

| Mục | Hiện trạng | KQ |
|---|---|---|
| `track()` + `ot_events_v1` + 17 sự kiện | Chưa có | Thiếu |
| Tab "Insights" trong Console | Chưa có | Thiếu |

## Ngoài bảng, cần biết trước khi sửa
1. **Header (P1-4, P1-16)** là file của team. Đề xuất: module cung cấp một service `orderAttentionCount()` / danh sách thông báo; team gắn vào header. Trong lúc chờ, hiện danh sách thông báo ngay trong trang "Đơn hàng của tôi".
2. **Ảnh thiết kế thật (P1-2, P1-9)** cần `previewUrl` từ Design Studio. Hiện chưa có nên chỉ dùng được ảnh mẫu đặt trong `public/` (sẽ thêm vài ảnh demo, cần bạn đồng ý vì `public/` là thư mục chung).
3. **"Chỉnh sửa thiết kế / Đặt lại thiết kế này / Mua lại"** sẽ dẫn sang `/design-studio` và `/shop`, hiện là trang trống của team.
4. **Playwright và Lighthouse** chưa có trong repo. Đề xuất chụp 375/768/1280 bằng trình duyệt tích hợp (đổi kích thước khung nhìn) thay cho Playwright. Lighthouse chạy bằng `npx lighthouse` (tải tạm, không thêm vào `package.json`), cần bạn đồng ý.
5. Từ "epic" trong tài liệu chung của team (`docs/GIT_WORKFLOW.md`, conventions) không thuộc module, mình chỉ ghi vào danh sách đồng bộ.
6. Thứ tự sửa dự kiến: P0-1, P0-7/8, P0-2, P0-3, P0-4, P0-6, P0-9 → P1 theo màn (danh sách, chi tiết, hộp thoại, chính sách) → P2. Mỗi mục một commit.
