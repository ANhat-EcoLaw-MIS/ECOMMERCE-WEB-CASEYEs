# Kế hoạch viết Chương 3: Phân tích và thiết kế hệ thống CasEYE's

Bản kế hoạch để team duyệt trước khi viết.

- Nguồn sự thật là repo (nhánh `integration/local`, đã push lên `integration/connect-functions`).
- Đồ án AntGo chỉ dùng để tham khảo bố cục và độ sâu. Chương 3 của AntGo dài khoảng 135 trang, gồm 9 mục: tổng quan, As-Is, To-Be, BR, SRD, User story, Use case, DFD, dữ liệu.

---

## 0. Nguyên tắc

1. **Viết theo luồng nghiệp vụ, không viết theo màn hình.** Mỗi function trả lời 3 câu hỏi:
   - **Để làm gì:** giải pháp cho pain point nào.
   - **Chạy thế nào:** BPMN.
   - **Luật gì:** BR.

   Sau đó mới tới FR, use case, class diagram và dữ liệu.
2. **Truy vết hai chiều.** Chuỗi truy vết là: pain point → tính năng TO-BE → BR → FR → UC/US → bảng dữ liệu. Cuối chương có ma trận truy vết. Giảng viên chấm môn phân tích thiết kế thường soi đúng chỗ này.
3. **Chỉ viết cái đã có trong code hoặc DB.** Phần mô phỏng (thanh toán mock, đơn vị vận chuyển mock, email mock) ghi rõ là "mô phỏng". Phần chưa làm (Loyalty, đánh giá sản phẩm, khiếu nại tranh chấp trong DB) đưa vào "Ngoài phạm vi / hướng phát triển".
4. **Mọi sơ đồ xuất file `.drawio` để team sửa được.** Lưu ở `docs/report/diagrams/`, mỗi sơ đồ một file, tên file theo quy ước mã (ví dụ `BPMN-OT-01_dat-hang.drawio`). Ảnh PNG để chèn vào Word xuất từ chính file drawio đó.

---

## 1. Bố cục đề xuất và lý do khác AntGo

| Mục | Nội dung | Khác AntGo ở đâu, vì sao |
|---|---|---|
| **3.1 Tổng quan phân tích: nhu cầu và giải pháp** | 3.1.1 Quy ước đặt tên · 3.1.2 Tác nhân và phạm vi · 3.1.3 Nhu cầu AS-IS · 3.1.4 Giải pháp TO-BE (bảng pain point ↔ tính năng, **Use case tổng quát**, **BPMN high-level**) | AntGo tách "tổng quan", "đối thủ As-Is", "To-Be" thành 3 mục dài, persona chiếm 5 trang. Mình gộp lại theo khung team gửi. Persona và khảo sát nếu cần thì để ở Chương 1, Chương 3 chỉ nhắc lại để không lặp |
| **3.2 Quy trình nghiệp vụ TO-BE và quy tắc nghiệp vụ** | Mỗi function có: mục đích → BPMN-xx → bảng BR-xx | AntGo để BR thành một mục riêng (3.4), tách khỏi quy trình, nên người đọc phải lật qua lại. Đặt BR ngay dưới BPMN của chính nó thì đọc theo luồng được, và vẫn giữ mã BR để truy vết |
| **3.3 Đặc tả yêu cầu hệ thống (SRD)** | 3.3.1 FR theo function (mã, mô tả, tiêu chí chấp nhận, ưu tiên MoSCoW, truy vết BR) · 3.3.2 NFR | Giống AntGo, thêm cột truy vết và cột "Trạng thái: Đã làm / Mô phỏng" cho trung thực |
| **3.4 Mô hình hóa yêu cầu** | 3.4.1 User story (gọn, theo tác nhân) · 3.4.2 Use case phân rã và đặc tả các UC chính · 3.4.3 Class diagram theo function (CD-xx) | **Bỏ DFD.** Lý do: team phân tích theo hướng đối tượng (UC + Class diagram, đúng với quy ước có mã CD). DFD là ký pháp của phân tích cấu trúc; vẽ cả hai sẽ trùng thông tin với BPMN và ERD. Nếu giảng viên yêu cầu DFD thì chỉ thêm DFD mức ngữ cảnh (1 trang) |
| **3.5 Thiết kế dữ liệu** | 3.5.1 CDM · 3.5.2 ERD + lập luận 3NF · 3.5.3 Mô tả thực thể | Giống khung team gửi. Xem cảnh báo 3NF ở mục 6 |
| **3.6 Ma trận truy vết** (mới, 1–2 trang) | Pain point → tính năng → BR → FR → UC → bảng | AntGo không có mục này. Nó cho thấy phân tích khép kín và giúp bảo vệ khi bị hỏi "tính năng X sinh ra từ đâu" |

