# Góp ý tài liệu BA – Vấn đề "silo thông tin" và đề xuất cải tiến quy trình

> **Phạm vi rà soát:** 8 phân hệ trong bộ tài liệu BA hiện hành – Authentication (AUTH), Profile Management (PM), Shop & Cart (SH), Payment (P), Customer Service (CS), Design Studio (DES), Order Tracking (OT), Search (SRCH).
> **Nguồn:** `ba_v2.pack` (AUTH, PM, SH, P, CS), `ba_des.pack`, `ba_OT_v2.pack`, `ba_search.pack`.
> **Mục đích:** (1) chỉ ra chỗ mỗi phân hệ đang tự định nghĩa dữ liệu/quy tắc riêng, mâu thuẫn hoặc không nối được với phân hệ khác; (2) đề xuất cách khắc phục; (3) gợi ý cải tiến quy trình theo ba hướng: **xử lý ngoại lệ (edge case)**, **điểm chạm trải nghiệm khách hàng (CX touchpoint)** và **xây dựng nền tảng dữ liệu (data foundation)**.

**Ký hiệu mức độ:** 🔴 Nghiêm trọng (mâu thuẫn trực tiếp, sẽ gây lỗi khi tích hợp) · 🟠 Trung bình (trùng lặp / thiếu chủ sở hữu) · 🟡 Nhẹ (không nhất quán, thiếu sót tài liệu)

---

## Mục lục

