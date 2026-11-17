# Chương 3: các chỗ Claude tự quyết, team cần kiểm tra lại

File báo cáo: `docs/report/Chuong3_Phan_tich_thiet_ke_he_thong.docx` (69 trang).
Sơ đồ: `docs/report/diagrams/*.drawio` (31 file), ảnh PNG ở `docs/report/diagrams/png/`.

Mỗi mục ghi theo thứ tự: quyết định → lý do → ai nên kiểm.

## A. Cấu trúc chương (khác đồ án tham khảo AntGo)

| # | Quyết định | Lý do | Kiểm |
|---|---|---|---|
| A1 | Bố cục: 3.1 Tổng quan (quy ước, tác nhân, AS-IS, TO-BE, phạm vi) · 3.2 Quy trình TO-BE + BR + quy tắc theo phân hệ · 3.3 SRD (FR, NFR) · 3.4 US, UC, CD · 3.5 Dữ liệu · 3.6 Ma trận truy vết | Theo khung team gửi (3.1 và 3.5); quy tắc đặt ngay dưới BPMN để đọc liền mạch | Cả nhóm |
| A2 | **Không vẽ DFD** | Nhóm phân tích hướng đối tượng (UC + Class diagram, đúng quy ước có mã CD). DFD trùng thông tin với BPMN và ERD | **Hỏi giảng viên.** Nếu bắt buộc, Claude thêm DFD mức ngữ cảnh 1 trang |
| A3 | Thêm 3.6 Ma trận truy vết | Chứng minh mỗi tính năng sinh ra từ một nhu cầu | — |
| A4 | Thêm sơ đồ trạng thái đơn hàng (ST-OT) | 12 trạng thái khó hiểu nếu chỉ đọc bảng | — |
| A5 | Chỉ đặc tả chi tiết 12 use case cốt lõi; các UC còn lại mô tả bằng FR và user story | Giữ chương gọn (AntGo dài 135 trang, bản này 69) | Cả nhóm |

## B. Quy ước đặt tên và phạm vi

| # | Quyết định | Lý do | Kiểm |
|---|---|---|---|
| B1 | Dùng tên **CasEYE's** (bản nháp C1 ghi *CaseCraft*) | Repo, giao diện và DB đều dùng CasEYE's | **Chốt tên cho cả đồ án**; nếu đổi thì sửa C1 |
| B2 | PM hiểu là **“Trang chủ và hồ sơ cá nhân”**, không phải “quản lý trang chủ” | Code không có chức năng quản trị nội dung trang chủ. BRD của bạn làm Auth gộp “landing page, homepage, profile management”. FR-OT-03 có nhắc FR-PM-03 = tab lịch sử đơn trong My Profile | Người làm Trang chủ / Tài khoản |
| B3 | Onboarding thuộc AUTH (UC-AUTH-06), không thuộc PM | BRD Auth đặt onboarding ở US-AUTH-03 | Người làm Auth |
| B4 | Thêm phân hệ **SR – Tìm kiếm và gợi ý**; thêm mã NFR, ST, CDM, ERD | SR là function mới, chạy cho toàn site | — |
| B5 | Tác nhân trừu tượng “Nhân viên” trong UC-00 (Operator, CSKH kế thừa; Admin kế thừa cả hai) | Admin làm được mọi vai trò (migration M8) | Thy |

## C. Yêu cầu tự suy từ code (không có BRD trong máy)

Máy chỉ có BRD/SRD của Auth, Design Studio, Quản lý đơn hàng v8 và Tìm kiếm. **Không có BRD của Cửa hàng, Thanh toán, CSKH, Trang chủ/Hồ sơ.**

| # | Nội dung | Kiểm |
|---|---|---|
| C1 | BR-AUTH, FR-AUTH: viết lại từ code và UC/US của BRD Auth (BRD Auth không có bảng BR) | Người làm Auth |
| C2 | BR-PM-01..05, FR-PM-01..06 | Người làm Tài khoản |
| C3 | BR-SH-01..04, FR-SH-01..07 | Mai Anh |
| C4 | BR-P-01..05, FR-P-01..09. ⚠ BRD v8 của OT có nhắc FR-P-06, 07, 27, 40, nghĩa là BRD Thanh toán gốc có đánh số khác. **Gửi Claude BRD Thanh toán để đồng bộ mã** | Hồng Thắm |
| C5 | BR-CS-01..04, FR-CS-01..06. BRD v8 có nhắc FR-CS-06, 10 | Người làm CSKH |
| C6 | BR-DES: chỉ trích 12/15 mã gốc (bỏ 04, 11, 12 cho gọn); FR-DES gộp các mã liền nhau | Đức |
| C7 | Trạng thái FR-DES-24, 25 là **“Một phần”**: có ô xác nhận khi tải ảnh, nhưng DB chưa có bảng ContentPolicyConsent | Đức |
| C8 | UC-OT-13 “Duyệt, ghi nhận hoàn tiền (Admin)” được thêm vào 12 UC của BRD v8 | Thy |
| C9 | FR-OT-12 (gửi sự kiện Loyalty) ghi **“Chưa làm”**; Loyalty nằm ngoài phạm vi | Cả nhóm |