Ước lượng độ dài: 70–90 trang, ngắn hơn AntGo khoảng 40%, nhờ không lặp BR và bỏ DFD.

---

## 2. Mục 3.1: chi tiết

### 3.1.1 Quy ước đặt tên

Giữ bảng team gửi, đề xuất sửa 3 chỗ:

| Function | Mã | Ghi chú đề xuất |
|---|---|---|
| Xác thực **và tài khoản** | AUTH | Gộp luôn trang Tài khoản: hồ sơ, địa chỉ, onboarding, "Đơn của tôi" là lối vào OT |
| Trang chủ | PM | ⚠ Code hiện có trang chủ tĩnh (landing), **chưa có chức năng "quản lý" nội dung trang chủ**. Đề xuất đổi thành "Trang chủ và điều hướng", hoặc bỏ mã này và gộp vào SH. Cần team chốt |
| Cửa hàng | SH | Gồm danh mục, chi tiết, giỏ hàng (giỏ hàng chung cả site là của Shop) |
| Studio thiết kế | DES | Chọn máy → kho mẫu → editor → lưu / gửi duyệt |
| Thanh toán | P | Gồm checkout, phí ship, voucher, thanh toán (mô phỏng theo kênh) |
| Quản lý đơn hàng | OT | Gồm phía khách và phía nhân viên (admin) |
| Hỗ trợ khách hàng | CS | Chat hỗ trợ, trang CSKH, chính sách |
| **Tìm kiếm** (mới) | **SR** | Function mới làm: tìm toàn site, gợi ý theo mô tả, tìm bằng ảnh. Bảng gốc chưa có |

Quy ước mã con: `BR-OT-03`, `FR-OT-12`, `UC-OT-04`, `US-OT-07`, `BPMN-OT-02`, `CD-OT`. Thêm `NFR-xx` cho yêu cầu phi chức năng, vì bảng gốc chưa có.

### 3.1.2 Tác nhân và phạm vi

AntGo đặt mục này sau As-Is; mình đưa lên trước vì UC tổng quát cần tác nhân.

- **Tác nhân người:**
  - Khách vãng lai.
  - Khách hàng (đã đăng nhập).
  - Nhân viên: theo `profiles.role`, gồm duyệt thiết kế, kho / vận hành, CSKH.
  - Quản trị viên: làm được mọi vai trò (migration M8).
- **Tác nhân hệ thống:**
  - Supabase Auth.
  - Bộ lập lịch (pg_cron: tự hủy, tự hoàn tất, nhắc quá hạn).
  - Cổng thanh toán (mô phỏng).
  - Đơn vị vận chuyển (mô phỏng qua `webhook_events` / `apply_carrier_event`).
- **Phạm vi:** những gì có trong repo.
- **Ngoài phạm vi:** Loyalty / ưu đãi; đánh giá sản phẩm và tranh chấp trong DB; tích hợp cổng thanh toán và vận chuyển thật; tìm ảnh theo nội dung (hiện chỉ so màu).

### 3.1.3 Nhu cầu AS-IS

Ngắn, kèm bằng chứng, nói rõ gap của quy trình truyền thống trên sàn TMĐT. Ba nhóm cách mua ốp hiện nay:

1. **Shop ốp in theo yêu cầu trên Facebook / Instagram / Zalo.** Gửi ảnh qua tin nhắn, chốt bằng chat, chuyển khoản tay, không có trạng thái đơn.
2. **Gian hàng trên Shopee / Lazada / TikTok Shop.** Chỉ có mẫu có sẵn; "in theo yêu cầu" phải ghi chú hoặc nhắn shop, không xem trước được.
3. **Thương hiệu quốc tế kiểu Casetify.** Có công cụ tùy biến nhưng giá cao, giao lâu, không bản địa hóa.

