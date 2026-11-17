# Prompt: sửa module Quản lý đơn hàng theo kết quả review độc lập (10/11/2026)

## 0. Vai trò và giới hạn

Bạn sửa module Quản lý đơn hàng & giao vận của web bán ốp lưng CasEYE's (Angular 22, Tailwind v4, dữ liệu mock trong localStorage sau lớp `OrderRepository`). Repo `E:\UEL\ECOMMERCE-WEB-CASEYEs`, nhánh `feature/order-tracking`.

- Chỉ sửa trong `src/app/features/order-tracking/**`, `public/order-tracking/`, `docs/ui-review/`, `docs/order-policy-links.md`. Không sửa `core/`, `shared/`, `styles/`, feature khác, `supabase/`. Nếu một lỗi chỉ sửa được ở file của team, dừng và báo lại.
- Nguồn sự thật nghiệp vụ: `C:\Users\admin\Downloads\BRDSRD_Quan_ly_don_hang_Giao_van_v8.docx` và `C:\Users\admin\Downloads\PROMPT_ClaudeCode_Quan_ly_don_hang_v8.md` (mục 11 thắng mọi chỗ khác). Quy ước team: `docs/SKILL.md`, `docs/GIT_WORKFLOW.md`.
- Giữ quy ước hiện có: standalone + OnPush, signals, `@if`/`@for`, logic nghiệp vụ ở `domain/` (hàm thuần) và `services/`, không import chéo feature, màu trạng thái chỉ ở `config/status-style.ts`.
- Không thêm package. Không push. Commit nhỏ, mỗi mục một commit, theo `docs/GIT_WORKFLOW.md`. Không dùng từ "Epic", "Giao nhanh", "Thiết kế riêng", Z1–Z3 ở bất kỳ đâu.
- Trả lời bằng tiếng Việt, ngắn gọn. Nếu nghiệp vụ mâu thuẫn, nêu ra thay vì tự đoán.

## 1. Hiện trạng đã kiểm chứng (không cần làm lại)

- `npx ng build` sạch (chỉ cảnh báo chung của team). `npx ng test --watch=false --include="src/app/features/order-tracking/**/*.spec.ts"`: 70/70 đạt.
- 8 kịch bản nghiệm thu đều đạt luồng chính: COD hủy trong thời gian đổi ý; COD quá hạn; yêu cầu hủy được chấp nhận và hoàn qua tài khoản; CSKH từ chối; thiết kế bị từ chối rồi hủy; Hỏa tốc trước/sau 14:00; giao thất bại rồi giao lại; đã giao, báo sự cố, đánh giá.
- Đúng và **không được làm hỏng**: máy trạng thái (`domain/state-machine.ts`), số tiền hoàn S1/S2/S3a/S3b/S3c (`domain/order-rules.ts`), EDD và 4 ví dụ FR-OT-04 (`domain/edd.ts`), webhook chống trùng và sai thứ tự, Job 1–4 chạy lại an toàn, đồng bộ 2 tab, chỉ Admin duyệt tiền, không có đồng hồ đếm ngược ở trang khách.

## 2. Việc cần sửa

Làm theo thứ tự. Mỗi mục: sửa, thêm test, chạy lại toàn bộ test.

### A. Nghiêm trọng

**A1. Đơn COD khiếu nại được hoàn tiền nhưng không tạo yêu cầu hoàn (FR-OT-16, Bảng 3.4 tình huống 4)**
- Hiện tượng: đơn COD đã `Delivered`, khách báo sự cố, CSKH chọn "C · Hoàn 100%". Đơn sang `Refunded`, trang khách ghi "Xem tiến độ hoàn tiền" nhưng `refunds = []`, và `listOpenOrders` coi đơn đã khép.
- Nguyên nhân: `refundAmountFor` trả `null` khi `paymentStatus !== 'Paid'` (`domain/order-rules.ts:142`); webhook `Delivered` không đổi `paymentStatus` của đơn COD (`services/order-tracking.service.ts:710-728`); `applyComplaintResult` không kiểm tra kết quả `withRefund` (`:824-827`).
- Hướng sửa: khi áp webhook `Delivered` cho đơn COD, đặt `paymentStatus = 'Paid'` (khách trả tiền mặt lúc nhận). Rà lại mọi chỗ dùng `isPrepaid` để phân biệt "đơn trả trước" với "đơn đã thu tiền": quyền gửi yêu cầu hủy và nhãn phương thức thanh toán phải dựa trên `paymentMethod`, còn số tiền hoàn dựa trên tiền đã thu. Đơn COD chưa giao vẫn không có gì để hoàn.
- Test: COD → Delivered → báo sự cố → Refund ⇒ có RefundRequest S4 `Pending_Approval` bằng tổng tiền, đơn vẫn "chưa khép"; COD hủy trong thời gian đổi ý và COD giao thất bại vẫn không tạo khoản hoàn.