## D. Số liệu, quy tắc lấy theo code (có chỗ lệch giữa các phân hệ)

| # | Quyết định | Lý do / chỗ lệch | Kiểm |
|---|---|---|---|
| D1 | Phí giao: Tiêu chuẩn 25.000 đ (1–2 ngày), Hỏa tốc 45.000 đ | Lấy từ `checkout.service.ts` | Hồng Thắm |
| D2 | Hỏa tốc: giao trong ngày nếu xác nhận trước 14:00, chỉ cho hàng có sẵn | Theo BRD v8; code Checkout vẫn ghi nhãn “Hỏa tốc 24H” | Hồng Thắm đổi nhãn |
| D3 | Voucher CASEFIRST 50.000 đ, VIP30 30.000 đ ghi là **dữ liệu mẫu** | Đang viết cứng trong Checkout | — |
| D4 | Giá hàng thiết kế theo dòng máy (`phone_models.custom_price`) | DB có cột này; README Design Studio cũ ghi đồng giá 250.000 đ | Đức |
| D5 | Thêm vào giỏ **yêu cầu đăng nhập** | Đúng với code hiện tại (khác đề xuất cũ “cho thêm giỏ khi chưa đăng nhập”) | Mai Anh |
| D6 | `profiles.onboarding_status` ghi 3 giá trị pending, completed, skipped | ⚠ Migration trong repo chỉ CHECK completed, skipped, nhưng DB thật có pending (ghi chú của Nhật). **Cần đồng bộ migration** | Nhật |
| D7 | Mật khẩu ≥ 8 ký tự, có chữ và số | Regex trong `features/auth/auth.ts` | — |
| D8 | Đăng nhập Google, cổng thanh toán, đơn vị vận chuyển, email ghi **“Mô phỏng”**; form khiếu nại trang Hỗ trợ ghi **“bản xem thử”** | Đúng với code | Cả nhóm |

## E. Thiết kế dữ liệu

| # | Quyết định | Lý do | Kiểm |
|---|---|---|---|
| E1 | Viết “thiết kế theo **3NF, có 2 nhóm ngoại lệ có chủ đích**”, không viết “đạt 3NF tuyệt đối” | `orders.status` suy ra từ `status_detail`, `orders.total` là cột dẫn xuất. Snapshot địa chỉ/giá được lập luận là dữ kiện lịch sử, không vi phạm. Cột mảng (`gallery_urls`, `preferences`) và `canvas_json` được giải thích ở mục 1NF | Cả nhóm (đã báo trước trong kế hoạch) |
| E2 | ERD không vẽ đường FK tới profiles của nhân viên (reviewer_id, decided_by, approved_by); bỏ bảng `test` và view `stock_availability` | Cho sơ đồ dễ đọc; có ghi chú trong bài | — |
| E3 | Bảng `orders` trên ERD chỉ hiện 18 dòng chính; đủ 47 cột ở bảng mô tả thực thể | 47 dòng làm ERD quá cao | — |
| E4 | Kiểu dữ liệu, ràng buộc lấy tự động từ `supabase/migrations` và `database.types.ts` | Bảo đảm đúng với DB | — |

## F. Nội dung AS-IS

| # | Quyết định | Kiểm |
|---|---|---|
| F1 | 5 điểm nghẽn P1–P5 suy từ phân tích đối thủ ở bản nháp C1 (HATO Case chờ duyệt Zalo 1–2 giờ; giá CASETiFY 1,2–2 triệu; bản xem trước 2D). Chưa có số liệu khảo sát người dùng | Nếu nhóm có khảo sát hoặc phỏng vấn, gửi để bổ sung bằng chứng |
| F2 | Số liệu thị trường (VECOM 38,5 tỷ USD, +21%) lấy nguyên từ bản nháp C1 | Người viết C1 kiểm nguồn |

## G. Định dạng

| # | Quyết định | Kiểm |
|---|---|---|
| G1 | A4, lề 2,54 cm, Times New Roman 13, giãn dòng 1,3; heading dùng style Heading 1–4 (tạo mục lục tự động được); hình, bảng đánh số “Hình 3.x”, “Bảng 3.x” | **Gửi mẫu Word của khoa** nếu khác |
| G2 | BPMN, CDM, ERD, sơ đồ trạng thái đặt trên trang ngang để đọc được chữ | — |
| G3 | Không có trang bìa (theo yêu cầu) | — |

## Cần team gửi thêm

1. BRD/SRD gốc của **Thanh toán, Cửa hàng, CSKH, Trang chủ/Hồ sơ** (để đồng bộ mã FR-P, FR-SH, FR-CS, FR-PM).
2. Chốt tên thương hiệu (CasEYE's hay CaseCraft).
3. Giảng viên có bắt buộc DFD, sequence diagram không.
4. Mẫu Word của khoa.
5. Kết quả khảo sát hoặc phỏng vấn người dùng, nếu có.