Mỗi nhóm có 1 BPMN-ASIS ngắn (3 sơ đồ), và một bảng pain point / gap:
- không xem trước được thiết kế;
- không có bước duyệt file in;
- trạng thái đơn mù mờ;
- hủy và hoàn tiền thủ công;
- tìm mẫu theo ý tưởng khó.

**Bằng chứng cần team cung cấp:** xem mục 7.

### 3.1.4 Giải pháp TO-BE

- **Bảng pain point → tính năng CasEYE's**, ví dụ:
  - "không xem trước" → Design Studio có xem 3D;
  - "trạng thái mù mờ" → 12 trạng thái chi tiết, timeline và thông báo;
  - "khó tìm mẫu" → Tìm kiếm có gợi ý theo mô tả.
- **UC tổng quát (UC-00):** 1 sơ đồ lớn, các tác nhân ở trên, gom theo 8 gói function.
- **BPMN high-level kiến trúc nghiệp vụ (BPMN-00):** 1 sơ đồ, không subprocess. Gồm pool Khách hàng · Web CasEYE's · Nhân viên · Hệ thống ngoài (Supabase / thanh toán / vận chuyển). Luồng: tìm hoặc thiết kế → giỏ → thanh toán → duyệt thiết kế → sản xuất → giao → hoàn tất / hậu mãi.

---

## 3. Mục 3.2: quy trình TO-BE theo function

Mỗi function gồm: mục đích (để làm gì, giải pain point nào) → luồng chính bằng lời (5–8 bước) → BPMN → bảng BR (mã, tên, mô tả, nguồn trong code hoặc DB).

| Function | BPMN dự kiến | BR chính (lấy từ code / DB) |
|---|---|---|
| AUTH | BPMN-AUTH-01 Đăng ký + onboarding (pending → completed / skipped, hỏi trước khi chuyển sang onboarding ở Checkout) · 02 Đăng nhập (khách / nhân viên, phân vai theo `profiles.role`) · 03 Quên / đặt lại mật khẩu | Hồ sơ tự tạo khi đăng ký; vai trò quyết định trang admin; nhân viên và khách tách phiên |
| PM | BPMN-PM-01 Điều hướng từ trang chủ (nếu team giữ mã PM) | — |
| SH | BPMN-SH-01 Xem danh mục → chi tiết → thêm giỏ (bắt buộc đăng nhập) | Giỏ hàng duy nhất; tồn kho theo `inventory_items` / `stock_availability`; hết hàng thì không thêm |
| DES | BPMN-DES-01 Chọn máy → mẫu → chỉnh → lưu / thêm giỏ · 02 Duyệt thiết kế (nhân viên duyệt / từ chối, khách sửa và gửi lại) | Giới hạn số lần gửi lại (`design_resubmit_count`); tiêu chí duyệt file in |
| P | BPMN-P-01 Checkout → phí ship (Checkout quyết định) → voucher → chọn kênh thanh toán (mô phỏng) / COD | Bảng phí ship theo hạng; voucher; ràng buộc COD |
| OT | BPMN-OT-01 Vòng đời đơn (12 trạng thái chi tiết) · 02 Hủy đơn (tự hủy hay cần duyệt) · 03 Hoàn tiền · 04 Giao thất bại / giao lại · 05 Báo sự cố sau nhận · 06 Tác vụ tự động theo thời hạn | Toàn bộ quy tắc thời hạn trong `order_jobs`, `add_working_days`, `confirm_due_at`, `auto_complete_at`, voucher trễ hạn, QC in lại… |
| CS | BPMN-CS-01 Chat hỗ trợ → tạo phiếu / chuyển nhân viên | Phân loại yêu cầu; liên kết đơn (`ticket_id`) |
| SR | BPMN-SR-01 Tìm kiếm và gợi ý (đã có, chuyển từ `.bpmn` sang drawio) | 6 BR trong `docs/search/BRD_SRD_TIM_KIEM.md` |