### B. Cao

**B1. Nút "Chỉnh sửa thiết kế" tự gửi lại thiết kế (FR-OT-15, UC-OT-11)**
- Hiện tượng: bấm nút trên thẻ đơn → điều hướng `?action=edit-design` → `resubmit()` chạy ngay, trừ 1 trong 2 lượt. Tải lại trang còn query đó thì trừ tiếp.
- Vị trí: `order-detail/order-detail.ts:224-247` (effect deep link, `runIntent`), `domain/actions.ts:29`.
- Hướng sửa: intent `edit-design` chỉ cuộn tới hộp "Thiết kế cần chỉnh sửa". Việc gửi lại (mô phỏng, vì Design Studio chưa có trang sửa) phải qua một hộp xác nhận ghi rõ "Bạn còn N lượt gửi lại" và chỉ chạy khi khách bấm xác nhận. Sau khi xử lý một intent, xóa `action` khỏi URL (`router.navigate([], { queryParams: { action: null }, queryParamsHandling: 'merge', replaceUrl: true })`). Áp dụng việc xóa query cho mọi intent.
- Test: hàm thuần quyết định intent nào được tự chạy; `resubmitDesign` chỉ được gọi từ hành động xác nhận.

**B2. Ngày giao dự kiến cũ hiện ở trạng thái ngoại lệ (FR-OT-04, UC-OT-01 5.1)**
- Hiện tượng: đơn đã giao 11/11, sau khi báo sự cố vẫn hiện "Dự kiến giao 12/11 – 14/11". Đơn "Cần chỉnh sửa thiết kế" cũng hiện ngày giao cũ.
- Vị trí: `order-detail/order-detail.ts:192` (`showEdd`).
- Hướng sửa: ẩn khối khi `Action_Required` và `Return_Requested`. Đưa điều kiện này thành hàm thuần trong `domain/` và test.

**B3. Lịch sử đơn của khách lộ từ nội bộ**
- Hiện tượng: khách thấy "Chốt mẻ 11/11 – nhóm Samsung Galaxy S24", "QC đạt, đóng gói xong", "In lại do lỗi QC, vào mẻ kế tiếp (+1 ngày làm việc EDD)", "Duyệt bản thiết kế vòng 1, chờ chốt mẻ", "Khách hủy đơn: …", "Khách gửi yêu cầu hủy đơn: …", "(ngày giao dự kiến lùi 1 ngày làm việc)" viết kiểu nội bộ.
- Vị trí: các chuỗi `reason` trong `services/order-tracking.service.ts` (ví dụ `:251`, `:283`, `:343`, `:554`, `:603`, `:625`, `:642`) và `services/scheduled-jobs.ts`; hiển thị ở `order-detail/order-detail.html:213-222`.
- Hướng sửa: giữ `reason` cho nhật ký nội bộ (Console). Thêm hàm thuần trong `domain/` ánh xạ mỗi dòng log sang câu cho khách, dựa trên `from`, `to`, `actorType` và một mã sự kiện (thêm trường `kind` vào `OrderStatusLog` nếu cần). Câu cho khách dùng ngôi "Bạn", từ TMĐT thông thường: "Thiết kế đã được duyệt", "Đơn bắt đầu được in", "Đã đóng gói", "Sản phẩm được in lại để đảm bảo chất lượng", "Bạn đã hủy đơn", "Bạn đã gửi yêu cầu hủy đơn". Không có "mẻ", "QC", "EDD", "vòng", "Khách".
- Kiểm thêm: chữ "Admin" trong toast và trang chính sách ("chờ Admin xác nhận") đổi thành "shop".