0. [Tổng quan: bản đồ kết nối và các "phân hệ ma"](#0-tổng-quan-bản-đồ-kết-nối-và-các-phân-hệ-ma)
1. [Authentication (AUTH)](#1-authentication-auth)
2. [Profile Management (PM)](#2-profile-management-pm)
3. [Shop & Cart (SH)](#3-shop--cart-sh)
4. [Payment (P)](#4-payment-p)
5. [Design Studio (DES)](#5-design-studio-des)
6. [Order Tracking (OT)](#6-order-tracking-ot)
7. [Customer Service (CS)](#7-customer-service-cs)
8. [Search (SRCH)](#8-search-srch)
9. [Đề xuất xuyên phân hệ](#9-đề-xuất-xuyên-phân-hệ)
10. [Lộ trình ưu tiên](#10-lộ-trình-ưu-tiên)

---

## 0. Tổng quan: bản đồ kết nối và các "phân hệ ma"

### 0.1. Mức độ kết nối của từng phân hệ

| Phân hệ | Mức độ kết nối | Nhận định |
|---|---|---|
| Order Tracking | Nhận từ P; gửi sang CS, Loyalty, Shopping (RiskProfile), Notification, PM; nhận kết quả từ DES | **Trung tâm (hub)** – tích hợp tốt nhất, có interface tường minh và hàng đợi gửi lại |
| Search | Gom dữ liệu từ SH, DES, OT qua `SearchSource` | **Bộ tích hợp theo thiết kế** – nhưng mâu thuẫn với SH |
| Payment | Nhận giỏ từ SH, đẩy đơn sang OT qua `place_order` | Kết nối tốt – nhưng **không có năng lực hoàn tiền** |
| Design Studio | Nhận từ SRCH; gửi sang AUTH, Cart, OT | Kết nối tốt – nhưng **trùng quy trình kiểm duyệt với OT** |
| AUTH / PM | Mọi phân hệ đều dùng | Nền móng – nhưng **không mô hình hóa tài khoản nhân viên** |
| Shop & Cart | Quy tắc lỗi thời so với SRCH, DES, OT, P | 🔴 **Silo do không cập nhật theo phân hệ khác** |
| Customer Service | Mô hình dữ liệu riêng, tham chiếu phân hệ không tồn tại | 🔴 **Phân hệ cô lập nhất** |

### 0.2. "Phân hệ ma" – năng lực được nhiều nơi tham chiếu nhưng không có tài liệu

Đây là nguồn gốc sâu nhất của silo: vì không có chủ sở hữu, mỗi phân hệ tự "chế" một phần.

| Năng lực | Đang được tham chiếu bởi | Hệ quả |
|---|---|---|
| **Tồn kho (Inventory)** | SH (actor "Inventory"), P (`place_order` trừ kho), OT & DES (`restock_order`), DES (`BaseSKU.stock_quantity`) | Không ai định nghĩa mô hình tồn kho, giữ chỗ, hoàn kho |
| **Hoàn tiền / ví hoàn tiền** | OT (`RefundRequest`), CS (gửi sang Payment), DES (`create_refund` → Payment Gateway), PM (BR-PM-10 "ví hoàn tiền còn số dư") | Payment không có FR/UC hoàn tiền; "ví" không tồn tại |
| **Loyalty / điểm thưởng** | OT (cộng/thu hồi điểm, voucher giao trễ), P (thẻ "Cosmic Club +480 Stars"), PM (BR-PM-14 mất điểm khi xóa TK) | Không có tài liệu |
| **Voucher / Khuyến mãi** | P (CASEFIRST, VIP30), PM (voucher hoàn thiện hồ sơ), CS (voucher đền bù), OT (qua Loyalty) | 4 nơi phát hành, không có sổ cái voucher chung |
| **Thông báo (Notification)** | AUTH (`EmailService`), P (hộp thư giả lập), PM (cảnh báo bảo mật), CS & OT (Notification Service) | 5 cơ chế gửi khác nhau |
| **Danh tính & phân quyền nhân viên** | Operator, CSKH, Admin thao tác trong OT, CS, SH, DES | AUTH chỉ có Guest/khách hàng – không có đăng nhập quản trị, không có vai trò |
| **Sản xuất (Production)** | CS coi là module ngoài | Thực tế nằm trong OT (Operator) |
| **Landing & Onboarding** | DES (hộp đen), AUTH (UC-AUTH-01 bước 9), PM (UC-PM-01) | Hai phân hệ cùng nhận là chủ sở hữu onboarding |

---

## 1. Authentication (AUTH)

### 1.1. Vấn đề silo

| # | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| A1 | 🔴 | **Không có danh tính nhân viên.** Mô hình chỉ có `UserAccount` của khách; enum `AccountStatus`/`AuthProvider` không có vai trò. Trong khi OT, CS, SH, DES đều cần Operator/CSKH/Admin. Hệ quả: CS tự tạo `User{role}`, OT tự tạo `Admin{role}`, DES tự tạo `User`+`Role`. | CD-AUTH; CD-CS; CD-OT; CD-DES |
| A2 | 🟠 | **Trùng chủ sở hữu Onboarding với PM.** UC-AUTH-01 bước 9 và `AuthService.saveOnboarding()` thu thập dòng máy & sở thích; PM cũng có UC-PM-01, `onboarding_status` (PENDING/COMPLETED/SKIPPED). | UC-AUTH-01; BPMN-PM-01 |
| A3 | 🟠 | **Đồng bộ dữ liệu vãng lai được định nghĩa ở 3 nơi.** FR-AUTH-03 đồng bộ "thiết kế tạm, giỏ hàng"; DES FR-DES-20 tự đồng bộ `caseyes_guest_draft`; SH UC-SH-08 AF1 tự "gộp giỏ ẩn danh". Không có hợp đồng chung về khóa localStorage và thứ tự đồng bộ. | FR-AUTH-03/07; FR-DES-19/20; UC-SH-08 |
| A4 | 🟡 | BR-AUTH-03 nêu Facebook nhưng FR/BPMN/CD chỉ có Google; BR-AUTH-04, 05 chưa có FR liên kết; trùng số bước EXC (4.1, 3.6.1). | Bảng kiểm tra tự động |
| A5 | 🟡 | Kiểu khóa chính `UUID` không thống nhất với CS (`int`) và OT (`String`). | CD-AUTH, CD-CS, CD-OT |

### 1.2. Đề xuất khắc phục silo

- **Bổ sung mô hình nhân viên vào AUTH:** thêm enum `Role {CUSTOMER, OPERATOR, CSKH, ADMIN}` (hoặc bảng `roles` + `user_roles` để một người có nhiều vai trò), luồng đăng nhập khu quản trị, và quy tắc RLS theo vai trò. Các phân hệ khác chỉ tham chiếu `user_id (UUID)` + `role`, **xóa** các lớp `User`/`Admin` tự định nghĩa trong CS, OT, DES.
- **Chốt PM là chủ sở hữu Onboarding.** AUTH chỉ phát sự kiện `UserRegistered` và chuyển hướng; PM quyết định có hiển thị Onboarding hay không dựa trên `onboarding_status`. Xóa `saveOnboarding()` khỏi `AuthService`.
- **Đặc tả một "Guest Session Contract" duy nhất** do AUTH sở hữu: danh sách khóa localStorage (`caseyes_guest_draft`, `caseyes_guest_cart`, `caseyes_active_model`…), thứ tự đồng bộ (thiết kế → giỏ → điều hướng về trang dở dang), và sự kiện `GuestDataMerged`. DES và SH chỉ đăng ký "handler" của mình.

### 1.3. Gợi ý cải tiến quy trình

**Edge case**
- Email đăng ký trùng với tài khoản đang ở `PENDING_DELETION` (PM): nên đề nghị *khôi phục tài khoản* thay vì báo "email đã tồn tại".
- Email Google trùng tài khoản email/mật khẩu: thay vì chặn, cho phép **liên kết tài khoản** sau khi xác thực mật khẩu.
- Đồng bộ dữ liệu vãng lai khi tài khoản đã có giỏ/nháp: quy tắc gộp (cộng dồn số lượng, giữ bản nháp mới hơn theo `updated_at`, hỏi khách nếu xung đột).
- Link xác nhận email mở trên thiết bị khác với thiết bị đăng ký: phiên đăng nhập và dữ liệu vãng lai phải được xử lý thế nào.
- Khóa tài khoản sau N lần sai: tài liệu nêu `failedLoginAttempts`, `lockedUntil` nhưng chưa có ngưỡng và thời gian khóa cụ thể.

**CX touchpoint**
- Giữ ngữ cảnh "ý định" khi bị chặn bởi đăng nhập: hiển thị "Đăng nhập để lưu thiết kế *Mèo pastel* của bạn" thay vì modal chung chung.
- Thông báo sau đồng bộ: "Đã chuyển 1 bản thiết kế và 2 sản phẩm vào tài khoản".
- Cho phép **hoàn tất thanh toán trước, tạo mật khẩu sau** (đăng ký "lười") để giảm rơi rớt ở bước Checkout.

**Data foundation**
- Bảng `auth_events` (đăng ký, đăng nhập thành công/thất bại, phương thức, thiết bị, nguồn kích hoạt: "lưu thiết kế" / "checkout" / "nút đăng nhập") → đo **tỷ lệ chuyển đổi từ vãng lai sang thành viên theo điểm chạm**.
- Lưu `signup_trigger` và `guest_session_id` trên `UserAccount` để nối hành vi trước và sau đăng nhập (attribution).
- Lưu `email_verification_sent_at/confirmed_at` để đo tỷ lệ bỏ cuộc ở bước xác minh 15 phút.

---

## 2. Profile Management (PM)

### 2.1. Vấn đề silo

| # | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| P1 | 🔴 | **Phụ thuộc vào "phân hệ ma".** BR-PM-10 kiểm tra "ví hoàn tiền còn số dư", BR-PM-14 hủy "điểm tích lũy, voucher" – nhưng không phân hệ nào định nghĩa ví, điểm, sổ voucher. | BR-PM-10, 14 |
| P2 | 🟠 | **Tự phát voucher riêng** (FR-PM-05, cờ `is_rewarded`) độc lập với bảng `vouchers` của Payment. | FR-PM-05, 09; BR-P-12 |
| P3 | 🟠 | **Điều kiện xóa tài khoản lệch nhau:** BR-PM-10 nêu 5 điều kiện; BPMN-PM-03-1 ghi "4 điều kiện". Chỉ OT cung cấp API (`listOpenOrders`, FR-OT-EX-08); CS (khiếu nại mở) và P (giao dịch chưa đối soát) không có API tương ứng. | BR-PM-10; BPMN-PM-03-1; FR-OT-EX-08 |
| P4 | 🟠 | **Silo công nghệ:** chỉ PM dùng lane "Hệ thống (Camunda Engine)"; các phân hệ khác dùng Angular + Supabase. | BPMN-PM-02, 03 |
| P5 | 🟠 | **Sổ địa chỉ không có chủ.** BR-P-02 nói "quản lý sổ địa chỉ thuộc phân hệ PM" nhưng PM không có FR nào cho sổ địa chỉ. | BR-P-02; FR-PM-* |
| P6 | 🟡 | Thiếu class diagram; UC-PM-01..03 chỉ có trong sơ đồ, chưa có đặc tả. Thư viện thiết kế (FR-PM-02) trùng My Designs của DES. | Bảng kiểm tra tự động |

### 2.2. Đề xuất khắc phục silo

- Tạo hợp đồng **"Account Deletion Eligibility"**: PM gọi lần lượt `OT.listOpenOrders()`, `CS.listOpenTickets()`, `P.listUnsettledTransactions()`, `Refund.getPendingBalance()`. Mỗi phân hệ trả danh sách lý do chặn kèm đường dẫn xử lý. Đồng bộ con số điều kiện giữa BR và BPMN.
- Chuyển phát voucher hoàn thiện hồ sơ sang **Promotion/Voucher service chung** (xem mục 9); PM chỉ phát sự kiện `ProfileCompleted`.
- Bỏ Camunda khỏi BPMN (hoặc ghi rõ là ký hiệu mô hình, không phải công nghệ triển khai) để đồng bộ với kiến trúc Supabase.
- Bổ sung FR sổ địa chỉ (thêm/sửa/xóa, đặt mặc định, tối đa N địa chỉ, ghim tọa độ) – P chỉ đọc và cho sửa nhanh.
- "Thư viện thiết kế" trong PM chỉ là **khung hiển thị** dữ liệu của DES (`SavedDesign`), không định nghĩa thao tác riêng.

### 2.3. Gợi ý cải tiến quy trình

**Edge case**
- Người dùng < 13 tuổi tự khai sai rồi sửa: chặn sửa ngày sinh sau khi đã nhận voucher hoàn thiện hồ sơ (chống trục lợi).
- Đổi SĐT sang số đang thuộc tài khoản `PENDING_DELETION`: định nghĩa có giải phóng số hay không.
- Tài khoản OAuth-only xóa tài khoản: OTP gửi email Google – nếu email đó không còn truy cập được thì sao?
- Trong 30 ngày chờ xóa, đơn hàng cũ phát sinh khiếu nại hoặc hoàn tiền (từ CS/OT): tạm dừng đồng hồ xóa.
- Batch ẩn danh dữ liệu chạy lỗi giữa chừng: cần cơ chế idempotent và nhật ký từng bước.

**CX touchpoint**
- Thanh hoàn thiện hồ sơ nên gợi ý **giá trị cụ thể**: "Thêm dòng máy để nhận gợi ý mẫu vừa khít" thay vì chỉ phần trăm.
- Màn chặn xóa tài khoản liệt kê *từng* việc cần xử lý kèm nút đi thẳng tới đơn/ticket tương ứng.
- Trước khi xóa, cho phép **tải về dữ liệu cá nhân** (thiết kế, đơn hàng) – vừa tăng tin cậy vừa phù hợp Nghị định 13/2023 về bảo vệ dữ liệu cá nhân.
- Giới tính chỉ có "nam/nữ" (BR-PM-06): cân nhắc thêm "Khác / Không muốn tiết lộ" để tránh làm khách khó chịu và dữ liệu sai lệch do khai đại.

**Data foundation**
- Bảng `profile_change_log` (trường, giá trị cũ đã che, thời điểm, nguồn) – phục vụ audit và phân tích hành vi cập nhật.
- Lưu `onboarding_answers` dạng có cấu trúc (dòng máy, phong cách, mục đích mua) + `onboarding_status` + thời điểm – đây là **dữ liệu zero-party** giá trị nhất để cá nhân hóa SRCH và DES.
- Bảng `account_deletion_requests` (lý do chọn, thời điểm, có khôi phục không) → phân tích churn.
- Thống nhất `customer_id` làm khóa nối dữ liệu với OT, CS, P; khi ẩn danh thì thay bằng `anonymized_customer_key` thay vì xóa liên kết, để vẫn giữ được thống kê tổng hợp.

---

## 3. Shop & Cart (SH)

> Đây là phân hệ có nhiều mâu thuẫn nhất với các phân hệ đã được cập nhật sau (SRCH, DES, OT, P). Cần **rà soát lại toàn bộ** trước khi triển khai tích hợp.

### 3.1. Vấn đề silo

| # | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| S1 | 🔴 | **Chứa bản FR-DES lỗi thời.** Mục SH trong `ba_v2` có FR-DES-01..31 cũ: nút "Mua ngay", `is_editable`, giới hạn ảnh 10MB, tham chiếu BR-DES không tồn tại trong pack. Bản DES hiện hành nói ngược lại: BR-DES-04 bỏ "Mua ngay", FR-DES-10 "100% mẫu chỉnh sửa được", ảnh > 10MB được nén. | `ba_v2` mục SH; BR-DES-04, FR-DES-10, FR-DES-14 |
| S2 | 🔴 | **Tìm kiếm riêng mâu thuẫn với SRCH.** UC-SH-02 có tìm từ khóa riêng và **tìm ảnh gửi lên server "AI Image Analysis"** (embedding), lưu `AestheticProfile`. SRCH (BR-SRCH-06) quy định **ảnh không rời trình duyệt**, chỉ đối sánh màu, không dùng AI bên thứ ba, và mục tiêu là *xóa hẳn* ô tìm kiếm của Shop. | UC-SH-02, UCD-SH; BR-SRCH-01, 06 |
| S3 | 🔴 | **Quy tắc hủy đơn riêng mâu thuẫn với OT.** UC-SH-09 cho hủy bất kỳ lúc nào trước "Đang in", Shop tự hoàn kho. OT: đơn COD chỉ tự hủy trong 30 phút ở `Pending_Confirmation`; đơn trả trước phải gửi `CancelRequest` cho CSKH xem xét. | UC-SH-09; FR-OT-05, 19 |
| S4 | 🟠 | **Bản ghi đồng ý điều khoản thứ ba.** SH lưu `TermsAcceptance` ở giỏ hàng; P lưu `PolicyConsent` ở Checkout (FR-P-18); OT cũng mô tả `PolicyConsent` (FR-OT-17). | UC-SH-08; FR-P-18; FR-OT-17 |
| S5 | 🟠 | **Khái niệm "cọc" chỉ có ở SH.** BR-SH-04, UC-SH-10 áp yêu cầu cọc cho khách rủi ro cao; Payment không có phương thức cọc. | BR-SH-04; UC-SH-10 |
| S6 | 🟠 | **Kho "Inventory" là actor ngoài không có tài liệu.** | UC-SH-07; BPMN-SH |
| S7 | 🟠 | **Hiển thị giá và lọc theo giá cho template** (UC-SH-01) – trong khi DES (BR-DES-16) "không hiển thị giá ở kho mẫu", đồng giá 250.000đ. Ranh giới giữa *sản phẩm Catalog (IN_STOCK)* và *mẫu Studio (CUSTOM)* chưa rõ. | UC-SH-01; BR-DES-11, 16 |
| S8 | 🟡 | **Giỏ hàng vãng lai mâu thuẫn:** UCD-SH không cho Guest thêm giỏ; UC-SH-05 POST nhắc "session ẩn danh"; AUTH/DES giả định có giỏ vãng lai. | UCD-SH; UC-SH-05; FR-AUTH-03 |
| S9 | 🟡 | Thiếu class diagram; BR-SH-01..06 chưa có FR liên kết. | Bảng kiểm tra tự động |

### 3.2. Đề xuất khắc phục silo

- **Xóa bản FR-DES lỗi thời** khỏi `ba_v2`; viết bộ FR-SH-xx riêng, truy vết đúng BR-SH.
- **Chuyển toàn bộ tìm kiếm sang SRCH.** SH chỉ giữ *bộ lọc danh mục* (dòng máy, phong cách, chất liệu, giá) trên trang Cửa hàng, và khai báo `ShopSearchSource`. Bỏ UC-SH-02 hoặc viết lại thành "SH cung cấp dữ liệu cho SRCH". Nếu vẫn muốn `AestheticProfile`, cần quyết định chính thức (đồng ý rõ ràng, chỉ lưu bảng màu đã trích xuất – không lưu ảnh) và cập nhật BR-SRCH-06.
- **Chuyển UC-SH-09 sang OT.** SH chỉ nhận sự kiện `OrderCancelled` để cập nhật `cancelCount`/`RiskProfile` (OT đã mô tả sẵn luồng này).
- **Hợp nhất consent về một bảng `policy_consents`** do P ghi tại Checkout (OT đọc khi tranh chấp). Bỏ `TermsAcceptance` ở giỏ hàng.
- **Quyết định về "cọc":** hoặc bỏ, hoặc chuyển thành quy tắc của P: khách High Risk → khóa COD, bắt buộc trả trước 100%. Cách sau đơn giản và dùng lại được cơ chế khóa COD sẵn có (FR-P-12).
- **Định nghĩa rõ ranh giới sản phẩm:** Catalog chỉ chứa hàng IN_STOCK có giá riêng; mẫu Studio là CUSTOM đồng giá. Nút "Customize This" trên PDP dẫn sang DES (nếu sản phẩm có mẫu tương ứng).
- **Chốt chính sách giỏ vãng lai** (khuyến nghị: cho phép, lưu localStorage, đồng bộ khi đăng nhập theo Guest Session Contract ở mục 1.2).

### 3.3. Gợi ý cải tiến quy trình

**Edge case**
- Giá đổi giữa lúc thêm giỏ và lúc Checkout: SH nên lưu `price_at_add` trên CartItem để P hiển thị chênh lệch (FR-P-03 đã yêu cầu nhưng SH chưa lưu dữ liệu này).
- Sản phẩm ngừng bán khi đang nằm trong giỏ/"Lưu để mua sau": hiển thị trạng thái và gợi ý thay thế, không xóa im lặng.
- Hết hàng phôi cho một dòng máy cụ thể trong khi mẫu thiết kế vẫn hợp lệ: cho phép "Báo khi có hàng".
- Nhiều tab/thiết bị sửa giỏ (đã có EXC Flow 1) – cần nói rõ dùng `version` hay `updated_at`.
- Khách High Risk: quy tắc gỡ cờ tự động sau X đơn hoàn tất, tránh "gắn cờ vĩnh viễn".

**CX touchpoint**
- Trên PDP, gợi ý chéo "Tự thiết kế phiên bản của riêng bạn" (dẫn DES với mẫu gần nhất) – nối hai hành trình mua hàng có sẵn và custom.
- Giỏ hàng hiển thị **ngày giao dự kiến** sớm (lấy từ quy tắc EDD của OT) và cảnh báo "đơn có hàng custom sẽ không dùng được COD/Hỏa tốc" *trước* khi vào Checkout, tránh bất ngờ ở bước thanh toán.
- Mini-cart/toast sau khi thêm giỏ có nút "Thanh toán ngay" và "Tiếp tục mua".
- Nhắc giỏ bỏ dở (qua Notification) cho thành viên.

**Data foundation**
- Bảng `catalog_events` (xem PDP, xoay 3D, đổi dòng máy, thêm giỏ, lưu để mua sau, xóa khỏi giỏ) gắn `session_id`/`user_id` → phễu Browse → Cart.
- Lưu `filter_log` có cấu trúc (bộ lọc, số kết quả, có click hay không) – hợp nhất với `search_logs` của SRCH thành một nguồn "ý định khách hàng".
- Lưu `cart_snapshots` khi khách rời giỏ → phân tích giỏ bỏ dở theo dòng máy/giá.
- `RiskProfile` cần lưu lịch sử thay đổi (`risk_profile_history`) để đánh giá hiệu quả chính sách chống hủy.

---

## 4. Payment (P)

### 4.1. Vấn đề silo

| # | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| Y1 | 🔴 | **Không có năng lực hoàn tiền**, trong khi CS (FR-CS-10) "gửi yêu cầu hoàn tiền sang Payment" và DES "Payment Gateway hoàn 100%". Chỉ OT có mô hình `RefundRequest` (Admin chuyển khoản thủ công). | FR-P-*; FR-CS-10; DES tiểu quy trình 2; FR-OT-13 |
| Y2 | 🔴 | **Đơn dở dang không có trạng thái tương ứng ở OT.** FR-P-24/25 giữ `orderCode` khi thanh toán thất bại và cho "thanh toán tiếp từ Đơn hàng của tôi", nhưng BPMN-P chỉ gọi `place_order` *sau khi* thanh toán thành công, và OT không có `Pending_Payment` (chỉ DES có). Đơn tồn tại ở đâu trong 15 phút chờ? | FR-P-24, 25; BPMN-P; CD-OT `OrderStatus` |
| Y3 | 🟠 | **Mô hình trạng thái thứ ba:** BR-P-13 tách 4 nhóm (`orderStatus`, `paymentStatus`, `productionStatus`, `shippingStatus`), khác `OrderStatus` đơn nhất của OT và `OrderStatusDetail` của DES. `OrderStatusLog` được định nghĩa ở cả P (FR-P-30) và OT. | BR-P-13; FR-P-30; CD-OT |
| Y4 | 🟠 | **Sổ voucher nằm trong Payment** (bảng `vouchers`, 1 mã/đơn) nhưng voucher còn được phát bởi PM, CS, Loyalty. | BR-P-12; FR-PM-05; FR-CS-10; FR-OT-18 |
| Y5 | 🟠 | **Giữ chỗ tồn kho 15 phút** (BR-P-09) nhưng không có phân hệ Inventory để giữ chỗ. | BR-P-09; FR-P-19..21 |
| Y6 | 🟡 | Thời gian giao không khớp OT: P nói "+2 đến +4 ngày (24h in UV + 1–2 ngày vận chuyển)"; OT nói đơn custom xử lý 2–3 ngày làm việc + chốt mẻ 16:00. EDD do OT tính hay P tính? | FR-P-06; FR-OT-04, Bảng 3.5 |
| Y7 | 🟡 | FR-P-08 truy vết BR-P-17 (không tồn tại); BR-P-14 chưa có FR. Thẻ "Cosmic Club +480 Stars" tham chiếu Loyalty chưa có tài liệu. | Bảng kiểm tra tự động; FR-P-27 |

### 4.2. Đề xuất khắc phục silo

- **Chọn một trong hai mô hình đơn dở dang** và ghi rõ trong cả P và OT:
  - *(Khuyến nghị)* `place_order` tạo đơn ở `Pending_Payment` **trước** khi chuyển sang SafePay, đồng thời giữ chỗ phôi/voucher; thanh toán thành công → `Pending_Review`/`Pending_Confirmation`; hết 15 phút → `Expired` (nhả kho, nhả voucher). OT bổ sung trạng thái `Pending_Payment` và `Expired`.
  - Hoặc: đơn chỉ là `CheckoutOrder` phía P cho đến khi thanh toán thành công – khi đó bỏ FR-P-25 vì OT không thể hiện đơn chưa tồn tại.
- **Bổ sung FR hoàn tiền cho P** (hoặc tạo phân hệ Refund riêng): nhận `RefundRequest` từ OT/CS/DES, đối soát với `PaymentTransaction`, chọn kênh hoàn (về nguồn thanh toán / chuyển khoản / voucher), trả kết quả về OT. OT giữ vai trò hiển thị tiến độ.
- **Thống nhất mô hình trạng thái:** OT sở hữu `order_status`; P sở hữu `payment_status`; giao vận (OT) sở hữu `shipment_status`. Một bảng `order_status_log` duy nhất do OT quản lý.
- **Tách Voucher thành dịch vụ chung** (mục 9); P chỉ gọi `validate()`/`redeem()`/`release()`.
- **EDD:** P chỉ cung cấp thời gian vận chuyển theo địa chỉ & gói giao; OT tính EDD và trả về cho P hiển thị – một công thức duy nhất.

### 4.3. Gợi ý cải tiến quy trình

**Edge case**
- Callback thanh toán thành công đến *sau khi* hết 15 phút giữ chỗ: phải có quy tắc (tạo lại giữ chỗ nếu còn hàng, ngược lại tự hoàn tiền) – hiện chưa có.
- Khách thanh toán hai lần cho cùng một đơn (hai tab, thử lại nhanh): cần đối soát trùng và tự tạo RefundRequest cho giao dịch thừa.
- Voucher hết hạn/hết lượt đúng lúc đang ở màn gián đoạn: thông báo rõ và tính lại tổng tiền trước khi thử lại.
- Địa chỉ ngoài vùng Hỏa tốc sau khi khách đổi địa chỉ: tự chuyển về Giao tiêu chuẩn và báo chênh lệch phí.
- Giỏ hỗn hợp (IN_STOCK + CUSTOM): gợi ý "tách đơn" để hàng có sẵn được giao Hỏa tốc/COD, thay vì khóa toàn bộ.

**CX touchpoint**
- Giải thích *tại sao* COD/Hỏa tốc bị khóa ngay trên thẻ sản phẩm custom trong tóm tắt đơn, kèm tùy chọn tách đơn.
- Màn gián đoạn: hiển thị đồng hồ 15:00 kèm *những gì đang được giữ* ("Phôi iPhone 15 Pro Max và mã CASEFIRST đang được giữ cho bạn").
- Trang thành công: nút "Thêm vào lịch" cho EDD và đăng ký nhận thông báo theo kênh mong muốn (email/Zalo/in-app).
- Email xác nhận dùng chung template và Notification service với OT để nội dung nhất quán.

**Data foundation**
- `checkout_funnel_events` (vào checkout, sửa địa chỉ, đổi gói giao, áp/gỡ voucher, chọn phương thức, bị khóa COD, thanh toán thất bại – lý do, thử lại, hết hạn) – FR-P-32 đã nêu nhưng cần schema cụ thể.
- `payment_transactions` lưu mọi lần thử (không chỉ lần cuối) với `attempt_no`, `channel`, `failure_code`, `latency_ms` → đo tỷ lệ thành công theo cổng/ví.
- `voucher_redemptions` (mã, đơn, giá trị giảm, nguồn phát hành) → ROI khuyến mãi.
- Lưu `price_snapshot` và `cart_vs_checkout_diff` để đo tần suất thay đổi giá/tồn kho giữa giỏ và checkout.

---

## 5. Design Studio (DES)

### 5.1. Vấn đề silo

| # | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| D1 | 🔴 | **Trùng quy trình kiểm duyệt với OT và quy tắc khác nhau:** DES chỉ đưa đơn có **ảnh tải lên** vào hàng chờ (đơn custom không có ảnh đi thẳng `Pending_Confirmation`); OT đưa **mọi** đơn custom vào `Pending_Review`. Người duyệt: DES = Admin, OT = Operator. Lớp: DES `ModerationQueueItem`/`DesignReview` vs OT `ModerationReview`. | Tiểu quy trình 2 DES; FR-DES-27; FR-OT-15 |
| D2 | 🔴 | **Hoàn tiền tự động qua Payment Gateway** (`create_refund(S2)`) – mâu thuẫn OT FR-OT-13 "không hoàn tiền tự động, Admin chuyển khoản". | Tiểu quy trình 2 DES; FR-OT-13 |
| D3 | 🟠 | **Định nghĩa lại thương mại:** package `CartOrder` có `Cart`, `CartItem`, `Order`, `OrderItem`, `RefundRequest`, và enum `OrderStatusDetail` riêng (có `Pending_Payment`, `Production_Completed`, `Shipped`, `Customer_Cancelled`; thiếu `Ready_for_Pickup`, `In_Transit`, `Delivery_Failed`) – trùng với SH, P, OT. | CD-DES; enum DES |
| D4 | 🟠 | **Gợi ý theo mô tả trùng với SRCH và quy tắc ngược nhau:** FR-DES-06 hiển thị mẫu thịnh hành khi không khớp; SRCH FR-SRCH-EX-01 cấm trả kết quả ngẫu nhiên, chỉ hiện thông báo + câu mẫu + nút tự thiết kế. | FR-DES-05, 06; FR-SRCH-07, EX-01 |
| D5 | 🟠 | **Quy tắc ảnh khác SRCH và SH:** DES PNG/JPG, > 10MB nén; SRCH JPG/PNG/WebP ≤ 5MB; SH PNG/JPG. | FR-DES-14; FR-SRCH-08; UC-SH-02 |
| D6 | 🟡 | Ngưỡng DPI không thống nhất: DES < 150 DPI cảnh báo; P hiển thị "Đạt chuẩn 300 DPI". UC-DES-01..05 chưa có user story liên kết. | FR-DES-15; FR-P-17 |
| D7 | 🟡 | Telemetry (FR-DES-23) độc lập với log của SRCH, SH, P – không có schema sự kiện chung. | FR-DES-23 |

### 5.2. Đề xuất khắc phục silo

- **Chốt OT là chủ sở hữu kiểm duyệt.** DES chỉ: (a) gắn cờ `requires_moderation` và lý do (có ảnh tải lên, có chữ tự nhập…) vào line item; (b) cung cấp hành động "Mở lại Canvas → resubmit_design()". Thống nhất **một** quy tắc vào hàng chờ (khuyến nghị: mọi đơn custom có ảnh tải lên **hoặc** chữ tự nhập; đơn chỉ dùng mẫu nguyên bản có thể duyệt nhanh/tự động) và **một** vai trò người duyệt. Xóa `ModerationQueueItem`/`DesignReview` khỏi DES, dùng `ModerationReview` của OT.
- **Bỏ hoàn tiền tự động** trong DES; khi khách "Hủy đơn & Hoàn tiền 100%", DES gọi `OT.cancelRejectedOrder()` → OT tạo `RefundRequest(S2)`.
- **Thu hẹp package CartOrder** của DES thành các tham chiếu (`design_id`, `base_sku_code`, `print_file_url`); dùng `OrderStatus` của OT.
- **Chuyển "Gợi ý theo mô tả" về SRCH** (FR-SRCH-07 đã bao trùm); DES chỉ nhúng component của SRCH và nhận `?y=`. Quyết định chung một hành vi khi không khớp (khuyến nghị: thông báo + câu mẫu + *tối đa 4 mẫu thịnh hành có ghi rõ "Mẫu đang được yêu thích", không giả làm kết quả phù hợp*).
- **Một bảng quy tắc ảnh dùng chung** (định dạng, dung lượng, DPI cảnh báo vs DPI chuẩn) cho DES, SRCH, CS (ảnh minh chứng).

### 5.3. Gợi ý cải tiến quy trình

**Edge case**
- Khách mở cùng một bản vẽ ở hai tab/thiết bị: lưu ngầm 60 giây có thể ghi đè – cần `version` và cảnh báo xung đột.
- Thiết kế đang nằm trong giỏ/đơn rồi khách tiếp tục sửa: phải **đóng băng snapshot** khi thêm giỏ (US-DES-17 đã gợi ý) và báo rõ "Thay đổi này không áp dụng cho sản phẩm đã ở trong giỏ".
- Mẫu gốc bị vô hiệu hóa do khiếu nại bản quyền (DMCA) sau khi khách đã lưu/đặt: quy tắc với bản vẽ đã lưu và đơn đang xử lý.
- localStorage đầy hoặc bị chặn (chế độ ẩn danh): cảnh báo khách vãng lai rằng bản nháp có thể mất.
- Dòng máy ngừng hỗ trợ (phôi ngừng sản xuất) khi khách mở lại bản vẽ cũ.
- Gửi duyệt lại lần 3: thông báo trước ở lần 2 rằng "Đây là lần chỉnh sửa cuối".

**CX touchpoint**
- Kiểm tra trước (pre-check) khi thêm giỏ: chạy bộ lọc từ cấm + DPI + vùng in an toàn và hiển thị "Thiết kế đã sẵn sàng in" – giảm tỷ lệ bị từ chối ở OT.
- Ước lượng thời gian duyệt ("Thường được duyệt trong 4 giờ làm việc") ngay khi đặt đơn custom.
- Khi bị từ chối: đánh dấu trực tiếp **layer vi phạm** trên Canvas khi mở lại, thay vì chỉ nêu nhóm vi phạm.
- "Chia sẻ bản thiết kế" (ảnh preview + link) – kênh lan truyền tự nhiên cho sản phẩm cá nhân hóa.

**Data foundation**
- Lưu `design_versions` (mỗi lần lưu/gửi duyệt) thay vì chỉ bản hiện tại → phân tích hành vi chỉnh sửa và đối chiếu khi khiếu nại (CS cần "thiết kế gốc").
- `design_events` theo schema sự kiện chung (mục 9): nguồn vào Studio (`entry_source`: landing / search `?y=` / onboarding / my-designs), mẫu áp dụng, công cụ dùng, thời gian trên Canvas, điểm bỏ dở.
- Lưu **`template_id` gốc** xuyên suốt tới `order_item` → đo "mẫu nào tạo ra doanh thu" và "mẫu nào hay bị từ chối/khiếu nại".
- Gắn `violation_group` có cấu trúc vào mọi lần từ chối → huấn luyện/hiệu chỉnh bộ lọc tự động sau này (FR-DES-30 hướng CV/OCR).

---

## 6. Order Tracking (OT)

> OT là phân hệ tích hợp tốt nhất; các góp ý chủ yếu nhằm biến OT thành **nguồn sự thật duy nhất** về đơn hàng.

### 6.1. Vấn đề silo

| # | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| O1 | 🔴 | **Phụ thuộc phân hệ chưa tồn tại:** `LoyaltyService`, `NotificationService`, `PaymentService.getTransactionRef/confirmRedeliveryFee`, `RiskProfileService` – trong đó Loyalty và Notification không có tài liệu, Payment không có API hoàn tiền/thu cước giao lại. | CD-OT; FR-OT-09, 12, 18 |
| O2 | 🟠 | **Danh sách lý do/kết quả khiếu nại khác CS** (`IssueType`, `Resolution` vs lý do và trạng thái ticket của CS) – xem chi tiết mục 7. | CD-OT; CD-CS |
| O3 | 🟠 | **Thiếu trạng thái `Pending_Payment`/`Expired`** để khớp luồng đơn dở dang của P. | CD-OT; FR-P-24, 25 |
| O4 | 🟠 | **Không có mô hình tồn kho** dù "hoàn kho & voucher" xuất hiện trong nhiều nhánh hủy. | BPMN-OT-2 |
| O5 | 🟡 | BPMN-OT-2: `tk55` không có luồng ra (dead end). Kiểu khóa chính `String` khác AUTH (UUID). `Customer`, `Admin` khai báo `<<external>>` nhưng chưa có phân hệ nào cung cấp `Admin`. | Bảng kiểm tra tự động; CD-OT |

### 6.2. Đề xuất khắc phục silo

- Viết **spec interface tối thiểu** cho các dịch vụ OT đang gọi (Loyalty, Notification, Refund, Inventory) – mỗi interface: sự kiện vào/ra, payload, quy tắc idempotent. OT đã có `RetryQueueItem` – dùng lại làm "outbox" chung.
- Công bố **`OrderStatus` của OT là enum chính thức** (bổ sung `Pending_Payment`, `Expired`), yêu cầu DES và P tham chiếu.
- Thống nhất với CS một **từ điển chung** `IssueType`/`Resolution` (mục 7.2).
- Sửa dead end `tk55`; chuyển khóa chính sang UUID.

### 6.3. Gợi ý cải tiến quy trình

**Edge case**
- Đơn hỗn hợp: một phần bị lỗi QC phải in lại trong khi hàng có sẵn đã đóng gói – có cho **tách kiện** không? (hiện quy tắc là "giao chung một kiện", có thể làm trễ cả đơn).
- Khách đổi địa chỉ giao sau khi đặt (trước `Ready_for_Pickup`): chưa có luồng.
- Webhook `Delivered` đến khi đơn đang có yêu cầu hủy chờ CSKH: quy tắc ưu tiên.
- Khách báo "Không nhận được hàng" nhưng 3PL báo `Delivered`: cần bằng chứng giao (ảnh, chữ ký) từ 3PL.
- Thu hồi điểm Loyalty khi khách đã tiêu điểm (số dư âm): quy tắc xử lý.
- Chốt mẻ 16:00 rơi vào ngày nghỉ lễ: lịch làm việc (`business_calendar`) cần được định nghĩa để EDD chính xác.

**CX touchpoint**
- Thông báo chủ động ở mỗi mốc (duyệt xong, vào mẻ in, giao cho 3PL kèm mã vận đơn, sắp giao) – hiện chỉ có thông báo ở ngoại lệ.
- Cảnh báo **sớm** khả năng giao trễ (khi đơn chưa rời kho lúc gần EDD) thay vì chỉ cấp voucher sau khi đã trễ.
- Trang theo dõi đơn công khai bằng mã đơn + SĐT (cho người nhận quà không có tài khoản).
- Mời đánh giá kèm ảnh thực tế sản phẩm → nguồn nội dung UGC cho PDP.

**Data foundation**
- `order_status_log` là bảng sự thật về thời gian từng giai đoạn → đo **SLA nội bộ**: thời gian duyệt, thời gian in, thời gian đóng gói, thời gian 3PL – theo dòng máy, loại đơn, Operator.
- Lưu `edd_original` và `edd_revised` (kèm lý do điều chỉnh) → đo độ chính xác EDD.
- `delivery_attempts` với `failure_cause` có cấu trúc → phân tích theo khu vực, đơn vị vận chuyển.
- `reviews` gắn `order_item_id`, `template_id`, `phone_model` → điểm chất lượng theo mẫu và dòng máy.
- Chuẩn hóa `CancelReason`/`CancelCause` thành bảng tham chiếu dùng chung với SH (RiskProfile) và báo cáo.

---

## 7. Customer Service (CS)

> CS là **phân hệ cô lập nhất**: mô hình dữ liệu riêng, trạng thái riêng, và tham chiếu những phân hệ không tồn tại hoặc không đảm nhận đúng việc.

### 7.1. Vấn đề silo

| # | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| C1 | 🔴 | **Điều kiện khiếu nại mâu thuẫn OT.** CS: đơn `Delivered`, trong hạn, mỗi **OrderItem** một ticket mở. OT: 7 ngày kể cả đơn **Completed**, kể cả **Delivery_Failed** đang lưu kho (tranh chấp nguyên nhân, FR-OT-EX-03), mỗi **đơn** một yêu cầu mở. | UC-CS-01 PRE; FR-CS-03; FR-OT-11, EX-03 |
| C2 | 🔴 | **Không có luồng trả kết quả về OT.** OT FR-OT-16 chờ nhận kết quả từ CS; BPMN/UCD của CS chỉ gửi sang "Production", "Promotion", "Payment". | BPMN-CS; UCD-CS; FR-OT-16 |
| C3 | 🔴 | **Tham chiếu phân hệ không đúng:** "Production (In ấn)" không phải phân hệ (sản xuất nằm trong OT); hoàn tiền gửi "Payment" nhưng P không có FR hoàn tiền. | UCD-CS; FR-CS-10 |
| C4 | 🟠 | **Từ điển không khớp:** lý do CS (Hỏng hóc, Sai màu, In lệch, Sai dòng máy) vs `IssueType` OT (Print_Defect, Wrong_Design_Or_Model, Damaged_In_Transit, Not_Received, Dispute_Failure_Cause). Trạng thái ticket CS (NEW…APPROVED_REPRINT…RESOLVED) vs `Resolution` OT (Reprint, Voucher, Refund, Rejected). | CD-CS; CD-OT |
| C5 | 🟠 | **Mô hình danh tính riêng:** khóa chính `int`, lớp `User{role}`, `OrderItem` tự định nghĩa. | CD-CS |
| C6 | 🟠 | **Xử lý yêu cầu hủy đơn đã thanh toán** (OT FR-OT-19 giao cho CSKH) và **tranh chấp nguyên nhân giao thất bại** (FR-OT-EX-03) **không có trong tài liệu CS**. | FR-OT-19, EX-03; UC-CS-* |
| C7 | 🟡 | Mã FR trong BPMN-CS lệch so với bảng FR (ví dụ "Gọi AI (FR-CS-06)" trong khi AI là FR-CS-08; "Tạo Ticket (FR-CS-03)" trong khi tạo ticket là FR-CS-04). Notification Service không có tài liệu. | BPMN-CS |

### 7.2. Đề xuất khắc phục silo

- **Đồng bộ điều kiện khiếu nại theo OT** (OT sở hữu đơn): CS gọi `OT.canReportIssue(orderId)` thay vì tự kiểm tra; chấp nhận cả `Completed` (≤ 7 ngày) và `Delivery_Failed` (tranh chấp). Chốt "một yêu cầu mở mỗi đơn" hoặc "mỗi item" – khuyến nghị **mỗi item** (đơn nhiều sản phẩm có thể lỗi riêng) và cập nhật OT tương ứng.
- **Bổ sung message flow "Kết quả ticket → OT"** trong BPMN-CS: `TicketResolved{orderId, itemId, resolution, amount}`. OT là bên thực thi: in lại (quay về `In_Production`), gửi lại, tạo `RefundRequest`; CS **không** gọi trực tiếp Production/Payment.
- **Từ điển chung** do một bên sở hữu (khuyến nghị CS), OT tham chiếu:
  - `IssueType`: Print_Defect, Wrong_Color, Misaligned_Print, Wrong_Phone_Model, Damaged_In_Transit, Not_Received, Dispute_Failure_Cause.
  - `Resolution`: Reprint, Resend, Voucher, Refund, Rejected.
- **Bỏ mô hình danh tính riêng:** dùng `user_id (UUID)` + vai trò từ AUTH; `order_item_id` tham chiếu OT.
- **Bổ sung 2 UC mới cho CS:** "Xem xét yêu cầu hủy đơn đã thanh toán" (SLA 1 ngày làm việc, FR-OT-19, EX-16) và "Phân xử tranh chấp nguyên nhân giao thất bại" (FR-OT-EX-03). Có thể gom vào một **hàng chờ CSKH hợp nhất** với 3 loại: khiếu nại, yêu cầu hủy, tranh chấp giao hàng.
- Rà lại mã FR trong BPMN-CS.

### 7.3. Gợi ý cải tiến quy trình

**Edge case**
- Khách gửi khiếu nại cho đơn đã được hoàn tiền một phần/đã nhận voucher đền bù trước đó: chặn đền bù trùng theo `order_item_id`.
- In lại (Reprint) cũng bị lỗi: quy tắc leo thang (lần 2 → hoàn tiền tự động đề xuất).
- Khách không bổ sung thông tin đúng hạn rồi gửi lại ticket mới: liên kết với ticket cũ thay vì tạo mới.
- AI đề xuất voucher vượt hạn mức: đã có EXC – cần định nghĩa **hạn mức theo vai trò** (CSKH vs quản lý CSKH).
- Bằng chứng ảnh/video có thể bị chỉnh sửa hoặc lấy từ mạng: kiểm tra metadata/hash trùng giữa các ticket.
- Tài khoản khách ở trạng thái `PENDING_DELETION` có ticket mở: phải chặn xóa (liên kết với PM).

**CX touchpoint**
- Form khiếu nại có **hướng dẫn chụp ảnh** theo từng loại lỗi (in lệch: chụp thẳng mặt lưng; sai dòng máy: chụp cụm camera) → giảm vòng "Yêu cầu bổ sung".
- Cho khách **chọn phương án mong muốn** (in lại / hoàn tiền / voucher) ngay khi gửi – giúp Admin quyết định nhanh và khách thấy được tôn trọng.
- Hiển thị SLA phản hồi dự kiến trên timeline ("Sẽ phản hồi trước 17:00 ngày 21/11").
- Khảo sát CSAT ngắn (1 câu + sao) ngay khi ticket đóng, kèm câu hỏi "Bạn có tiếp tục mua không?" (NPS rút gọn).

**Data foundation**
- `ticket_status_history` đã có – bổ sung các mốc SLA (`first_response_at`, `resolved_at`, `sla_breached`) để đo hiệu suất CSKH.
- Gắn ticket với `template_id`, `phone_model`, `base_sku_code`, **`production_batch_id`** (mẻ in), `operator_id` → phân tích QC theo lô phôi/mẻ in/người in (FR-CS-11 cần dữ liệu này nhưng hiện chưa có nguồn cung cấp – OT phải lưu `batch_id`).
- Lưu `ai_analysis` kèm `final_decision` của Admin → đo độ chính xác của AI và tinh chỉnh mô hình.
- Chi phí đền bù có cấu trúc (`compensation_cost`, loại) → báo cáo chi phí chất lượng (Cost of Poor Quality).

---

## 8. Search (SRCH)

> SRCH được thiết kế tốt nhất về mặt tích hợp (interface `SearchSource`, phân hệ không phụ thuộc nhau). Vấn đề chủ yếu nằm ở **các phân hệ khác chưa cập nhật theo SRCH**.

### 8.1. Vấn đề silo

| # | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| R1 | 🔴 | **Mâu thuẫn quyền riêng tư với SH:** SRCH xử lý ảnh hoàn toàn trên trình duyệt; SH gửi ảnh lên AI server và lưu `AestheticProfile`. Một trong hai phải thay đổi. | BR-SRCH-06; UC-SH-02 |
| R2 | 🟠 | **Hành vi "không khớp" khác DES** (xem D4). | FR-SRCH-EX-01; FR-DES-06 |
| R3 | 🟠 | **Nhật ký tìm kiếm tách biệt:** `SearchLogEntry` của SRCH, `SearchLog` của SH, telemetry của DES – ba nơi ghi cùng một loại ý định khách hàng. | FR-SRCH-12; UC-SH-02; FR-DES-23 |
| R4 | 🟠 | **Nguồn "trang chính sách, CSKH" gắn vào OrderTracking** (`OrderTrackingSearchSource`) – nội dung hỗ trợ/FAQ không có chủ sở hữu rõ (OT có trang chính sách, CS có CSKH). | CD-SRCH |
| R5 | 🟡 | Enum `SearchMode` chỉ có KEYWORD, DESCRIBE trong khi văn bản nêu 3 chế độ (thiếu IMAGE). Thống kê từ khóa (FR-SRCH-12) có ở tầng service nhưng không có giao diện quản trị → dữ liệu thu thập nhưng không ai dùng. | CD-SRCH; FR-SRCH-12 |

### 8.2. Đề xuất khắc phục silo

- **Ra quyết định chính thức về tìm kiếm bằng ảnh** (khuyến nghị giữ nguyên hướng xử lý tại trình duyệt của SRCH, xóa UC-SH-02). Nếu muốn hồ sơ thẩm mỹ, chỉ lưu **bảng màu đã trích xuất** (không lưu ảnh) và chỉ khi khách đăng nhập + đồng ý rõ ràng – cập nhật BR-SRCH-06 cho khớp.
- **SRCH sở hữu nhật ký ý định** (`search_logs`) cho mọi chế độ (từ khóa, mô tả, ảnh, bộ lọc Shop); SH và DES ghi qua `SearchService.log()`.
- **Tạo nguồn `HelpCenterSearchSource`** cho chính sách/FAQ, chủ sở hữu nội dung là CS (hoặc một mục "Nội dung" riêng); OT chỉ cung cấp trang Chính sách đơn hàng như một mục trong đó.
- Bổ sung `IMAGE` vào `SearchMode`; đưa thống kê từ khóa vào dashboard quản trị (dùng chung khung dashboard với CS-QC).

### 8.3. Gợi ý cải tiến quy trình

**Edge case**
- Từ khóa chứa thông tin cá nhân (SĐT, email, mã đơn): **không ghi vào nhật ký** dạng thô – che hoặc chỉ ghi loại ("ORDER_CODE") để đảm bảo BR-SRCH-06.
- Mã đơn đúng định dạng nhưng của khách khác: đã có (FR-SRCH-EX-05) – bổ sung giới hạn tần suất để tránh dò mã đơn.
- Từ khóa tiếng Anh hoặc teencode ("cute", "cat", "dthw"): mở rộng từ điển đồng nghĩa.
- Dòng máy không còn hỗ trợ (ví dụ "iphone 8"): thông báo rõ thay vì trả kết quả rỗng.
- Ảnh có quá nhiều màu (ảnh phong cảnh phức tạp) cho độ tương đồng thấp với mọi mẫu: giải thích giới hạn và gợi ý chuyển sang mô tả bằng lời.

**CX touchpoint**
- Cá nhân hóa gợi ý trước khi gõ theo **dòng máy và sở thích từ Onboarding** (PM) và `caseyes_active_model` (DES).
- Lọc kết quả theo dòng máy đã nhận diện (FR-SRCH-05) – hiển thị chip "Chỉ hiện mẫu cho iPhone 15 Pro Max" có thể tắt.
- Khi không có kết quả, ngoài "Tự thiết kế", cho phép **"Gửi ý tưởng cho shop"** (đăng ký nhận thông báo khi có mẫu) – vừa giữ khách vừa thu dữ liệu nhu cầu.

**Data foundation**
- Bổ sung vào `search_logs`: `normalized_query`, `detected_phone_model`, `detected_concepts`, `result_count` theo nhóm, `clicked_item_id`, `click_position`, `led_to_cart` (gắn qua `session_id`) → đo **search-to-cart conversion** và chất lượng xếp hạng.
- Danh sách **truy vấn không có kết quả** được tổng hợp hàng tuần làm đầu vào cho đội thiết kế mẫu mới (nối SRCH → DES Catalog).
- Lưu phiên bản bộ trọng số xếp hạng (`ranking_version`) để so sánh A/B.

---

## 9. Đề xuất xuyên phân hệ

### 9.1. Ma trận chủ sở hữu (một năng lực – một chủ)

| Năng lực | Chủ sở hữu đề xuất | Phân hệ khác chỉ làm |
|---|---|---|
| Danh tính khách & nhân viên, vai trò | AUTH | Tham chiếu `user_id` + `role` |
| Onboarding, hồ sơ, sổ địa chỉ | PM | Đọc |
| Tìm kiếm & nhật ký ý định | SRCH | Khai báo `SearchSource`, gọi `log()` |
| Catalog hàng có sẵn, giỏ hàng | SH | – |
| Mẫu thiết kế, Canvas, bản vẽ | DES | – |
| Checkout, giao dịch thanh toán, consent đặt hàng | P | – |
| Vòng đời đơn, kiểm duyệt, sản xuất, giao vận, EDD | OT | Đọc trạng thái, gửi sự kiện |
| Khiếu nại, yêu cầu hủy, tranh chấp, FAQ | CS | – |
| **Tồn kho** (mới) | Inventory service | `reserve()`, `commit()`, `release()` |
| **Hoàn tiền** (mới hoặc giao cho P) | Refund service | Tạo `RefundRequest` |
| **Voucher & Loyalty** (mới) | Promotion/Loyalty service | `issue()`, `validate()`, `redeem()`, `earn()`, `revoke()` |
| **Thông báo** (mới) | Notification service | Phát sự kiện, không tự gửi email |

### 9.2. Từ điển dữ liệu chung

- **Khóa chính:** UUID cho mọi thực thể; mã hiển thị (`order_code`, `ticket_code`, `design_code`) là trường riêng.
- **Một enum `OrderStatus`** (của OT) + `PaymentStatus` (của P) + `ShipmentStatus` (của OT).
- **Bảng tham chiếu dùng chung:** `phone_models`, `base_skus`, `issue_types`, `cancel_reasons`, `violation_groups`, `policy_versions`.
- **Một bảng quy tắc ảnh:** định dạng, dung lượng tối đa, ngưỡng DPI cảnh báo/chuẩn – dùng cho DES, SRCH, CS.

### 9.3. Lược đồ sự kiện hành vi chung (nền tảng dữ liệu)

Thay vì mỗi phân hệ một kiểu log (FR-DES-23, FR-P-32, FR-SRCH-12, UC-SH-01 bước 5, FR-OT-14), dùng **một bảng `analytics_events`**:

| Trường | Ý nghĩa |
|---|---|
| `event_id` (UUID) | Khóa, chống trùng |
| `event_name` | Theo quy ước `module.object.action` – ví dụ `search.query.submitted`, `design.canvas.saved`, `checkout.payment.failed`, `order.status.changed` |
| `occurred_at` | Thời điểm |
| `session_id` / `user_id` | Nối hành trình trước và sau đăng nhập |
| `module` | AUTH / PM / SH / P / DES / OT / CS / SRCH |
| `entity_type`, `entity_id` | design / order / ticket / template… |
| `properties` (JSON) | Thuộc tính riêng của sự kiện |
| `schema_version` | Quản lý thay đổi |

Nguyên tắc: không ghi thông tin định danh thô vào `properties`; ghi bất đồng bộ (không chặn giao diện); có tài liệu danh mục sự kiện (event catalog) chung.

### 9.4. Bản đồ hành trình khách hàng end-to-end (CX)

Đề nghị nhóm BA bổ sung **một sơ đồ BPMN tổng thể cấp 0** (hiện chưa có) nối 8 phân hệ: Khám phá (SRCH/SH/DES) → Định danh (AUTH/PM) → Mua (SH/P) → Thực hiện đơn (OT) → Hậu mãi (CS/Loyalty). Mỗi điểm chuyển giao giữa hai phân hệ phải ghi rõ: sự kiện/API, payload, bên sở hữu dữ liệu, và hành vi khi bên nhận lỗi.

---

## 10. Lộ trình ưu tiên

| Ưu tiên | Hạng mục | Phân hệ liên quan |
|---|---|---|
| **P0 – trước khi tích hợp** | Xóa bản FR-DES lỗi thời trong `ba_v2`; chốt chủ sở hữu hủy đơn (OT), kiểm duyệt (OT), tìm kiếm (SRCH), consent (P) | SH, DES, OT, SRCH, P |
| **P0** | Thống nhất `OrderStatus` (bổ sung `Pending_Payment`, `Expired`) và luồng đơn dở dang | P, OT, DES |
| **P0** | Đồng bộ điều kiện & từ điển khiếu nại; thêm luồng "Kết quả ticket → OT" | CS, OT |
| **P1** | Spec interface: Inventory, Refund, Voucher/Loyalty, Notification | Tất cả |
| **P1** | Mô hình nhân viên & phân quyền trong AUTH; chốt PM sở hữu Onboarding | AUTH, PM, OT, CS |
| **P1** | Quyết định tìm kiếm bằng ảnh và quyền riêng tư | SRCH, SH |
| **P2** | Lược đồ `analytics_events` chung và event catalog | Tất cả |
| **P2** | Bổ sung class diagram cho PM, SH; sửa các lỗi truy vết (BR thiếu FR, FR trỏ BR không tồn tại, dead end BPMN-OT-2) | PM, SH, P, OT, CS |
| **P3** | Các cải tiến CX và edge case trong từng mục 1–8 | Từng phân hệ |