Mục 3.2 cuối có bảng **So sánh AS-IS và TO-BE** (1 trang).

---

## 4. Mục 3.3: SRD

- **FR:** khoảng 8–15 FR mỗi function.

  | Mã | Tên | Mô tả | Tiêu chí chấp nhận | Ưu tiên (MoSCoW) | BR liên quan | Trạng thái (Đã làm / Mô phỏng) |
  |---|---|---|---|---|---|---|

- **NFR:**
  - Bảo mật: RLS theo người sở hữu và theo vai trò; RPC `security definer`; không lộ key bí mật.
  - Hiệu năng: lazy loading, budget bundle, tìm kiếm dưới 50 ms.
  - Khả dụng: responsive, WCAG AA (tương phản, bàn phím, `aria`).
  - Toàn vẹn: khóa lạc quan `orders.version`; ràng buộc trạng thái.
  - Khả năng bảo trì: quy ước `core` không import `features`; migration có rollback và có test PGlite.
  - Bản địa hóa tiếng Việt.

## 5. Mục 3.4: mô hình hóa

- **User story:** viết gọn theo tác nhân (Khách vãng lai, Khách hàng, Nhân viên, Quản trị), mỗi story kèm 2–3 tiêu chí chấp nhận dạng Given/When/Then. Khoảng 40–50 story, bằng một nửa AntGo, vì story trùng với FR thì chỉ dẫn mã.
- **Use case:**
  - Mỗi function có 1 sơ đồ UC phân rã.
  - Đặc tả chi tiết chỉ cho UC cốt lõi (khoảng 14 UC, mỗi UC 1–1,5 trang, theo mẫu tác nhân / tiền điều kiện / luồng chính / luồng thay thế / ngoại lệ / hậu điều kiện / BR áp dụng):
    - AUTH: Đăng ký, Đăng nhập;
    - SH: Thêm giỏ;
    - DES: Thiết kế ốp, Duyệt thiết kế;
    - P: Thanh toán;
    - OT: Theo dõi đơn, Hủy đơn, Hoàn tiền, Xử lý đơn (nhân viên);
    - CS: Chat hỗ trợ;
    - SR: Tìm kiếm, Gợi ý theo mô tả.
  - UC còn lại đặc tả dạng bảng tóm tắt 1 dòng.
- **Class diagram:** 1 sơ đồ cho mỗi function (CD-xx). Lớp miền lấy từ model trong `features/*/models` và các bảng (Order, OrderItem, Design, Product…), gồm thuộc tính chính và phương thức nghiệp vụ (`requestCancel()`, `placeOrder()`…). Không vẽ lớp kỹ thuật của Angular.

## 6. Mục 3.5: thiết kế dữ liệu

### 3.5.1 CDM

Khoảng 15 thực thể nghiệp vụ, nhóm theo 4 cụm:
- Người dùng: profiles, addresses, policy_consents.
- Danh mục: phone_models, products, product_variants, inventory_items.
- Thiết kế: designs, design_reviews.
- Đơn hàng: orders, order_items, order_status_history, order_vouchers, shipments, delivery_attempts, cancel_requests, refund_requests, notifications.

Vẽ mức khái niệm: chỉ có thực thể, quan hệ và bản số, không có kiểu dữ liệu. Không đưa bảng `test` và bảng kỹ thuật `webhook_events` vào CDM.

### 3.5.2 ERD + 3NF

ERD vẽ đủ 20 bảng (có PK, FK, kiểu dữ liệu), lấy đúng từ migrations / `database.types.ts`.