### C. Trung bình

**C1. Giao lại ghi đè hạn giao gốc (FR-OT-18, EX-14)**
- `requestRedelivery` ghi đè `latestEDD` (`services/order-tracking.service.ts:479-493`), nên lỗi vận chuyển + giao lại làm khách mất quyền voucher giao trễ.
- Hướng sửa: thêm trường lưu hạn cam kết gốc (ví dụ `guaranteeLatestEDD`), đặt một lần lúc tạo đơn. `maybeIssueLateVoucher` so với hạn gốc; ngày hiển thị cho khách vẫn là ngày mới. Hạn gốc chỉ được dời khi nguyên nhân thuộc về khách (xem C2). **Cần chủ module xác nhận trước khi làm.**

**C2. EDD không tính lại khi trễ do khách (FR-OT-18)**
- `resubmitDesign` (`:367-380`) và `withdrawCancelRequest` (`:292-306`) không đổi EDD.
- Hướng sửa: khi thiết kế được duyệt sau ít nhất một lần gửi lại, tính lại EDD từ thời điểm duyệt và dời cả hạn cam kết. Khi khách rút yêu cầu hủy, dời EDD theo số ngày làm việc đã giữ, giống nhánh CSKH từ chối trong hạn.

**C3. Vị trí khối "Tiến độ hoàn tiền" và "Hỗ trợ đơn hàng" trên mobile (FR-OT-20)**
- Trên 375px, "Tiến độ hoàn tiền" nằm ở khoảng 2000px, sau lịch sử đơn; "Hỗ trợ đơn hàng" ở cuối trang (`order-detail/order-detail.html:253-309`).
- Hướng sửa: dưới `lg`, hiển thị khối hoàn tiền ngay dưới khối yêu cầu hủy / hộp trạng thái trong thẻ đầu; đưa "Hỗ trợ đơn hàng" lên trước "Sản phẩm & bản thiết kế". Từ `lg` trở lên giữ cột phải sticky như hiện tại.

**C4. Khoản hoàn bị Admin từ chối là ngõ cụt (FR-OT-EX-13)**
- `rejectRefund` đặt `Rejected` (`:937-943`) nhưng `submitRefundAccount` chỉ nhận `Pending_Approval` và `Refund_Pending_Retry` (`:520`).
- Hướng sửa: thêm thao tác Admin "Yêu cầu khách xác nhận lại tài khoản" đưa khoản hoàn về `Pending_Approval` và xóa thông tin tài khoản, để khách nhập lại. `Rejected` chỉ dùng khi thực sự không hoàn. `refund-progress` hiển thị lý do và form nhập lại.

**C5. `markPacked` không kiểm tra trạng thái nguồn (US-OT-08 SC4)**
- `services/order-tracking.service.ts:614-628`. Chỉ chấp nhận `Pending_Confirmation` (đơn chỉ hàng có sẵn, đã xác nhận) và `In_Production`; còn lại trả lỗi "Thao tác vi phạm luồng tuần tự của trạng thái đơn hàng".

**C6. Thiếu kiểm tra vai trò ở service (FR-OT-06)**
- `moderateDesign` (`:528`), `closeBatch` (`:579`), `markPacked`, `markQcReprint` chỉ cho `Operator`; `applyComplaintResult` (`:797`), `resolveDispute` (`:841`) chỉ cho `CustomerService`. Làm giống `refundOp` (`:985`).

**C7. Bố cục Demo Console**
- Ở 1280px cột phải trống khoảng 900px khi chưa chọn đơn; danh sách đơn nằm dưới đồng hồ và form tạo đơn; thẻ "Hộp thư" bị kéo cao 878px dù rỗng (`demo-console/demo-console.html:32-146`, `:350`, `:398`).
- Hướng sửa: hàng 1 gồm đồng hồ (hẹp) và form tạo đơn (rộng) nằm ngang; hàng 2 gồm danh sách đơn (trái) và thẻ thao tác của đơn (phải, hiện thông báo "Chọn một đơn để thao tác" khi chưa chọn); nhật ký thao tác nằm dưới thẻ thao tác; thêm `items-start` cho lưới để thẻ không bị kéo dãn. Dùng `TONE_CLASSES` thay 13 chỗ màu viết thẳng.
- Hiển thị lý do yêu cầu hủy bằng nhãn tiếng Việt thay vì mã (`Changed_Mind`).