> ⚠ **Cần nói trung thực, không nên viết "đạt chuẩn 3NF tuyệt đối".** Khi rà DB có các thuộc tính **dẫn xuất có chủ đích**:
> - `orders.status` suy ra từ `status_detail`, nên về lý thuyết là phụ thuộc bắc cầu;
> - `orders.total` bằng `goods_total + shipping_fee + express_surcharge − discount`;
> - các cột địa chỉ và giá trên đơn và dòng đơn là **ảnh chụp tại thời điểm mua** (snapshot).
>
> Đề xuất viết: *"Lược đồ được thiết kế theo 3NF; mọi thuộc tính không khóa phụ thuộc trực tiếp vào khóa. Ngoại lệ có chủ đích:*
> 1. *Snapshot địa chỉ / giá trên đơn là dữ kiện lịch sử thuộc về đơn, không phải bản sao của `addresses` / `products`, nên không vi phạm 3NF;*
> 2. *`status` và `total` là thuộc tính dẫn xuất được giữ lại để phục vụ RLS, lọc và tương thích enum, được đồng bộ bằng ràng buộc / trigger (khử chuẩn hóa có kiểm soát)."*
>
> Cách viết này đứng vững hơn khi hội đồng hỏi. Có kèm 2–3 ví dụ tách bảng chứng minh 3NF: `order_items` tách khỏi `orders`; `product_variants` tách khỏi `products`; `order_status_history` thay cho việc ghi đè.

### 3.5.3 Mô tả thực thể

Mỗi bảng có 1 bảng mô tả gồm: tên cột · kiểu · ràng buộc (PK / FK / NOT NULL / CHECK / mặc định) · ý nghĩa nghiệp vụ. Kèm thêm 1 bảng mô tả enum và các mã `status_detail`, và 1 bảng mô tả RPC nghiệp vụ chính (có thể đưa sang Chương 4 nếu team muốn).

---

## 7. Material cần team cung cấp

| # | Cần gì | Để làm gì | Bắt buộc? |
|---|---|---|---|
| 1 | **Mẫu Word của khoa / trường** (font, cỡ chữ, đánh số hình / bảng, trích dẫn APA hay IEEE) | Viết đúng định dạng ngay từ đầu | Có |
| 2 | **Chương 1 và Chương 2 hiện tại** (hoặc dàn ý) | Không lặp persona / lý thuyết; dùng chung thuật ngữ; khớp mục tiêu | Có |
| 3 | **Bằng chứng AS-IS:** kết quả khảo sát / phỏng vấn (nếu có), ảnh chụp quy trình đặt ốp custom trên FB / Shopee, số liệu thị trường team đã trích | Phần 3.1.3 phải "kèm bằng chứng" | Có (nếu không có thì mình viết theo quan sát công khai và ghi nguồn, nhưng yếu hơn) |
| 4 | **Chốt mã PM:** giữ "Quản lý trang chủ" thật hay đổi / gộp | Code hiện chưa có chức năng quản lý trang chủ | Có |
| 5 | **Phân công function ↔ thành viên** | Ghi người phụ trách trong bảng quy ước nếu khoa yêu cầu | Tùy |
| 6 | Xác nhận các phần **mô phỏng / chưa làm** (thanh toán, vận chuyển, email, Loyalty, đánh giá) có đúng như mình liệt kê không | Không ghi sai phạm vi | Có |
| 7 | Giảng viên có **bắt buộc DFD / sequence diagram** không | Quyết định có thêm hay không | Có |
| 8 | Giới hạn số trang của chương / cả đồ án | Cân độ dài | Tùy |
| 9 | Nộp **.docx hay Google Docs** | Chọn định dạng đầu ra | Có |

---

## 8. Danh sách sơ đồ (drawio) và thứ tự làm

Tổng cộng khoảng **35 sơ đồ**:

| Nhóm | Số lượng |
|---|---|
| BPMN-ASIS | 3 |
| BPMN-00 + UC-00 | 2 |
| BPMN function | khoảng 16 |
| UC phân rã | 8 |
| CD | 8 |
| CDM + ERD | 2 |

Thứ tự làm:
1. 3.1 + UC-00 + BPMN-00 → gửi team duyệt hướng.
2. 3.5 dữ liệu (CDM, ERD, mô tả thực thể). Phần này bám DB nên chắc nhất, làm sớm để các phần sau truy vết theo.
3. 3.2 BPMN + BR theo function. Làm OT, P, DES trước vì đây là lõi.
4. 3.3 SRD.
5. 3.4 US / UC / CD.
6. 3.6 ma trận truy vết. Soát chéo toàn chương với code.

Mỗi bước xong là một bản `.docx` và file `.drawio` để team sửa, rồi mới sang bước sau.