**C8. Tài liệu bị thiếu**
- Comment trong code trỏ tới `docs/order-management-migration.sql` và các giả định A-01, A-02, A-04, A-07 (`models/order-tracking.model.ts:4`, `services/order.repository.ts:12`, `domain/edd.ts:55`, `domain/shipping-fee.ts:8`, `domain/state-machine.ts:6`, `config/delivery-config.ts:27`). Hai file không tồn tại.
- Hướng sửa: viết `docs/ui-review/assumptions-v8.md` liệt kê từng giả định kèm lý do. Với migration: hoặc viết file SQL đề xuất đặt trong `docs/ui-review/`, hoặc sửa comment cho đúng. Hỏi chủ module chọn cách nào.

### D. Thấp

- **D1.** Form yêu cầu hủy (đơn trả trước) dùng danh sách lý do của COD. Theo UC-OT-12: Đổi ý / Đặt nhầm dòng máy hoặc mẫu / Muốn đổi thiết kế / Sai địa chỉ / Khác. COD giữ: Phí ship cao / Đổi ý / Đặt nhầm dòng máy / Sai địa chỉ / Khác. Chọn "Khác" thì bắt buộc ghi chú. (`config/delivery-config.ts:65`, `components/cancel-dialog/cancel-dialog.ts:26`)
- **D2.** Đơn COD giao thất bại do vận chuyển/shop hiện "Hủy đơn & hoàn 100%" và "Hủy & hoàn tiền thay vì giao lại". Đơn chưa thu tiền chỉ ghi "Hủy đơn". (`order-detail/order-detail.html:110`, `components/redelivery-dialog/redelivery-dialog.html:72`)
- **D3.** Vùng bấm dưới 44px: nút sao chép mã đơn 36px, "Vì sao?" 36px (`order-detail.html:50`), "Xem chi tiết" ở trang chính sách 36px, link "Xem chính sách đơn hàng" cao 16px (`order-detail.html:293`), link chính sách cuối danh sách 38px.
- **D4.** Giỏ có hàng thiết kế: lần tick đầu phải mở pop-up 4–5 ý, đồng ý trong pop-up mới tính là tick (`components/policy-consent/policy-consent.html:3-7`).
- **D5.** Dòng kết quả yêu cầu hủy cũ ("Bạn đã rút lại yêu cầu hủy…") hiện mãi, kể cả khi đơn đã hủy vì lý do khác. Chỉ hiện khi đơn còn ở `Pending_Review` / `Pending_Confirmation`; sau đó chỉ còn trong lịch sử đơn.
- **D6.** Hỏa tốc ghi "Giao trong hôm nay" theo ngày xác nhận; sang ngày khác phải ghi "Dự kiến giao" kèm ngày (`order-detail.ts:198-201`).
- **D7.** Mốc "Hoàn thành" trên thanh tiến trình lấy giờ quay lại `Delivered` sau khiếu nại; phải lấy `deliveredAt` (`domain/timeline.ts:129-133`).
- **D8.** Ảnh sản phẩm trong chi tiết đơn cao khoảng 200px làm mỗi dòng trống nhiều. Giảm còn `w-14`/`w-16`, giữ nút phóng to.
- **D9.** `reportIssue` gọi `createTicket` trước khi kiểm tra điều kiện (`:416-426`). Kiểm tra điều kiện trước, tạo ticket sau.
- **D10.** `LocalStorageOrderRepository.read()` chỉ kiểm tra `version` (`services/order.repository.ts:96`). Thêm kiểm tra tối thiểu: `orders` là mảng, mỗi đơn có `id`, `orderCode`, `status` hợp lệ và các mảng con; bản ghi hỏng thì bỏ qua thay vì làm sập trang.
- **D11.** Sửa `docs/ui-review/report-v8.md`: câu "nút ≥ 44 px" cho đúng thực tế sau khi sửa D3; ghi rõ hành vi nút sửa thiết kế sau B1.
- **D12.** Xóa khỏi nhánh: thư mục `draft/` và file rỗng `order-tracking-readme.md` ở gốc repo. **Hỏi chủ module trước khi xóa.**

## 3. Quyết định cần chủ module chốt trước khi làm

1. C1: voucher giao trễ xét theo hạn gốc hay hạn sau khi giao lại?
2. Voucher thay tiền hoàn (store credit) có hết hạn sau 30 ngày như hiện tại không?
3. Khách có được gửi lại yêu cầu hủy không giới hạn sau khi rút hoặc bị từ chối?
4. Đơn `Refunded` nhưng Admin chưa chuyển tiền: nhãn khách thấy vẫn là "Đã hoàn tiền" hay "Đang hoàn tiền"?
5. Đơn hủy sau khi yêu cầu hủy được chấp nhận: ẩn thanh tiến trình (UC-OT-01, hiện tại) hay giữ mờ (FR-OT-20)?
6. C8: viết file SQL đề xuất hay chỉ sửa comment?
7. D12: xóa `draft/` và `order-tracking-readme.md`?

Chưa có câu trả lời thì làm phần không phụ thuộc và ghi lại lựa chọn tạm trong `assumptions-v8.md`.

## 4. Không thuộc phạm vi (chỉ ghi vào "điểm cần bàn với team")

- Header của team làm trang tràn ngang: `src/app/core/layout/header/header.html:103` (50px ở 1280px, 11px ở 375px).
- `supabase/migrations/20261105055948_enums.sql`: `order_status` chỉ có 5 giá trị, lệch 12 trạng thái của module. `20261105060224_orders.sql` thiếu EDD, gói giao, `confirmDueAt`, khoản hoàn, người thực hiện trong lịch sử. `20261105060407_rpc_orders.sql`: `cancel_order` cho hủy mọi đơn `pending`, trái FR-OT-05 và FR-OT-19.
- Sai lệch trong BRD và sơ đồ (Use Case vẽ lặp use case con; BPMN thiếu Job 4, thiếu "Rút lại yêu cầu", thiếu bước khách chọn cách nhận hoàn; Class Diagram thiếu `PolicyConsent`, `Voucher`, `paymentTxnRef`; Bảng 3.3 có 7 nguyên nhân nhưng UC-OT-07 và enum chỉ có 6): chủ module tự sửa tài liệu.

## 5. Tiêu chí hoàn thành

1. `npx ng build` sạch; toàn bộ test cũ và mới đạt.
2. Test mới tối thiểu: A1, B1, B2, B3 (không còn "mẻ", "QC", "EDD", "Khách" trong câu cho khách), C1/C2 nếu được chốt, C4, C5, C6, D1, D7, D10.
3. Chạy lại bằng 2 tab (`/order-tracking/demo?demo=1` và `/order-tracking`): 8 kịch bản vẫn đạt, cộng thêm kịch bản COD → đã giao → khiếu nại → hoàn 100% → Admin chuyển khoản.
4. 375 / 768 / 1280px: không phần tử nào của module tràn ngang; mọi nút và link trong module cao tối thiểu 44px.
5. Không lộ `Pending_*`, `Action_Required`, "Epic", "Giao nhanh", "mẻ", "QC", "EDD" ở trang khách.
6. Cập nhật `docs/ui-review/report-v8.md` và `docs/ui-review/huong-dan-su-dung.md` theo hành vi mới.
7. Báo cáo cuối: đã sửa gì (kèm commit), chưa sửa gì và vì sao, giả định đã dùng.

## 6. Cách chạy

```
npx ng build
npx ng test --watch=false --include="src/app/features/order-tracking/**/*.spec.ts"
npm start
```

Mở `http://localhost:4200/order-tracking/demo?demo=1` trước, rồi `http://localhost:4200/order-tracking`. Dữ liệu ở localStorage khóa `casecraft.ot.db.v2`; nút "Xóa dữ liệu demo" và "Về giờ thật" ở Console.
