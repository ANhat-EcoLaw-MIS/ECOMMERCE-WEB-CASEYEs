# Kiểm toán dữ liệu mock và kế hoạch chuyển sang Supabase

> Phạm vi: nhánh `integration/connect-functions`, ngày 2026-11-19. Báo cáo **chỉ đọc**: không sửa code, migration hay cơ sở dữ liệu.
> Nguồn đối chiếu:
> - `src/app/core/supabase/database.types.ts`
> - `supabase/migrations/*`
> - `supabase/rollbacks/*`
> - `supabase/tests/migrations.test.mjs`
> - `docs/BA_SPEC_V3_HOP_NHAT.md` (gọi tắt là **Spec**, dẫn số dòng dạng `Spec Lxxx`)
>
> Mọi đường dẫn mã nguồn ngắn đều tính từ `src/app/`. Mã migration viết tắt theo timestamp, ví dụ `…100400` là `20261114100400_order_rpcs.sql`.

---

## Mục lục
1. [Phase 1 — Lược đồ thật](#phase-1--lược-đồ-thật)
2. [Phase 2 — Các nguồn mock / ngoài DB](#phase-2--các-nguồn-mock--ngoài-db)
3. [Phase 3 — Toàn vẹn tham chiếu và dữ liệu ma](#phase-3--toàn-vẹn-tham-chiếu-và-dữ-liệu-ma)
4. [Phase 4 — Phân tích khoảng trống theo class diagram](#phase-4--phân-tích-khoảng-trống-theo-class-diagram)
5. [Phase 5 — Chiến lược sửa](#phase-5--chiến-lược-sửa)
6. [Phụ lục — Tóm tắt](#phụ-lục--tóm-tắt)

---

## Phase 1 — Lược đồ thật

### 1.1 Bảng

| Bảng | Tạo ở | Cột chính / ghi chú | RLS |
|---|---|---|---|
| `profiles` | `20261028030854:1-9`, sửa ở `20261029130000`, `…100000` | `id` (FK `auth.users`), `display_name`, `avatar_url`, `device_type`, `preferences text[]`, `onboarding_status` (NOT NULL, CHECK `completed\|skipped`), `role` (CHECK `customer\|operator\|cskh\|admin`, mặc định `customer`), `updated_at`. Cột `status` đã bị xoá (`20261029130000:19`). | Đọc/sửa/thêm dòng của chính mình. Grant theo cột (`20261029130000:63-68`); không có `role`. |
| `test` | `20261028143701:1-4` | `id`, `title` | Người đã đăng nhập đọc và thêm bất kỳ (bảng **chết**) |
| `phone_models` | `…060038:4-13` | `id uuid`, `brand`, `name`, `slug` unique, `custom_price int`, `mask_image_url`, `is_active` | Ai cũng đọc được dòng active (`…060355:16-17`) |
| `inventory_items` | `…060038:19-29` | `kind` (`blank\|material\|trade_good`), `phone_model_id`, `quantity_on_hand ≥ 0`; CHECK `blank_needs_phone_model`; unique index `one_blank_per_phone_model` (`:32-34`) | Không có policy, cố ý (`…060355:25`) |
| `products` | `…060054:4-14` | `slug` unique, `name`, `description`, `product_type` (`case\|accessory`), `image_url`, `gallery_urls`, `is_active` | Ai cũng đọc được dòng active |
| `product_variants` | `…060054:16-26` | `product_id`, `name`, `phone_model_id`, `inventory_item_id` NOT NULL, `price`, `is_active`; unique `(product_id, phone_model_id)` | Ai cũng đọc được dòng active |
| `addresses` | `…060153:3-14` | `user_id`, `recipient`, `phone`, `line`, `ward`, `district?`, `city`, `is_default` | Quản lý dòng của chính mình. **Không có ràng buộc một địa chỉ mặc định.** |
| `designs` | `…060204:3-12` | `user_id`, `phone_model_id` NOT NULL, `name`, `canvas_json jsonb NOT NULL`, `preview_url`, `created_at`, `updated_at` | `for all` trên dòng của mình (`…060355:42-44`) |
| `orders` | `…060224:4-18` và `…100100:88-123` | Snapshot địa chỉ; `status` enum; `status_detail` (12 mã); `payment_status` (`unpaid\|paid`); `payment_method`, `payment_channel`, `payment_txn_ref`; `order_code` unique; phí (`shipping_fee`, `standard_fee`, `express_surcharge`, `goods_total`, `discount`); EDD; các mốc thời gian; `ticket_id text`; `version` | Khách đọc đơn của mình; staff đọc tất cả (`…100100:242-243`) |
| `order_items` | `…060224:22-35` và `…100100:231-234` | `variant_id` / `design_id` (CHECK `one_source`), `inventory_item_id`, snapshot `name`/`image_url`/`unit_price`, `qty`, `phone_model text`, `design_version int default 1`, `is_custom` generated | Đọc dòng của mình hoặc staff |
| `order_status_history` | `…060224:39-45` và `…100100:174-178` | `status`, `status_detail`, `actor_type`, `actor_id`, `reason` | Đọc dòng của mình hoặc staff |
| `cancel_requests` | `…100200:7-21` | `reason` CHECK 5 giá trị; `status` (`pending\|accepted\|rejected\|withdrawn`); tối đa một yêu cầu `pending` mỗi đơn | Đọc dòng của mình hoặc staff |
| `refund_requests` | `…100200:23-44` | `situation` (`S1..S4`); `status` 6 giá trị; `refund_method` (`bank`); thông tin ngân hàng | Chủ đơn hoặc **admin** |
| `policy_consents` | `…100200:46-52` | `order_id` unique, `user_id`, `policy_version`, `accepted_at` | Dòng của mình hoặc staff |
| `design_reviews` | `…100200:54-65` | `round`, `decision` (`approved\|rejected`), `violation_group`, `reason`, `reviewer_id` | Dòng của mình hoặc staff |
| `shipments` | `…100200:67-73` | `carrier`, `tracking_code` unique | Dòng của mình hoặc staff |
| `delivery_attempts` | `…100200:75-84` | `attempt_no`, `result` (`delivered\|failed`), `failure_cause` | Dòng của mình hoặc staff |
| `webhook_events` | `…100200:87-93` | `event_id` PK (chống xử lý trùng) | Chỉ staff |
| `order_vouchers` | `…100200:95-105` | `kind` (`late_delivery\|express_surcharge\|complaint`), `code` unique, `value`, `expires_at`, `used_at` | Dòng của mình hoặc staff |
| `notifications` | `…100300:6-16` | `type` (`order\|design\|payment\|support`), `title`, `body`, `link`, `read_at`; có trong Realtime publication | Đọc dòng của mình; chỉ được sửa cột `read_at` |

- **View:** `stock_availability` (`…060038:37-44`) gồm `inventory_item_id` và `available`, chỉ có `blank` và `trade_good`. Quyền: SELECT.
- **Enum:**
  - `order_status` (`pending, confirmed, shipping, delivered, cancelled`)
  - `inventory_kind`
  - `product_type` (`…055948:1-3`)
- **Sequence:** `order_code_seq` (`…100100:86`).
- **Storage bucket** (`…060419:5-29`):
  - `product-images`: public, không ai được ghi.
  - `design-assets`: public đọc; người dùng ghi, sửa, xoá trong thư mục `<uid>/` của mình.

### 1.2 RPC

| Nhóm | Hàm (tham số) | Ai được gọi |
|---|---|---|
| Vai trò | `current_app_role()`, `is_staff()`, `require_role(variadic text[])` (`…100000:15-52`; `…090000_admin_all_roles:4-20` cho admin qua mọi role) | authenticated |
| Lịch | `vn_now()`, `is_working_day(date)`, `add_working_days(date,int)`, `working_days_between(date,date)`, `batch_date_for(timestamptz)` (`…100100:9-82`) | mặc định |
| Khách | `place_order(p_items jsonb, p_shipping jsonb) → uuid` (`…100400:116-236`), `cancel_order(uuid)`, `request_cancel(uuid,text,text)`, `withdraw_cancel_request(uuid)`, `resubmit_design(uuid)`, `cancel_rejected_order(uuid)`, `confirm_received(uuid)`, `report_issue(uuid, p_ticket_id text)`, `request_redelivery(uuid)`, `cancel_after_failure(uuid)`, `submit_refund_account(uuid,text,text,text)`, `list_open_orders()` | authenticated (`…100400:864-883`) |
| Staff | `decide_cancel_request(uuid,bool,text)`, `apply_ticket_result(uuid,text,text)`, `moderate_design(uuid,bool,text,text)`, `start_production() → int`, `mark_packed(uuid)`, `mark_qc_reprint(uuid)`, `apply_carrier_event(text,uuid,text,text)`, `approve_refund(uuid)`, `complete_refund(uuid,text)`, `mark_transfer_failed(uuid)`, `retry_transfer(uuid)`, `reject_refund(uuid,text)`, `resolve_dispute(uuid,bool,text)` (`…090000_ot_v9:86`) | authenticated, có kiểm tra `require_role` bên trong |
| Mô phỏng (admin) | `sim_time_travel(uuid,int)`, `sim_run_jobs()`, `sim_create_sample_order(text,text,text,text)` (`20261119090000:204-314`) | authenticated + `require_role('admin')` |
| Nội bộ | `lock_order`, `order_has_custom`, `order_on_hold`, `is_customer_fault`, `restock_order`, `restock_stock_items`, `create_refund`, `order_link`, `lock_refund`, `set_order_actor`, `log_order_note`, `notify`, `owns_order`, `run_order_jobs`, `run_order_jobs_v9`, `order_status_for`, `sync_order_status`, `log_order_status`, `handle_new_user`, `set_updated_at` | đã thu hồi quyền khỏi API (trừ `owns_order`) |
| Cron | `order-jobs` chạy mỗi phút, gọi `run_order_jobs_v9()` (`20261119090000:192-193`) | pg_cron |

### 1.3 Lệch giữa migration, `database.types.ts` và code

| # | Lệch | Bằng chứng | Mức |
|---|---|---|---|
| D1 | **`onboarding_status`** — Appendix B1 trong Spec, đã kiểm chứng. Cột NOT NULL, không có default, CHECK chỉ cho `completed`/`skipped`. Trigger `handle_new_user` hiện hành không gán cột này, nên đăng ký qua trigger **sẽ lỗi** trên DB dựng từ migration. Test phải tự thêm default `'skipped'` để chạy qua. App lại cần giá trị `pending`. Ngược lại, `database.types.ts` coi cột là tùy chọn khi insert, nên **DB live có thể đang có default mà không migration nào khai báo** (đã bị chỉnh tay trên dashboard?). | `20261029130000:14-17`; `20261105084918:8`; `migrations.test.mjs:42-43`; `core/auth/onboarding-status.ts:5,25,31`; `database.types.ts:875` | **P0** |
| D2 | `database.types.ts` thiếu các hàm của M9: `resolve_dispute`, `sim_time_travel`, `sim_run_jobs`, `sim_create_sample_order`, `restock_stock_items`, `run_order_jobs_v9`. App vẫn gọi chúng (`order-tracking.service.ts:177,182,188,981`). | so sánh `database.types.ts:1068-1290` với `20261119090000` | P0 (sinh lại types) |
| D3 | `20261105055948_enums.sql:12` tạo `handle_new_user` insert vào cột `full_name`, nhưng cột này không tồn tại. Một migration sau (`20261105084918`) ghi đè hàm. Dựng DB mới vẫn chạy được, nhưng ở giữa chuỗi migration có một trigger hỏng. | `…055948:5-20` | ghi nhận |
| D4 | Policy của profiles bị trùng: `profiles_select_own` / `profiles_update_own` (`20261105074913`) đè lên `read own profile` / `update own profile`. | `20261105074913:2-9` | dọn dẹp (E) |
| D5 | Chỉ có M1–M9 (`20261114…` trở đi) có file rollback; các migration trước đó không có. | `supabase/rollbacks/` | ghi nhận |
| D6 | `place_order` lấy `fee`, `discount`, `order_code` **do client gửi**. `order_code` từ client đè lên mã `CC-` do DB sinh. | `…100400:137-138,160-161` | **P0 (bảo mật)** |
| D7 | Đơn COD không bao giờ chuyển sang `paid`; `payment_status` chỉ được gán lúc insert. (Spec B18) | `…100400:173`; không có `update … payment_status` nào khác | P1 |
| D8 | RLS `manage own designs` cho khách sửa `canvas_json`/`preview_url` **sau khi** đơn đã đặt hoặc đã được duyệt. | `…060355:42-44` | P1 (lỗ hổng RLS) |
| D9 | `sim_create_sample_order` chèn design với `canvas_json '{}'` và lấy ảnh của shop làm preview. | `20261119090000:290-291` | P2 |
| D10 | Seed chỉ tạo variant ốp cho 9 dòng máy, bỏ sót `iphone-15-pro-max` và `xiaomi-14-ultra`. | `20261114100600:58-59` | **P0** (B5) |

---

## Phase 2 — Các nguồn mock / ngoài DB

**Phân loại:**
- **A** — nối vào bảng đã có
- **B** — cần bảng, cột hoặc RPC mới
- **C** — hệ thống ngoài: giữ mock nhưng phải có interface
- **D** — chỉ ở client là hợp lệ
- **E** — code chết hoặc trùng lặp: xoá

### 2.1 AUTH / PM (hồ sơ, onboarding)

| file:line | Nội dung | Thực thể BA | Loại | Đọc / ghi |
|---|---|---|---|---|
| `shared/utils/demo-user.ts:1` `DEMO_GOOGLE_EMAIL` và `features/auth/auth.ts:47` `MOCK_GOOGLE_PASSWORD` | Nút "Google" thực chất đăng nhập bằng mật khẩu | Google OAuth (Spec L65) | C | `auth.ts:179-206`, `security-tab.ts`, `onboarding-guard.ts:27` |
| `account/onboarding/onboarding-presets.ts:3` `STYLE_PRESETS` | Từ vựng phong cách | Bảng 2.1 (Spec L440), `OnboardingAnswers.styleCodes` | B (lưu mã style vào `onboarding_answers`) | onboarding-state, profile-tab |
| `onboarding-presets.ts:98` `DEVICE_CATALOG` | 18 id thiết bị, chỉ 5 id trùng với studio | `PhoneModel` | **A** (đọc từ `phone_models`) | onboarding-state:43,93; profile-tab:55 |
| `account/components/profile-tab/profile-tab.ts:43-45,80-82` | `phoneNumber`, `dob`, `gender` được nhập nhưng luôn bị reset về `''`; avatar chỉ giữ trong signal | `Profile.phone/birthDate/gender/avatarUrl` | **B** | profile-tab |
| `account/components/security-tab/security-tab.ts:18-32` | Yêu cầu xoá tài khoản chỉ đặt cờ trong bộ nhớ; 2FA chỉ là signal | `Profile.deletionRequestedAt` | **B** (2FA: C) | account.ts:52 |
| `otp-modal.ts:27` | OTP giả | Email/SMS/OTP | C | profile, security |
| `account/account.html:19` "350 Points" | Điểm thưởng hard-code | Loyalty (Spec L63, L413) | C | account |
| `account/models/account.model.ts:45,51` `DESIGNS`, `ORDERS` | Mock cũ, không còn ai import | – | **E** | – |
| sessionStorage `caseye_signup_welcomed` (`onboarding.ts:84`) | Toast chào mừng | – | D | Onboarding |

### 2.2 SH / SRCH (catalog, giỏ, tìm kiếm)

| file:line | Nội dung | Thực thể BA | Loại | Đọc / ghi |
|---|---|---|---|---|
| `features/shop/catalog.ts:34-73` `DESIGNS` (33 slug) | Artwork × SKU; giá = `sku.price + premium` (`:136-138`); `soldOut` | `Product` (+ styles/tags/badge), `ProductVariant` | **A + B** (thiếu cột metadata) | shop, product-detail, shop-cart, search-source, landing, cart, checkout, order store |
| `catalog.ts:182-191` `ACCESSORIES` (10 id, giá/tồn hard-code) | Phụ kiện | `Product` (ACCESSORY) | **A** | shop, accessory-detail, shop-cart |
| `catalog.ts:75-76,106,179` `STYLES`, `COLLECTIONS`, `LEGACY_ACCESSORY_IMAGES`, `ACCESSORY_CATEGORIES` | Từ vựng catalog | Product metadata | B (collection/category) / D (ảnh cũ) | shop |
| `shop/accessory-content.ts:21` `ACCESSORY_DETAILS` | Mô tả chi tiết, rating/reviews giả | `Product.description`, đánh giá | A (mô tả) / B (đánh giá) | accessory-detail:31 |
| `landing/section/reviews/reviews.ts:23` `REVIEWS` | 3 đánh giá giả | Review (Spec L1773) | B | landing |
| `core/search/search.service.ts:30-32` `POPULAR_KEYWORDS`, `POPULAR_DEVICES` | Có cả dòng máy không bán | SRCH | D (gợi ý tĩnh) | search-overlay |
| `shared/search/lexicon.ts:19,59` `CONCEPTS`, `DEVICE_ALIASES` | Bí danh thiết bị (11 dòng máy) | `PhoneModel` | D (từ điển); danh sách máy nên sinh từ DB | search |
| `shop/search-source.ts:15-40` | Chỉ mục tìm kiếm dựng từ catalog TS; text của mọi sản phẩm chứa tên mọi dòng máy (B21) | `ShopSearchSource` | A (sau khi catalog lên DB) | search |
| localStorage `caseye_cart_v2`, `caseye_saved_v2` và `:<uid>` (`core/cart-state/cart-state.ts:23-38`) | Giỏ hàng / lưu để mua sau | `CartItem` (Guest Session Contract, Spec L174) | **D** (theo Spec) | CartState |
| `cart-state.ts:30`, studio `studio-workspace.ts:962` `stock: 99` | Tồn kho giả | `InventoryGateway.available` | **A** (`stock_availability`) | cart |
| `features/cart/cart.ts:28` `CASEYE10` | Giảm 10% chỉ ở trang giỏ, không chuyển sang checkout | `Voucher` | **B** | cart |
| localStorage `caseye_favorites` (`shop/services/shop-cart.ts:16`) | Yêu thích | không thuộc capability nào (§0.4) | D (cần quyết định, xem Q7) | ShopCart |
| localStorage `caseyes.search.recent.v1` (`search.service.ts:52`) | Tìm kiếm gần đây | Spec L175 | D | SearchService |
| localStorage `caseyes.search.log.v1` (`search.service.ts:53`) | Log intent | `analytics_events` (Spec L125) | **B** | SearchService |
| localStorage `caseyes.search.palette.v2` (`core/search/color-index.ts:5`) | Cache bảng màu | – | D | ColorIndex |
| `shared/search/color.ts:21`, `shared/devices/case-art.ts:2,21` | Dữ liệu giao diện | – | D | – |

### 2.3 DES (Design Studio)

| file:line | Nội dung | Thực thể BA | Loại | Đọc / ghi |
|---|---|---|---|---|
| `design-studio/services/studio-catalog.ts:4` `BRANDS_DATA` | 3 hãng | `PhoneModel.brand` | A (lấy distinct `phone_models.brand`) | studio, device-chip-row, product-detail |
| `studio-catalog.ts:10-326` `PHONE_MODELS_DATA` | 5 dòng máy × 13 SKU (giá 220–290k, `stockQty`) | `PhoneModel`, `ProductVariant.colorSku`, phôi trong kho | **A + B** | toàn bộ shop và studio |
| `studio-catalog.ts:333,338` | Mặc định `iphone-15-pro-max` / `sku-ip15pm-titanium` | – | D | studio |
| `services/studio-state.ts:14` `UNIFIED_STUDIO_PRICE = 250000` | Giá ốp custom | `phone_models.custom_price` (Spec L1176) | **A** | studio-state:189, workspace:960 |
| `studio-state.ts:16` `BANNED_KEYWORDS` | Từ khoá bị cấm | `BannedKeyword` | **B** | studio-state:423, workspace:645,706 |
| `studio-state.ts:35` `STICKERS_LIST` | 13 sticker | `StickerElement.sticker_id` | D (tài sản tĩnh) | workspace |
| `studio-state.ts:54` `BG_PRESETS`; `models/studio-domain.model.ts:46` `CASE_MATERIALS` | Dữ liệu giao diện | – | D | workspace |
| `studio-state.ts:584-593` `recordConsent` | Tạo consent rồi **bỏ đi** | `DesignConsent` | **B** | workspace:1379,1421 |
| `components/template-browser/template-browser.ts:240` `TEMPLATE_CATALOG` (16 mẫu, rating giả) | Thư viện mẫu | `Template` (+ `is_active`) | **B** | template-browser, landing trending, onboarding, search |
| `template-browser.ts:624,713,1461-1475` `INITIAL_REVIEWS` | Đánh giá mẫu chỉ giữ trong bộ nhớ | (Spec không mô hình hoá review cho mẫu) | B? (xem Q8) | template-browser |
| localStorage `caseyes_saved_designs_v3` (`studio-state.ts:71`) | "Thiết kế của tôi", dùng chung cho mọi tài khoản trên cùng trình duyệt (B12) | `Design` + `DesignVersion` | **A + B** | studio, template-browser, account designs-tab |
| localStorage `caseyes_guest_draft` (`studio-workspace.ts:918`) | Bản nháp của khách | Guest Session Contract (Spec L172) | **D** | workspace |
| localStorage `caseye_studio_draft` (`services/studio-draft.ts:5`) | Bản nháp thứ hai, trùng với cái trên | – | **E** (gộp vào guest draft hoặc autosave lên DB) | StudioDraft |
| localStorage `caseyes_active_model`, `caseyes_favorite_templates`, `caseyes_dont_remind_*` | Tùy chọn giao diện | Spec L173 | D | studio |
| `models/studio-state.model.ts:3` `DesignStatus = DRAFT\|SAVED\|REJECTED\|DISABLED` | Lệch với Spec (`DRAFT\|SAVED\|ARCHIVED`, L1370) | `DesignStatus` | A/B | studio |

### 2.4 P (Checkout / thanh toán)

| file:line | Nội dung | Thực thể BA | Loại |
|---|---|---|---|
| `checkout/services/checkout.service.ts:52-62` | Địa chỉ mặc định hard-code (Nguyễn Minh Anh…) | `Address` | **A** (`addresses`) |
| `checkout.service.ts:80,90` | Phí 25.000 / 45.000 | `ShippingMethod` (Spec L1412) | A (server tự tính; nên có `delivery_config`) |
| `checkout.service.ts:101-105` | Gói quà **bật sẵn**, 25.000, lời nhắn điền sẵn | `giftFee`, `orders.gift_message` | B (cột) |
| `checkout.service.ts:201-207` | Thông tin VietQR (MB Bank, `CEY89421`) | `PaymentGateway` | C |
| `checkout.service.ts:210-228` | Dòng giỏ mock `item-01` | – | E |
| `checkout.service.ts:231-236` | `CASEFIRST` −50.000 **áp sẵn** | `Voucher` (Spec L1421, L1464) | **B** |
| `checkout.service.ts:402-422` | `VIP30` = trừ thẳng 30.000, không phải 30% | `Voucher` | **B** |
| `checkout.service.ts:467-468,506` | `CE-89421`, `TXN-CEY98241`, `mock-order-001` | `orders.order_code`, `PaymentAttempt` | **B** (`payment_attempts`) / E |
| `checkout.service.ts:528` `loyaltyStars: 480`, `checkout-success.html:129,141` | Điểm thưởng | Loyalty | C |
| `checkout.service.ts:565` `renewTransaction` dùng `Math.random` | Mã giao dịch | `PaymentAttempt.transactionId` | C (gateway trả về) |
| `checkout/components/processing/checkout-processing.ts:77` | Thanh toán thành công 80% ngẫu nhiên | `PaymentGateway.charge` | **C** |
| `checkout/components/address-modal/address-modal.ts:15` `VIETNAM_LOCATIONS`; `:979-988` | Lưu địa chỉ chỉ cập nhật signal | `Address` | D (danh mục hành chính) / **A** (lưu vào `addresses`) |
| `checkout-failed.html:55,203` | Chữ CASEFIRST hard-code | Voucher | E |
| sessionStorage `caseeye_active_checkout_order` (`checkout.service.ts:49`) | `CheckoutSession` | Spec L1423 | **D** |
| `checkout/models/checkout.model.ts:124-125` | Trạng thái 5 giá trị và PaymentStatus `pending\|paid\|failed\|interrupted` | `CheckoutSession.paymentStatus` (Spec L1663) | D (trạng thái phiên); bỏ `OrderStatus` (E) |

### 2.5 OT (Quản lý đơn hàng) và Admin

| file:line | Nội dung | Thực thể BA | Loại |
|---|---|---|---|
| `order-tracking/services/order-tracking.service.ts:127` `remote = isAuthenticated()` | Chọn chế độ remote/local | – | – |
| `order.repository.ts:46-102` `LocalStorageOrderRepository`, key `casecraft.ot.db.v2` | DB đơn hàng trong localStorage (orders, consents, webhookEvents, retryQueue, inbox, outbound, idempotencyKeys, orderSeq) | toàn bộ các bảng OT | **E** (đã có bảng thật) |
| `services/auto-jobs.ts:23,37`, chạy từ `app.config.ts:30` | Job mỗi 60 giây trên DB **local**, kể cả khi đang ở chế độ remote | `run_order_jobs_v9` | **E** |
| `services/integrations.ts` (`IntegrationBus`, Notification, Loyalty, RiskProfile, Complaint `TK-…` :171, Payment `QR########` :181) | Mock tích hợp | Loyalty/Messaging/Payment (C); Risk / Complaint (B) | C / B |
| `services/demo-settings.ts:21` `casecraft.ot.demo.v1` | Cờ demo, giả lập dịch vụ sập | – | D (chỉ dùng cho demo outage) |
| `services/clock.ts:4` `casecraft.ot.clock.v1` | Đồng hồ ảo | `sim_time_travel` | E |
| `services/customer-inbox.ts:7` `casecraft.ot.read.v1` | Đã đọc (local) | `notifications.read_at` | E |
| `services/tracker.ts:5` `ot_events_v1` | Telemetry OT | `analytics_events` | **B** |
| `order-tracking.service.ts:69-74,143` `DEMO_CUSTOMER` | Số điện thoại demo bị gán cho cả **người dùng đã đăng nhập** | `profiles.phone` | **A/B** |
| `supabase-order-store.ts:93,110,114,128` | `customerEmail ''`, `hasUploadedImage false`, `policyVersion ''`, `reviewInvitePending false` | `policy_consents`, auth email | **A** |
| `supabase-order-store.ts:211-213` | Ticket dựng từ text `orders.ticket_id` | `SupportTicket` | **B** |
| `order-tracking.service.ts:508,518` | `submitReview` và `dismissReviewInvite` không chạy ở chế độ remote | Review (Spec L1773) | **B** |
| `order-tracking.service.ts:528` | `report_issue` chỉ gửi `TK-<base36>` do client sinh, bỏ mất loại sự cố, mô tả và bằng chứng | `SupportTicket`, `Evidence` | **B** |
| `order-tracking.service.ts:786` | `eventId` của carrier là `whk-…` sinh ở client | `CarrierWebhook` | C (hợp lệ cho bộ mô phỏng) |
| `order-tracking.service.ts:1088` `listOpenOrders` | Chỉ chạy local | RPC `list_open_orders` | **A** |
| `order-tracking/demo-console/*` | Không có route nào dẫn tới (`/order-tracking/demo` chuyển hướng sang simulator) | – | **E** |
| `demo-order-factory.ts:10,69` `DEMO_TEMPLATES`, `DEMO_ADDRESSES` | SKU giả (PHOI-IP15P-KINH…) | – | **E** |
| `config/delivery-config.ts:14-50` | Cửa sổ COD, giờ cắt đơn 16:00/14:00, voucher trễ hạn 10%/30k… trùng với SQL | `DeliveryConfig` | A/B (`delivery_config`) |
| `config/vn-banks.ts:2` `VN_BANKS` | Danh mục ngân hàng | – | D |
| `domain/order-mutations.ts:26` `CARRIER mock-3pl` | Hãng vận chuyển | 3PL | C |

### 2.6 CS (Chăm sóc khách hàng)

| file:line | Nội dung | Thực thể BA | Loại |
|---|---|---|---|
| `features/customer-support/customer-support.ts:69-75` | Form khiếu nại chỉ đặt cờ `complaintSent`, không lưu gì | `SupportTicket`, `Evidence` | **B** |
| `customer-support.ts:27-47` | FAQ và chính sách hard-code | `HelpArticle` | **B** |
| `core/support-chat/support-chat-state.ts:40,56,70-75` | Chat trong bộ nhớ; gọi `/api/support/ai-summary`, lỗi thì dùng tóm tắt theo luật | `AIAnalysis`, AI ngoài | C (+ B `ai_analyses`) |

### 2.7 Khác

| file:line | Nội dung | Loại |
|---|---|---|
| `core/demo/demo.ts`, route `/test` (`app.routes.ts:99-101`), `supabase-repository.ts:68` `TestRepository('test')` | CRUD trên bảng `test` | **E** |
| localStorage `caseyes.staff.view.v1` (`core/auth/staff-session.ts:15`) | Admin chọn màn hình đang xem | D |

### 2.8 Ai ghi vào Supabase, và ghi giá trị giả ở đâu

| file:line | Đích | Giá trị giả / sai |
|---|---|---|
| `order-tracking.service.ts:1191-1197` | `designs.insert` | `canvas_json: {}`; `preview_url` là data-URL hoặc `/logo.png`; `phone_model_id` tra **theo tên**; mỗi đơn tạo một dòng mới, không nối với bản thiết kế đã lưu |
| `order-tracking.service.ts:1200-1205` | chọn `product_variants` | khớp theo `phone_models.name`; mất SKU màu; `GIFT-HOLOGRAM` thành `gift-hologram` |
| `order-tracking.service.ts:1209-1232` | rpc `place_order` | địa chỉ tách theo dấu phẩy; `payment_txn_ref 'TXN-CEY98241'`; `discount` = CASEFIRST áp sẵn; EDD và `batch_date` tính ở client; không gửi `policyAcceptedAt` |
| `order-tracking.service.ts:528` | rpc `report_issue` | `p_ticket_id` sinh ở client |
| `account/services/profile.repository.ts:84-89` | `profiles.update` | `device_type` lưu **tên** máy nhưng được đọc lại như **id** (`profile-tab.ts:55-58`) |
| `profile.repository.ts:118-169` | `addresses` | bỏ `is_default` rồi đặt lại bằng 2 lệnh riêng, không atomic |
| `profile.repository.ts:58-66` | `profiles.update` | lệnh "reset" mock dành cho user Google demo |

### 2.9 Đếm theo loại

| Loại | Số nguồn (≈) |
|---|---|
| A — nối bảng có sẵn | 15 |
| B — cần bảng/cột mới | 16 |
| C — hệ thống ngoài | 10 |
| D — chỉ ở client | 16 |
| E — chết/trùng | 11 |
| **Tổng** | **≈ 68** (một nguồn có thể vừa A vừa B; tính theo loại chính) |

---

## Phase 3 — Toàn vẹn tham chiếu và dữ liệu ma

### 3.1 Catalog: slug / dòng máy / variant

| Kiểm tra | Frontend | DB (seed `20261114100600`) | Kết luận |
|---|---|---|---|
| Slug artwork | 33 (`catalog.ts:34-73`) | 8 (`seed:30-37`: lilac-dream … mono-heart) | **25 slug ma**: lavender-haze … sakura-silk |
| Phụ kiện | 10 id `accessory-charging-puck` … `accessory-astronaut-star` (`catalog.ts:182-191`) | `accessory-magsafe`, `accessory-airpods`, `accessory-strap`, `gift-hologram` (`seed:38-41`) | **Không trùng id nào** (chỉ `gift-hologram` khớp, qua đổi chữ hoa/thường ở `order-tracking.service.ts:1200`) |
| Dòng máy | Studio: 5 (`studio-catalog.ts`); Onboarding: 18 (`onboarding-presets.ts:98`); lexicon: 11 | `phone_models`: 11 (`seed:7-18`) | Onboarding có 12 id không có trong DB (iphone-15-plus, galaxy-z-flip-5-6…) |
| Variant ốp cho `iphone-15-pro-max` | Là **thiết bị mặc định** (`studio-catalog.ts:333`, `devices.ts`) | Không có (`seed:58-59`) | **Ma** — mọi đơn ốp in sẵn cho máy này đều báo "chưa có trong kho" (B5) |
| Variant ốp cho `xiaomi-14-ultra` | Có trong studio | Không có | **Ma** |
| SKU màu / loại ốp | 13 SKU (`sku-ip15pm-titanium`…) | Không có cột tương ứng | **Ma**: màu khách chọn bị mất khi đặt hàng |
| Giá | `sku.price + premium` (ví dụ 260.000 + 70.000) | `product_variants.price` cố định theo sản phẩm (ví dụ 289.000) | **Giá ở UI khác giá DB tính.** DB đúng vì giá lấy từ server, nhưng khách thấy một giá rồi bị tính giá khác. |
| Giá custom | Đồng giá 250.000 (`studio-state.ts:14`), nhưng SKU studio 220–290k | `custom_price` 250.000 | Khớp nếu bỏ giá theo SKU ở studio |
| Tồn kho | `stockQty` theo SKU, giỏ hàng mặc định 99 | `inventory_items` theo sản phẩm (trade_good) / theo dòng máy (blank) | Khác đơn vị đếm (xem Q2) |

### 3.2 Dòng giỏ hàng và payload `place_order`

`place_order` chờ dạng `{type: 'product'|'design', id: uuid, qty}` (`…100400:110`).

| Nguồn | `id` dòng giỏ | `custom` | Khi đặt hàng | Kết quả |
|---|---|---|---|---|
| Ốp in sẵn (`shop-cart.ts:37`) | `slug:modelId:skuId` | false | `baseSku = slug`; variant tra theo tên dòng máy | Lỗi nếu slug ma hoặc máy ma; mất SKU |
| Phụ kiện (`shop-cart.ts:60`) | `accessory-…` | **true**, `model: 'Phụ kiện'` | Đi theo nhánh design, tra `phone_models.name = 'Phụ kiện'` | **Luôn lỗi** "Chưa có dòng máy Phụ kiện" (B4). Còn khoá COD và Express. |
| Thiết kế studio (`studio-workspace.ts:953-965`) | `design:sku:ts` | true | Tạo dòng `designs` mới với `{}` | Đặt được, nhưng xưởng không có file in (B13) |
| Gói quà (`checkout.ts:128-130`) | `GIFT-HOLOGRAM` | false | slug `gift-hologram` | OK (variant duy nhất) |

### 3.3 Mã đơn, ticket, payment, policy

| Vấn đề | Bằng chứng | Kết luận |
|---|---|---|
| Mã đơn | DB sinh `CC-YYMMDD-NNNN` (`…100400:160-161`); checkout tạo `CE-89421` (`checkout.service.ts:467`). Remote đọc lại mã thật (`checkout.ts:120`), nhưng `place_order` vẫn **nhận `order_code` từ client** | Client có thể chèn mã tùy ý. P0: bỏ qua `order_code` từ client. |
| `orders.ticket_id` | `text`, không FK (`…100100:121`); client sinh `TK-<base36>` (`order-tracking.service.ts:528`) | Ticket ma; không có bảng ticket (B15) |
| `policyVersion` | DB lưu ở `policy_consents` (`…100400:232`); store remote trả `''` (`supabase-order-store.ts:114`) | UI không hiển thị được phiên bản chính sách. Thời điểm chấp nhận lấy `now()` của server chứ không phải lúc khách tick (Spec L1448). |
| COD `paid` | Chỉ gán `unpaid` lúc insert (`…100400:173`) | Khiếu nại hoàn tiền cho đơn COD không tạo được RefundRequest (`create_refund` dừng ở `:79`) — B18 |
| `payment_txn_ref` | Mọi đơn gửi `TXN-CEY98241` (`checkout.service.ts:468`) | Mã giao dịch ma, trùng nhau |
| Thứ tự thanh toán và đặt hàng | Thanh toán mock thành công trước, `placeOrderOnce` chạy sau (`checkout.ts:110-121`); lỗi thì chỉ hiện thông báo, không retry, không idempotent | B8 |
| `placedOrderCode` | Chỉ reset trong `onNewOrder` (`checkout.ts:191`); có cờ chặn ở `:112` | B6 |
| Guard `/checkout` | Route không có `canActivate` (`app.routes.ts:67-70`; `checkout.routes.ts`) | B7 |

### 3.4 Enum trạng thái

| Mô hình | Giá trị | Nguồn | So với DB |
|---|---|---|---|
| OT TS `OrderStatus` | 12 mã | `order-tracking/models/order-tracking.model.ts:13-26` | Khớp CHECK `orders_status_detail_check` (`…100100:126-128`) |
| OT TS `PaymentStatus` | `Unpaid \| Paid` | `order-tracking.model.ts:31` | DB dùng chữ thường `unpaid\|paid`; store phải map |
| Checkout `OrderStatus` | `pending, confirmed, processing, completed, cancelled` | `checkout.model.ts:124` | Không khớp cả enum 5 giá trị (`shipping`, `delivered`) lẫn 12 mã. Chỉ dùng cho màn mock, nên bỏ (E). |
| Checkout `PaymentStatus` | `pending, paid, failed, interrupted` | `checkout.model.ts:125` | Là trạng thái phiên (Spec L1663 có `pending\|paid\|failed`); `interrupted` là thêm |
| Design `DesignStatus` | `DRAFT, SAVED, REJECTED, DISABLED` | `studio-state.model.ts:3` | Spec: `DRAFT, SAVED, ARCHIVED` (L1370); DB chưa có cột |
| `onboarding_status` | `pending, completed, skipped` | `onboarding-status.ts:5` | DB chỉ `completed, skipped` (D1) |

### 3.5 Trường hồ sơ UI thu nhưng DB không lưu được

`phone`, `birth_date`, `gender` (`profile-tab.ts:43-45,80-82`); `email` (sửa được trên form nhưng không lưu); `avatar_url` (chỉ trong signal); `deletion_requested_at` (`security-tab.ts:18-32`); câu trả lời onboarding (chỉ có `device_type` dạng tên và `preferences` dạng nhãn).

### 3.6 Kiểm tra vai trò

| UI | DB | Khớp? |
|---|---|---|
| `core/auth/role-guard.ts:10-21` đọc `profiles.role`; Admin qua tất cả | `require_role`: admin qua tất cả (`…090000_admin_all_roles:4-20`) | Khớp |
| `staff-session.ts:14,75,89-91` từ chối tài khoản không phải staff | `is_staff()` | Khớp |
| `demo-settings.ts:45-47` `isAdmin/isOperator/isCskh` và actor giả `'admin'` ở `admin-orders.ts:325-333` | – | Chỉ dùng ở local; **E** sau khi bỏ chế độ local |
| `order-tracking.service.ts:1124` hoàn tiền local chỉ cho Admin | RLS `refund_requests`: chủ đơn hoặc admin | Khớp ý đồ |

### 3.7 Top 10 dữ liệu ma

1. **Phụ kiện không đặt được.** Id ma, cộng thêm `custom: true` và `model: 'Phụ kiện'` (B4).
2. **25/33 artwork không có trong `products`** (B5).
3. **`iphone-15-pro-max` và `xiaomi-14-ultra` không có variant ốp.** Variant khớp theo tên nên mất SKU màu, và giá UI ≠ giá DB.
4. **`designs` tạo lúc checkout với `canvas_json: {}`**, preview data-URL, `phone_model_id` tra theo tên (B13). `sim_create_sample_order` cũng tạo `{}`.
5. **`place_order` tin `order_code`/`fee`/`discount` từ client.** `CASEFIRST` áp sẵn; mọi đơn cùng `TXN-CEY98241` (B9, B10).
6. **`orders.ticket_id` là text do client sinh, không có bảng ticket.** Chi tiết khiếu nại bị mất (B15).
7. **COD không bao giờ `paid`** (B18). `policyVersion` và `customerEmail` rỗng ở chế độ remote; người đã đăng nhập bị gán số điện thoại của `DEMO_CUSTOMER`.
8. **`onboarding_status` không có `pending`**, nên trigger đăng ký có thể lỗi (B1). `device_type` lưu tên nhưng đọc như id. 18 id thiết bị ở onboarding ≠ 11 trong DB.
9. **Hồ sơ không lưu được** phone, ngày sinh, giới tính, avatar, yêu cầu xoá tài khoản.
10. **`database.types.ts` thiếu 6 hàm M9**, và có 3 mô hình trạng thái đơn song song (checkout 5, enum 5, `status_detail` 12).

---

## Phase 4 — Phân tích khoảng trống theo class diagram

Chú thích cột "Dùng?":
- ✅ app đang dùng
- ⚠️ dùng nhưng sai hoặc giả
- ❌ không dùng

### 4.1 AUTH (CD-AUTH, Spec L295-371)

| Lớp / thuộc tính BA | Có trong DB? | Dùng? | Khoảng trống | Đề xuất |
|---|---|---|---|---|
| `UserAccount` | `auth.users` | ✅ | – | – |
| `Profile.role` | `profiles.role` | ✅ | – | – |
| `Profile.onboardingStatus` (PENDING/COMPLETED/SKIPPED) | `profiles.onboarding_status` (thiếu `pending`, không có default) | ⚠️ | B1 / D1 | **P0-1**: CHECK thêm `pending`, `default 'pending'`, trigger gán `pending` |
| `GuestSessionContract` | – (client) | ⚠️ | Có hai bản nháp (`caseye_studio_draft` và `caseyes_guest_draft`); merge chưa đủ | D; gộp key; không cần DB |
| Sự kiện `auth.signup.completed` (+ `signup_trigger`, L201) | – | ❌ | Thiếu | P2 `analytics_events`; P1 `profiles.signup_trigger` |
| Google OAuth | – | ⚠️ (mật khẩu giả) | C | Giữ `AuthProvider` interface; dùng `signInWithOAuth` khi có cấu hình |

### 4.2 PM (CD-PM, Spec L562-643)

| Lớp / thuộc tính | DB | Dùng? | Khoảng trống | Đề xuất |
|---|---|---|---|---|
| `Profile.phone` | – | ❌ (form có) | Thiếu cột | `profiles.phone text` CHECK `^0(3\|5\|7\|8\|9)[0-9]{8}$`; unique partial `where phone is not null` (BR-PM-05) |
| `Profile.birthDate` | – | ❌ | Thiếu | `birth_date date` CHECK `birth_date <= current_date - interval '13 years'`. Postgres không cho dùng `current_date` trong CHECK một cách ổn định, nên kiểm bằng trigger. Khoá sửa khi `is_rewarded`. |
| `Profile.gender` | – | ❌ | Thiếu | `gender text` CHECK `male\|female\|other` |
| `Profile.isRewarded` | – | ❌ | Thiếu | `is_rewarded boolean default false`; **không** grant update cho khách; chỉ RPC `claim_profile_reward()` |
| `Profile.deletionRequestedAt` | – | ❌ | Thiếu | `deletion_requested_at timestamptz`; RPC `request_account_deletion()` kiểm `DeletionEligibility` (`list_open_orders` + ticket mở) |
| `OnboardingAnswers` | – (`preferences` lưu nhãn) | ⚠️ | Thiếu bảng | `onboarding_answers(user_id PK FK profiles, creator_name 2-40, device_model_id uuid FK phone_models, style_codes text[], source CHECK signup\|checkout\|account, completed_at)`; RLS dòng của mình |
| `Address.isDefault` (≤ 1, atomic) | `addresses.is_default` | ⚠️ | Không có ràng buộc; app ghi 2 bước | Unique partial index `(user_id) where is_default`; RPC `set_default_address(uuid)`; trigger đặt địa chỉ đầu tiên làm mặc định và chuyển mặc định khi xoá |
| `BlockReason` / `DeletionEligibility` | đọc `list_open_orders` | ❌ | Thiếu ticket | Phụ thuộc `support_tickets` |
| Ẩn danh hoá `orders.user_id` (FR-PM-25) | FK `orders.user_id → profiles` (không cascade) | ❌ | Xoá hồ sơ bị chặn | P2: cột `orders.customer_anon_key` + job ẩn danh hoá |

- **RLS / grant:** thêm các cột vào `grant update (…)` (`20261029130000:67`), trừ `is_rewarded` và `deletion_requested_at`.
- **Index:** unique `profiles(phone)`.
- **Sinh lại types:** có.

### 4.3 SH (CD-SH, Spec L833-926)

| Lớp / thuộc tính | DB | Dùng? | Khoảng trống | Đề xuất |
|---|---|---|---|---|
| `Product` (slug, name, productType, isActive) | `products` | ❌ (shop đọc TS) | Thiếu dữ liệu (25 + 10 id) | Seed v2 (P0-3) |
| `Product.styles/tags/badge` | – | ❌ | Thiếu cột | `products.styles text[]`, `tags text[]`, `badge text` CHECK `BEST SELLER\|NEW DROP\|LIMITED\|HOT`, `collection text`, `premium int ≥ 0`, `finish text`, `art_url text`, `category text` (phụ kiện) |
| `ProductVariant.colorSku` | – | ❌ | Thiếu | `product_variants.color_sku text`, `case_type text`; unique `(product_id, phone_model_id, color_sku)` |
| `PhoneModel.id: String` | `phone_models.id uuid` + `slug` | ⚠️ | Spec dùng id dạng chuỗi | **Xung đột C2**: dùng `slug` làm id ở frontend, uuid trong DB |
| `PhoneModel.has3dModel/model3dUrl` | – | ❌ | Thiếu | `has_3d_model bool`, `model_3d_url text` |
| `CartItem` (one-source `variantId` \| `designId`) | (client) | ⚠️ | Dòng giỏ không mang `variantId`/`designId` thật | App: lưu `variantId` (uuid) và `designId` + `designVersion` trong `CartItem` |
| `InventoryGateway.available` | `stock_availability` | ❌ | Giỏ dùng 99 | Đọc `stock_availability` |
| `RiskProfile` | – | ❌ (mock `integrations.ts`) | Thiếu | P2 `risk_profiles(customer_id PK, cancel_count, is_high_risk, flagged_at, note)`; chỉ staff/RPC ghi; khách đọc `is_high_risk` của mình qua RPC |

- **RLS:** catalog vẫn chỉ cho đọc, không ai ghi qua API (staff ghi bằng dashboard, hoặc thêm policy staff ở P2 cho admin catalog).
- **Index:** `product_variants(phone_model_id)`, GIN `products(tags)` nếu lọc theo tag ở server.

### 4.4 SRCH (CD-SRCH, Spec L1059-1102)

| Lớp | DB | Dùng? | Khoảng trống | Đề xuất |
|---|---|---|---|---|
| `SearchSource` (Shop / Template / HelpCenter) | – | ✅ (dữ liệu TS) | Nguồn TS | Shop dựng từ `products`; Template từ `templates`; Help từ `help_articles` |
| `SearchLogEntry` | – (`caseyes.search.log.v1`) | ⚠️ | Thiếu bảng | `analytics_events` với `event_name = 'search.query.submitted'` (P2) |
| `RecentSearch` | (client) | ✅ | – | D |

### 4.5 DES (Spec L1349-1386)

| Lớp / thuộc tính | DB | Dùng? | Khoảng trống | Đề xuất |
|---|---|---|---|---|
| `Design.template_id` | – | ❌ | Thiếu | `designs.template_id text FK templates(id)` |
| `Design.version` | – | ❌ | Thiếu | `version int default 1` (optimistic concurrency, FR-DES-EX-12) |
| `Design.status` (DRAFT/SAVED/ARCHIVED) | – | ❌ | Thiếu; TS có REJECTED/DISABLED | `status text` CHECK `draft\|saved\|archived`; trạng thái bị từ chối thuộc **đơn** (Spec L1386) |
| `Design.requires_moderation` | – | ❌ | Thiếu | `requires_moderation bool default true` |
| `Design.last_auto_saved_at` | – | ❌ | Thiếu | `timestamptz` |
| `Design.guest_session_id` | – | – | **Xung đột C1** với Guest Session Contract | Không lưu (khuyến nghị) |
| `DesignVersion` | – | ❌ | Thiếu | `design_versions(design_id FK, version, canvas_json NOT NULL, preview_url, reason CHECK save\|autosave\|resubmit, created_at, PK(design_id, version))`; RLS: khách **insert/select** dòng của mình, **không update/delete** |
| `order_items.design_version` | có (default 1) | ⚠️ (luôn 1) | Không gắn với phiên bản thật | `place_order` nhận `design_version` và kiểm tra tồn tại trong `design_versions`; FK `(design_id, design_version)` |
| `DesignConsent` | – | ❌ (`recordConsent` bỏ kết quả) | Thiếu | `design_consents(id, user_id, design_id null, image_hash, policy_version, remember_choice, accepted_at)`; insert/select dòng của mình |
| `Template` (+ `is_active`) | – | ❌ | Thiếu | `templates(id text PK, name, category, hashtags text[], is_blank_canvas, is_trending, is_active, artwork_key, sort_order)`; đọc công khai dòng active |
| `BannedKeyword` | – | ❌ | Thiếu | `banned_keywords(keyword PK, category, is_active)`; đọc công khai hoặc RPC `check_banned(text)` khớp theo **từ** (FR-DES-26) |
| `PhoneModel.custom_price` | có | ❌ (hằng số TS) | – | Đọc từ DB |
| RLS `designs` | `for all` | ⚠️ | D8 | Đổi thành select/insert/update **chỉ khi chưa có `order_items` tham chiếu**, hoặc nội dung in lấy từ `design_versions` bất biến |

- **Bucket:** `design-assets` đang public. Ảnh khách upload nên chuyển sang private kèm signed URL (rủi ro riêng tư); preview có thể vẫn public.

### 4.6 P (CD-P, Spec L1637-1732)

| Lớp / thuộc tính | DB | Dùng? | Khoảng trống | Đề xuất |
|---|---|---|---|---|
| `CheckoutSession.checkoutRef` (idempotency, BR-P-10) | – | ❌ | Thiếu | `orders.checkout_ref text` unique partial; `place_order` trả về đơn đã có |
| `shipperNote`, `giftMessage` (≤ 150) | – | ❌ (có trên UI) | Thiếu | `orders.shipper_note text`, `gift_message text CHECK length ≤ 150`, `gift_fee int default 0` |
| `TotalAmount` do server tính (BR-P-04, FR-P-EX-14) | `place_order` tin client | ⚠️ | B9 / D6 | P0: phí do server tính; P1: discount từ `vouchers` |
| `Voucher` / `VoucherRegistry` | `order_vouchers` (chỉ voucher đền bù, OT) | ❌ | Thiếu sổ voucher mua hàng | `vouchers(code PK, kind PURCHASE\|PROFILE_COMPLETE\|COMPENSATION, discount_type AMOUNT\|PERCENT, value, min_order, scope ALL\|STOCK_ONLY\|CUSTOM, expires_at, usage_limit, used_count, user_id null, is_active)` + `voucher_redemptions(code, order_id unique, user_id, redeemed_at, released_at)`. **Xung đột C5**: `order_vouchers` có nên gộp vào `vouchers` (kind COMPENSATION) không — xem Q5. |
| `PaymentAttempt` | – | ❌ | Thiếu | `payment_attempts(id, checkout_ref, user_id, attempt_no, method, channel, sub_wallet, result paid\|failed, failure_code, txn_ref unique, latency_ms, created_at)`; insert qua RPC `record_payment_attempt` (mock gateway gọi); khách đọc dòng của mình |
| `PolicyConsent.acceptedAt` (thời điểm tick) | `policy_consents.accepted_at default now()` | ⚠️ | Đang dùng giờ server | `place_order` nhận `policy_accepted_at` (giới hạn trong ±15 phút) |
| `PaymentGateway` | – | C | – | Interface `PaymentGateway.charge/void`; mock SafePay |

### 4.7 OT (CD-OT, Spec L1875-1900)

| Lớp / thuộc tính | DB | Dùng? | Khoảng trống | Đề xuất |
|---|---|---|---|---|
| `Order.checkoutRef`, `shipperNote`, `giftMessage` | – | – | xem 4.6 | – |
| `Order.batchId` | – (`batch_date` có) | ❌ | Thiếu | `orders.batch_id text` (ví dụ `B-YYMMDD`) do `start_production` gán |
| `Order.previousStatus` | – | ⚠️ (suy ra từ history) | – | Tùy chọn: `orders.previous_status_detail` |
| `Order.eddRevisedReason` | – | ❌ | Thiếu | `orders.edd_revised_reason text` |
| `Order.policyVersion` | `policy_consents` | ⚠️ (store trả `''`) | Mapping | App: join `policy_consents` |
| `paymentStatus` COD thành `paid` khi Delivered (FR-OT-21) | – | ❌ | B18 | `apply_carrier_event('Delivered')` đặt `payment_status='paid'` khi `payment_method='cod'` |
| `OrderItem.designVersion` | có | ⚠️ | xem 4.5 | – |
| `DestructionRecord` (FR-OT-10) | – | ❌ | Thiếu | P2 `destruction_records(id, order_id, order_item_id, reason, destroyed_at, actor_id)` |
| `OutboxEvent` (FR-OT-22) | – | ❌ (mock `IntegrationBus`) | Thiếu | P2 `outbox_events(id, target Loyalty\|Messaging\|Shopping\|CS, event_type, payload, attempts, next_retry_at, status)`; chỉ staff đọc |
| `Review` (Spec L1773) | – | ❌ (`submitReview` không chạy ở remote) | Thiếu | P1 `order_reviews(order_id, order_item_id, user_id, rating 1-5, comment, created_at)`; RLS: insert khi đơn `Completed` và thuộc về mình |
| `DeliveryConfig.holidays` | `is_working_day` chỉ Thứ 2–6 | ⚠️ | Thiếu ngày lễ | P2 `delivery_config` / `holidays(date PK)` |
| `order_stage_durations` (L1832) | – | ❌ | Thiếu | P2 view trên `order_status_history` |
| `InAppNotification` | `notifications` | ✅ | – | – |

### 4.8 CS (CD-CS, Spec L2135-2164)

| Lớp | DB | Dùng? | Đề xuất (P1) |
|---|---|---|---|
| `SupportTicket` | – (`orders.ticket_id text`) | ❌ | `support_tickets(id uuid, ticket_code text unique 'TK-…' sinh từ sequence, kind COMPLAINT\|DISPUTE\|INQUIRY, order_id null, order_item_ids uuid[], customer_id, assigned_staff_id, issue_type, description ≥ 10, preferred_resolution, final_resolution, status, priority, sla_due_at, first_response_at, resolved_at, created_at)`; unique partial `(order_id, kind) where status not in ('RESOLVED','REJECTED')` |
| `Evidence` | – | ❌ | `ticket_evidence(id, ticket_id, media_type image\|video, storage_path, file_hash, uploaded_at)` + bucket **private** `support-evidence` (ảnh ≤ 10MB, video ≤ 50MB, ≤ 5 file) |
| `TicketStatusHistory` | – | ❌ | `ticket_status_history(id, ticket_id, changed_by, from_status, to_status, changed_at, note)` ghi bằng trigger |
| `AdditionalInfoRequest` | – | ❌ | `additional_info_requests(id, ticket_id, question, due_at default +3 ngày, responded_at, response)` |
| `AIAnalysis` | – | ❌ (gọi endpoint không tồn tại) | `ai_analyses(id, ticket_id, summary, sentiment, urgency_score, suggested_action, confidence, source external\|local_rules, version)`; chỉ staff |
| `TicketDecision` | – | ❌ | `ticket_decisions(ticket_id PK, resolution, approved_by, note, compensation_cost, applied_to_order_at)`; idempotent theo ticket (FR-CS-EX-10) |
| `CsatSurvey` | – | ❌ | `csat_surveys(id, ticket_id unique, score 1-5, comment, submitted_at)` |
| `HelpArticle` | – (FAQ hard-code) | ❌ | `help_articles(id text PK, title, body, keywords text[], link, is_active)`; đọc công khai |
| `report_issue` | `(uuid, text)` | ⚠️ (B15) | `report_issue_v2(p_order_id, p_issue_type, p_description, p_item_ids uuid[], p_preferred_resolution) → ticket_code`: tạo ticket và cập nhật đơn **trong cùng một transaction** (FR-CS-04); giữ `orders.ticket_id` (text = `ticket_code`) và thêm `orders.support_ticket_id uuid FK` |

- **RLS:** khách đọc ticket và evidence của mình, insert evidence vào ticket của mình; staff (`cskh`, `admin`) đọc và ghi tất cả qua RPC.
- **Sinh lại types:** có.

### 4.9 Dùng chung: `analytics_events` (Spec §0.7, L109-125)

- **Bảng:** `analytics_events(event_id uuid PK, event_name text CHECK ~ '^[a-z]+\.[a-z_]+\.[a-z_]+$', occurred_at, session_id, user_id null, module CHECK 8 giá trị, entity_type, entity_id, properties jsonb CHECK pg_column_size < 8kB, schema_version int)`.
- **RLS:** `anon` và `authenticated` chỉ **insert**, và `user_id` phải bằng `auth.uid()` hoặc null. Không ai đọc qua API, trừ admin.
- **Index:** `(event_name, occurred_at)`.
- **Rủi ro:** spam insert. Giảm thiểu bằng giới hạn kích thước và (tương lai) Edge Function có rate limit.

### 4.10 Xung đột giữa Spec, DB và code (không tự chọn)

| # | Xung đột | Spec | DB | Code |
|---|---|---|---|---|
| C1 | Bản nháp của khách lưu ở đâu | Class `Design.guest_session_id`, `DesignConsent.session_id` (L1358, L1366) — nghĩa là lưu ở server | Không có | Guest Session Contract (L158, L172) nói **chỉ ở client** |
| C2 | Kiểu id của `PhoneModel` | `id: String` (L881, L1356) | `uuid` + `slug` | slug (`iphone-15-pro-max`) |
| C3 | `IssueType.INQUIRY` | Có ở CD-CS (L2151), không có ở §0.5 (L95) | – | – |
| C4 | Ốp artwork in sẵn | §0.5 coi là `IN_STOCK` (L93); FR-SH: tồn theo SKU | `trade_good` theo sản phẩm | TS: tồn = tồn phôi SKU |
| C5 | Sổ voucher | P sở hữu `vouchers` (L1421), OT sở hữu `order_vouchers` (L1893), "có thể dùng khi checkout" (L1794) | Chỉ có `order_vouchers` | Hard-code |
| C6 | Mức ưu tiên B9 (tin phí/giảm giá) và B13 | Appendix B xếp P1 | `order_code` từ client cũng được nhận | – (báo cáo này đề xuất nâng một phần lên P0) |
| C7 | `onboarding_status` | `pending` mặc định (L193, L399) | Không có `pending` | Có `pending` |
| C8 | Giá ốp custom | Đồng giá 250k (L1176) | `custom_price` 250k | Studio có SKU 220–290k (`studio-catalog.ts:52-319`) |
| C9 | Bảng 7.1–7.6 | Đánh dấu "[GIỮ]" nhưng **nội dung không có trong file** (L1789-1794) | SQL có hệ số (`create_refund`, voucher trễ hạn) | `delivery-config.ts` |
| C10 | Trạng thái design | `DRAFT/SAVED/ARCHIVED` | Không có | `DRAFT/SAVED/REJECTED/DISABLED` |

---

## Phase 5 — Chiến lược sửa

### 5.0 Quyết định đã chốt (2026-11-19)

| # | Chốt |
|---|---|
| Q1 | **Đồng ý**: DB là nguồn chuẩn. Catalog sửa ở `supabase/seed/catalog.json`, rồi sinh migration seed bằng `node scripts/gen-catalog-seed.mjs` (`--check` dùng cho CI). |
| Q2 | **Đồng ý**: mỗi SKU một phôi. |
| Q5 / P1-7 | **Voucher chỉ là mock-up** để minh hoạ luồng; **không** tạo bảng `vouchers` / `voucher_redemptions`. `place_order` giữ `discount` client gửi lên nhưng kẹp trong khoảng 0…`goods_total`. |
| Q11 | **Đồng ý**: phần bảo mật của B9 (`order_code`, phí ship do server quyết định) làm ở P0. |
| `VIP30` | **Giữ nguyên như app hiện tại** (mock-up): trừ thẳng 30.000. |

### 5.0.1 Trạng thái P0 (đã làm, **chưa** push lên Supabase)

| Hạng mục | File | Kiểm chứng |
|---|---|---|
| P0-1 `onboarding_status` có `pending` (B1) | `supabase/migrations/20261120090000_profiles_onboarding_pending.sql` + rollback | `migrations.test.mjs`: bỏ workaround; trigger tạo hồ sơ `pending`; khách hoàn tất onboarding được; giá trị lạ bị chặn |
| P0-2 lược đồ SKU + metadata | `…20261120090100_catalog_sku_metadata.sql` + rollback | một phôi mỗi SKU (12) |
| P0-3 seed v2 (B5, dữ liệu cho B4) | `…20261120090200_seed_catalog_v2.sql` + rollback (cả hai **sinh** từ `catalog.json`) | 33 artwork × 12 SKU và 10 phụ kiện đều có variant active đúng giá UI; `iphone-15-pro-max` có variant; chạy lại seed không thêm dòng |
| P0-4 `place_order` v3 (B6, B8, một phần B9) | `…20261120090300_place_order_v3.sql` + rollback | cùng `checkout_ref` thì cùng đơn và chỉ trừ kho một lần; khách khác dùng lại ref bị từ chối; `order_code` / phí từ client bị bỏ qua; `discount` bị kẹp; lưu `shipper_note` / `gift_message` (≤ 150); design dùng phôi đúng SKU; lưu `design_version` |
| P0-5 types | `database.types.ts` **sửa tay** (cột mới và 6 RPC M9) | `tsc --noEmit` sạch. **Phải chạy `supabase gen types` sau khi push.** |
| App B4 | `shop-cart.ts` (`custom: false`), `cart-state.ts` (giỏ cũ: phụ kiện không còn là custom) | `cart-state.spec.ts` |
| App B5 | `order-tracking.service.ts` `placeRemoteOrder`: tìm variant theo SKU → model slug → tên; design gửi `sku` | `checkout.spec.ts` (`catalogRefFor`) |
| App B6 | `checkout.service.ts` (`newCheckoutRef`, `markPlaced`, `startNewSession`), `checkout.ts` `ngOnInit` | `checkout.spec.ts` |
| App B7 | `app.routes.ts`: `canActivate: [authGuard]` cho `/checkout` | – |
| App B8 | `checkout.ts` `placeOrderOnce`: 3 lần thử cùng `checkout_ref`, sau đó hiện nút "Thử lại tạo đơn"; `placeRemoteOrder` dùng lại đơn đã có, không tạo dòng `designs` thừa | test SQL idempotency |

Lệnh đã chạy:
- `node supabase/tests/migrations.test.mjs .`: ALL PASSED, gồm cả các rollback. PGlite cài tạm ngoài repo; nên thêm `@electric-sql/pglite` vào `devDependencies`.
- `npx tsc -p tsconfig.app.json --noEmit`: sạch.
- `npx ng test --watch=false --include <checkout, cart-state, order-tracking, shop>`: 103/103 pass.

**Lưu ý:** `ng test` toàn bộ đang **lỗi biên dịch có từ trước** ở `core/layout/footer/footer.spec.ts`, `shared/ui/button/button.spec.ts` và `shared/ui/button/button.ts` (không liên quan đến thay đổi này).

### 5.0.2 Đợt 2 — Thanh toán và Tài khoản đọc/ghi DB thật (2026-11-20)

| Hạng mục | Thay đổi | Cần migration? |
|---|---|---|
| Địa chỉ ở Checkout (trước đây hard-code "Nguyễn Minh Anh") | `checkout/services/checkout-address.ts` (`CheckoutAddressBook`): đọc địa chỉ mặc định trong `addresses`; chưa có thì lấy tên và số điện thoại từ hồ sơ. Modal địa chỉ lưu vào `addresses`. Chưa có địa chỉ thì không đặt hàng được. Bỏ ghi chú shipper và lời chúc "From Minh Anh" mẫu. | Không (bảng có sẵn) |
| Tab "Thiết kế của tôi" (B12: localStorage dùng chung cho mọi tài khoản) | `design-studio/services/saved-design-sync.ts`: khi đăng nhập, danh sách là các dòng `designs` của **chính tài khoản đó** (`canvas_json` chứa layers…); thêm/sửa/xoá được ghi xuống DB. Khách vãng lai vẫn dùng localStorage. Lưu lại thì giữ id cũ, không tạo dòng mới. | Không (bảng có sẵn) |
| Tab "Đơn hàng" | Kho mock local (`casecraft.ot.db.v2`) **chỉ** được đọc khi simulator bật chế độ khách demo; người dùng thật chỉ thấy đơn của mình trong Supabase. Tài khoản đã đăng nhập không còn mượn số điện thoại của `DEMO_CUSTOMER`. | Không |
| "350 Points" | `CustomerOrderFeed.loyaltyPoints`: Loyalty là hệ ngoài nên dùng quy tắc mock 1 điểm / 1.000 ₫ của các đơn **Completed** của chính khách. Tài khoản mới có 0 điểm. | Không |
| Hồ sơ: số điện thoại, ngày sinh, giới tính, yêu cầu xoá tài khoản (B19) | `supabase/migrations/20261120090400_profiles_pm_fields.sql` + rollback: thêm cột, CHECK số điện thoại / giới tính, số điện thoại unique, trigger ≥ 13 tuổi, grant theo cột. `profile-tab` / `account-state` đọc và ghi các cột này; banner "chờ xoá" đọc `deletion_requested_at`. | **Có**: phải push trước khi deploy app, nếu không thì lưu hồ sơ sẽ lỗi "column not found" |

Chưa làm (cần bạn): `supabase db diff --linked` (Q12) → `supabase db push` → `supabase gen types typescript --linked`.

### 5.1 Danh sách quyết định (kèm khuyến nghị)

| # | Câu hỏi | Khuyến nghị | Lý do |
|---|---|---|---|
| Q1 | Catalog chuẩn đặt ở DB hay TS? | **DB là nguồn chuẩn.** Seed sinh từ một file JSON (`supabase/seed/catalog.json`); TS đọc DB lúc chạy, có snapshot dự phòng sinh lúc build | Giá và tồn kho phải do server quyết định; admin catalog về sau sửa trên DB |
| Q2 | Tồn kho ốp artwork in sẵn tính theo gì? | **Mỗi SKU một phôi** (`inventory_items.sku_code`); variant artwork dùng phôi của SKU đó | Khớp mô hình TS (artwork × SKU) và cách xưởng in thật |
| Q3 | Giá ốp artwork | `product_variants.price` = giá SKU + `premium`, tính lúc seed và lưu sẵn | `place_order` vẫn đọc một cột giá, không đổi logic |
| Q4 | Đổi chữ ký `place_order`? | **Không.** Giữ `(jsonb, jsonb) → uuid`; thêm khoá trong JSON (`checkout_ref`, `variant_id`, `design_version`, `gift_message`, `shipper_note`, `voucher_code`, `policy_accepted_at`) | Không vỡ client cũ và `sim_create_sample_order` |
| Q5 | Gộp `order_vouchers` vào `vouchers`? | **Không gộp ngay.** Tạo `vouchers` cho PURCHASE/PROFILE; `VoucherRegistry.validate` đọc cả hai bảng (view `redeemable_vouchers`) | Tránh migrate dữ liệu OT đã kiểm thử |
| Q6 | `guest_session_id` (C1) | Không lưu bản nháp của khách lên server; merge khi đăng nhập | Theo Guest Session Contract; tránh bảng mồ côi |
| Q7 | Yêu thích (`caseye_favorites`) | Giữ D (ở client) ở P1; P2 cân nhắc bảng `favorites` | Spec không giao cho capability nào |
| Q8 | Đánh giá mẫu (template reviews) | Bỏ rating giả trên UI; nếu cần thì dùng chung `order_reviews` cho sản phẩm. Chưa tạo bảng riêng | Spec chỉ yêu cầu đánh giá đơn hàng |
| Q9 | `orders.ticket_id` | Giữ (text = `ticket_code`), thêm `support_ticket_id uuid FK` | Không vỡ `report_issue` hiện tại và test M9 |
| Q10 | Giá custom theo SKU ở studio (C8) | Theo Spec: đồng giá `custom_price`; SKU studio chỉ để chọn màu phôi | – |
| Q11 | Mức ưu tiên B9 | Đưa lên **P0** phần "bỏ qua `order_code` và `fee` từ client, kẹp `discount = 0`"; phần voucher đầy đủ để P1 | Lỗ hổng bảo mật, sửa rẻ |
| Q12 | DB live có default `onboarding_status` không khai báo? | Chạy `supabase db diff --linked` (chỉ đọc) **trước** P0-1; migration viết theo kiểu idempotent (`drop constraint if exists`, `alter … set default`) | Tránh migration lỗi trên môi trường live |

### 5.2 Kế hoạch migration

Quy ước:
- Mỗi migration có rollback `supabase/rollbacks/<tên>.down.sql`.
- Mỗi migration thêm ít nhất một `ok(...)` vào `supabase/tests/migrations.test.mjs`.
- Mọi thay đổi đều cộng thêm (additive); không xoá dữ liệu.

#### P0 — chặn đơn thật hoặc đăng ký

| # | File | Mục đích | DDL (phác thảo) | RLS / grant | Rollback | Seed / backfill | Test |
|---|---|---|---|---|---|---|---|
| P0-1 | `20261120090000_profiles_onboarding_pending.sql` | B1 | `alter table profiles drop constraint if exists profiles_onboarding_status_check, add constraint … check (onboarding_status in ('pending','completed','skipped'))`; `alter column onboarding_status set default 'pending'`; `create or replace function handle_new_user()` insert thêm `onboarding_status='pending'` | Giữ grant cột hiện có | Khôi phục CHECK cũ; `update … set onboarding_status='skipped' where ='pending'` trước khi thêm lại CHECK; bỏ default; khôi phục hàm | Không (dòng cũ giữ nguyên) | Bỏ workaround ở `migrations.test.mjs:42-43`; `insert into auth.users` → profile có `pending`; khách cập nhật `pending → completed` OK |
| P0-2 | `20261120090100_catalog_sku_metadata.sql` | B5 (lược đồ) | `products`: thêm `collection, styles text[] default '{}', tags text[] default '{}', badge, premium int default 0 check ≥ 0, finish, art_url, category`; `product_variants`: thêm `color_sku text, case_type text`, bỏ unique `(product_id, phone_model_id)`, thêm unique `(product_id, phone_model_id, coalesce(color_sku,''))`; `inventory_items`: thêm `sku_code text unique`, đổi `one_blank_per_phone_model` thành unique `(phone_model_id, sku_code) where kind='blank'`; `phone_models`: thêm `has_3d_model bool default false, model_3d_url text` | Catalog vẫn chỉ đọc; không thêm grant | Bỏ cột/index, khôi phục unique cũ. **Rollback chỉ chạy được khi chưa có nhiều phôi trên một model.** | – | Kiểm tra cột tồn tại; insert hai variant cùng model khác `color_sku` → OK |
| P0-3 | `20261120090200_seed_catalog_v2.sql` | B5, B4 (dữ liệu) | Sinh từ `catalog.json`: phone_models (thêm thông tin 3D); một phôi mỗi SKU (13 phôi, tồn lấy theo `stockQty`); 33 artwork × SKU tương ứng → variants (giá = SKU + premium); 10 phụ kiện (`trade_good`); phụ kiện cũ (`accessory-magsafe/airpods/strap`) chuyển `is_active=false` (không xoá vì `order_items` tham chiếu); mọi lệnh `on conflict do nothing/update` | – | Xoá các dòng seed v2 theo slug **chỉ khi chưa có `order_items` tham chiếu**; bật lại phụ kiện cũ | Phôi cũ một-mỗi-model: gắn `sku_code` mặc định | Mọi slug TS × SKU có variant active; `iphone-15-pro-max` có variant; số sản phẩm = 33 + 10 + 1 quà (+ legacy) |
| P0-4 | `20261120090300_place_order_v3.sql` | B6/B8 (idempotency), D6/B9 một phần | `orders`: thêm `checkout_ref text`, unique partial `where checkout_ref is not null`, `shipper_note text`, `gift_message text check (char_length ≤ 150)`; `create or replace place_order`: (a) nếu có đơn của `auth.uid()` trùng `checkout_ref` thì **trả id đó**; (b) **bỏ qua** `order_code` từ client; (c) `fee` = 25.000 / 45.000 theo `tier` do server tính (đọc hằng số hoặc `delivery_config`); (d) `discount` = 0 (P1 thay bằng voucher); (e) item `product` nhận `id` = variant uuid (như cũ); item `design` nhận thêm `design_version` (lưu vào `order_items.design_version`) | Giữ grant | Khôi phục thân hàm từ `…100400:116-236`; bỏ cột | – | Hai lần cùng `checkout_ref` → cùng `order_id`; gửi `order_code: 'CE-1'` → mã vẫn `CC-…`; gửi `fee: 0` cho express → 45.000; `discount: 999999` → 0. **Sửa** test `sim_create_sample_order` nếu bị ảnh hưởng. |
| P0-5 | (không phải migration) sinh lại `database.types.ts` | D2 | `supabase gen types typescript --linked > src/app/core/supabase/database.types.ts` | – | `git revert` | – | `ng build` không lỗi type |

**Sửa app kèm P0 (không có migration):**
- B4: `shop-cart.ts:60` đổi thành `custom: false` và mang `variantId`.
- B6: reset `placedOrderCode` / `placedForOrderId` khi tạo `CheckoutSession` mới.
- B7: thêm `canActivate: [authGuard]` cho `/checkout`.
- B8: `checkout_ref` sinh một lần cho mỗi phiên; retry `place_order` tối đa 2 lần, hết thì gọi `PaymentGateway.void`.
- Bỏ `CASEFIRST` áp sẵn.
- `payment_txn_ref` lấy từ mock gateway, không hard-code.

#### P1 — thay các "database" localStorage bằng bảng

| # | File | Mục đích | DDL phác thảo | RLS | Test |
|---|---|---|---|---|---|
| P1-1 | `20261121090000_profiles_pm_fields.sql` | B19, FR-PM | `profiles`: thêm `phone, birth_date, gender, is_rewarded, deletion_requested_at, signup_trigger`; CHECK regex/gender; unique partial `phone`; trigger kiểm tuổi ≥ 13 và khoá `birth_date` khi `is_rewarded` | Grant update `phone, birth_date, gender`; `is_rewarded`, `deletion_requested_at` chỉ qua RPC `request_account_deletion()`, `restore_account()` | Phone sai định dạng → lỗi; trùng phone → lỗi; khách không tự đặt được `is_rewarded` |
| P1-2 | `20261121090100_onboarding_answers.sql` | FR-PM-17 | Bảng `onboarding_answers` (xem 4.2) | Dòng của mình | Insert/select dòng của mình; B không đọc được dòng của A |
| P1-3 | `20261121090200_addresses_one_default.sql` | FR-PM-EX-11 | Backfill: mỗi user chỉ giữ default mới nhất; unique partial `(user_id) where is_default`; RPC `set_default_address(uuid)`; trigger địa chỉ đầu tiên là mặc định, xoá default thì chuyển cho địa chỉ khác | Dòng của mình | Hai default → lỗi; `set_default_address` atomic |
| P1-4 | `20261121090300_templates_banned_keywords.sql` | FR-DES-10, 26 | `templates`, `banned_keywords` + seed từ TS; RPC `check_banned(text) → text[]` khớp theo từ (`\m…\M`) | Đọc công khai dòng active | 16 template; `check_banned('nike shoes')` → `{nike}`; `'snikers'` → rỗng |
| P1-5 | `20261121090400_designs_versions.sql` | B12, B13, D8 | `designs`: thêm `template_id, version, status, requires_moderation, last_auto_saved_at`; bảng `design_versions`; backfill: mỗi design có sẵn → version 1 từ `canvas_json`/`preview_url`; RLS `designs` tách select/insert/update; update bị chặn nếu đã có `order_items` tham chiếu (trigger); `design_versions` chỉ insert/select; `place_order` kiểm `(design_id, design_version)` tồn tại và `canvas_json <> '{}'` | Như trên | Sửa design đã đặt → lỗi; `canvas_json {}` → `place_order` lỗi `design_empty` |
| P1-6 | `20261121090500_design_consents.sql` | FR-DES consent | Bảng `design_consents` | Insert/select dòng của mình | Insert OK; B không đọc được |
| P1-7 | `20261121090600_vouchers.sql` | B9, B10, FR-P | `vouchers`, `voucher_redemptions`, RPC `validate_voucher(code, subtotal, has_custom)`; `place_order` tính `discount` từ `voucher_code`, ghi redemption, `cancel_order` trả lại; seed `CASEFIRST` (AMOUNT 50k, một lần mỗi user), `VIP30` (**cần chốt**: 30% hay 30k), `CASEYE10` (PERCENT 10) | `vouchers`: không đọc trực tiếp (chỉ RPC); redemption: dòng của mình | Mã sai → `invalid_voucher`; hai đơn dùng một mã giới hạn 1 → lần 2 lỗi; huỷ COD trả lại mã |
| P1-8 | `20261121090700_payment_attempts.sql` | FR-P-23, 35 | `payment_attempts` + RPC `record_payment_attempt(...)`; `place_order` gắn `payment_txn_ref` của lần thử `paid` cuối cùng cho `checkout_ref` | Đọc dòng của mình; ghi qua RPC | 3 lần thử ghi đủ; `txn_ref` unique |
| P1-9 | `20261121090800_cod_paid_on_delivered.sql` | B18, B16 | `apply_carrier_event`: Delivered + COD → `payment_status='paid'`; tôn trọng `redelivery_used` | – | Đơn COD giao xong → `paid`; khiếu nại hoàn tiền tạo được refund S4 |
| P1-10 | `20261121090900_support_tickets.sql` | B15, FR-CS | Các bảng CS (4.8) + bucket private `support-evidence` (policy theo `<uid>/<ticket_id>/…`); sequence `ticket_code_seq`; `report_issue_v2`; `apply_ticket_result` idempotent theo ticket; `orders.support_ticket_id` | Như 4.8 | Tạo ticket và cập nhật đơn atomic; ticket mở thứ hai cùng đơn → lỗi; khách B không đọc được evidence của A |
| P1-11 | `20261121091000_help_articles.sql` | FR-CS | `help_articles` + seed từ `customer-support.ts:27-47` và `POLICY_SECTIONS` | Đọc công khai | Số bài = số FAQ |
| P1-12 | `20261121091100_order_reviews.sql` | Spec L1773 | `order_reviews` + RPC `submit_order_review` | Insert khi đơn `Completed` và là của mình; đọc công khai (ẩn `user_id`) | Review đơn chưa Completed → lỗi |

#### P2 — analytics và các màn admin mock-up

| # | File | Mục đích |
|---|---|---|
| P2-1 | `20261122090000_analytics_events.sql` | Bảng §0.7, chỉ insert (4.9) |
| P2-2 | `20261122090100_outbox_events.sql` | Outbox cho Loyalty/Messaging; `run_order_jobs_v9` ghi `Loyalty.earn` khi Completed |
| P2-3 | `20261122090200_destruction_records.sql` | FR-OT-10 |
| P2-4 | `20261122090300_risk_profiles.sql` | FR-SH-17/18; `place_order` chặn COD với khách `is_high_risk` |
| P2-5 | `20261122090400_delivery_config_holidays.sql` | `holidays(date)`, `is_working_day` đọc bảng này; `delivery_config` (phí, giờ cắt đơn) để client và SQL cùng một nguồn |
| P2-6 | `20261122090500_order_stage_durations.sql` | View cho admin (L1832) |
| P2-7 | `20261122090600_staff_catalog_write.sql` | Policy cho `admin` sửa catalog (màn admin mock-up ghi thẳng vào DB) |
| P2-8 | `20261122090700_drop_test_table.sql` | Xoá bảng `test` và policy profiles trùng (D4); rollback tạo lại |

### 5.3 Kế hoạch refactor app theo chức năng

| Chức năng | Chuyển từ mock sang Supabase | Interface cho hệ ngoài (C) | Xoá (E) | Chế độ demo |
|---|---|---|---|---|
| AUTH | `OnboardingStatusService` dùng `pending` | `AuthProvider` (Google thật hoặc demo) | – | Tài khoản demo là user thật trong `auth.users` |
| PM | `ProfileRepository` thêm phone/dob/gender; `AddressBookService` dùng `set_default_address`; onboarding ghi `onboarding_answers`; `DEVICE_CATALOG` → `phone_models` | `Messaging` (OTP) | `account.model.ts` `DESIGNS`/`ORDERS` | – |
| SH | `CatalogService` mới (đọc `products`/`product_variants`/`stock_availability`), thay `catalog.ts` bằng snapshot sinh ra; `CartItem` mang `variantId`; phụ kiện `custom: false` | `InventoryGateway` (= `stock_availability`) | Hằng số giá/tồn trong `catalog.ts` | – |
| SRCH | `ShopSearchSource` dựng từ `CatalogService`; Help từ `help_articles`; log qua `AnalyticsService` | – | `caseyes.search.log.v1` (sau P2) | – |
| DES | `StudioCatalogService` đọc `phone_models` + phôi SKU; `DesignRepository` (designs + design_versions, autosave 60s); `TemplateRepository`; banned keyword qua RPC; consent ghi `design_consents` | – | `caseye_studio_draft`, `caseyes_saved_designs_v3` (sau khi import), `UNIFIED_STUDIO_PRICE` | – |
| P | `CheckoutService`: địa chỉ từ `addresses`, voucher qua `validate_voucher`, `checkout_ref`, gửi `design_id`/`design_version` thật (bỏ insert design lúc checkout) | `PaymentGateway` (mock SafePay; ghi `payment_attempts` qua RPC) | `CE-89421`, `TXN-CEY98241`, `mock-order-001`, `item-01`, `OrderStatus` 5 giá trị của checkout, CASEFIRST áp sẵn | Dev-dock vẫn ép thành công/thất bại qua gateway mock |
| OT | `SupabaseOrderStore` là repository duy nhất; map `policyVersion`, `customerEmail`, `phone` thật; `submitReview` → `order_reviews` | `CarrierWebhook`, `Loyalty`, `Messaging` qua outbox | `LocalStorageOrderRepository`, `casecraft.ot.db.v2`, `AutoJobs` local, `clock.ts`, `customer-inbox` local, `demo-console/*`, `demo-order-factory.ts`, nhánh `!remote` trong `order-tracking.service.ts` | **Simulator admin chỉ gọi `sim_*` RPC** (đã có từ M9); `DemoSettings.down{}` giữ lại để giả lập hệ ngoài sập, nhưng không còn DB local |
| CS | `SupportTicketService` (tạo, đọc, upload evidence); form khiếu nại gọi `report_issue_v2` | `AISummary` (endpoint ngoài hoặc local rules; kết quả ghi `ai_analyses`) | Cờ `complaintSent` giả, FAQ hard-code | – |

### 5.4 Chiến lược seed: một catalog chuẩn duy nhất

1. **Nguồn:** `supabase/seed/catalog.json`. Lần đầu xuất một lần từ `catalog.ts` + `studio-catalog.ts`; sau đó chỉ sửa ở JSON.
2. **Sinh ra:**
   - Script `scripts/gen-catalog.mjs` sinh migration seed idempotent (`insert … on conflict (slug) do update`).
   - Cũng script đó sinh `src/app/features/shop/catalog.generated.ts`, chỉ làm snapshot dự phòng khi offline và dữ liệu khởi tạo cho SSR/test.
3. **Lúc chạy:** app đọc DB. Snapshot chỉ dùng khi chưa tải được.
4. **Giữ đồng bộ:**
   - Test `catalog.spec.ts` so snapshot với JSON.
   - `migrations.test.mjs` so DB sau seed với JSON (số slug, SKU, giá).
   - CI chạy cả hai.
5. **Ảnh:** giữ đường dẫn `/products/...` (tài sản tĩnh của app) ở P0. P2 chuyển sang bucket `product-images`.

### 5.5 Rủi ro

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Mất dữ liệu localStorage: `caseyes_saved_designs_v3`, giỏ `caseye_cart_v2:<uid>`, `casecraft.ot.db.v2` | Khách mất bản thiết kế đã lưu | **Import một lần khi đăng nhập**: đọc key cũ → `designs` + `design_versions` (`reason='import'`, `canvas_json` = layers), đánh dấu `caseyes.import.v1=done`, chỉ xoá key cũ khi thành công. `casecraft.ot.db.v2` là dữ liệu demo, không import. Giỏ: map `slug:model:sku` sang `variant_id`, dòng không map được thì báo cho khách. |
| Bản thiết kế cũ trong localStorage là dùng chung cho mọi tài khoản (B12) | Import nhầm sang tài khoản khác | Chỉ import khi người dùng xác nhận ("Nhập N bản thiết kế từ trình duyệt này?") |
| Lỗ hổng RLS: `designs` sửa được sau khi đặt hàng (D8); `analytics_events` cho insert ẩn danh; bucket `design-assets` public; bucket evidence | Gian lận, lộ dữ liệu, spam | Trigger chặn update; giới hạn kích thước và CHECK tên sự kiện; evidence private + signed URL; cân nhắc chuyển ảnh upload sang private |
| Thay đổi chữ ký RPC | Client cũ vỡ | Giữ `place_order(jsonb,jsonb)`; RPC mới đặt tên `_v2` (`report_issue_v2`), giữ hàm cũ một bản phát hành rồi mới bỏ |
| Seed v2 đổi unique của `product_variants` / `inventory_items` | Đơn cũ trỏ vào variant cũ | Không xoá; chỉ `is_active=false`; `order_items` có snapshot `name`/`unit_price` |
| DB live lệch migration (D1) | Migration lỗi trên production | `supabase db diff --linked` (chỉ đọc) trước khi push; migration idempotent |
| `AutoJobs` local chạy song song với cron | Trạng thái UI và DB khác nhau | Gỡ `AutoJobs` cùng đợt P0 hoặc P1 |
| Giá UI khác giá DB khi chuyển catalog | Khách thấy giá đổi lúc thanh toán | UI đọc giá từ `product_variants.price`, cùng một nguồn |

**Thứ tự triển khai:**
1. `db diff` (chỉ đọc).
2. Migration P0-1 → P0-4 (một PR, chạy `migrations.test.mjs`).
3. `supabase db push`.
4. Sinh lại types.
5. PR app P0 (B4, B6, B7, B8, bỏ CASEFIRST, đọc catalog).
6. Làm từng P1 theo cặp (migration → types → app), mỗi cặp một PR.
7. Gỡ mock (E) sau khi app không còn tham chiếu.
8. P2.

### 5.6 Checklist kiểm chứng

**Lệnh:**
- `node supabase/tests/migrations.test.mjs .` — toàn bộ migration + rollback trên PGlite; **không** còn workaround `onboarding_status`.
- `npx ng test --watch=false` — unit test; thêm test cho `CatalogService`, `CheckoutService` (`checkout_ref`), `shop-cart` (phụ kiện `custom: false`).
- `npx ng build` — kiểm type sau khi sinh lại types.
- `supabase db diff --linked` — chỉ đọc, xác nhận không còn lệch.
- `supabase gen types typescript --linked | diff - src/app/core/supabase/database.types.ts` — phải rỗng.

**Kịch bản end-to-end trên Supabase (dự án dev):**
1. **Đăng ký mới:** `profiles.onboarding_status = 'pending'` → hoàn tất onboarding → `completed` + một dòng `onboarding_answers`.
2. **Đơn COD hàng có sẵn:**
   - Ốp `lavender-haze` cho `iphone-15-pro-max`, màu titanium, cộng một phụ kiện.
   - Kỳ vọng: `status_detail = Pending_Confirmation`, `order_code` dạng `CC-…`, `shipping_fee` 25.000 do server tính, tồn của SKU giảm.
   - Tua thời gian +31 phút (simulator) → `Ready_for_Pickup`.
   - Webhook Delivered → `payment_status = paid`.
   - `confirm_received` → `Completed`.
3. **Đơn thiết kế riêng, trả trước:**
   - Lưu thiết kế (dòng `designs` + `design_versions` v1, `canvas_json` khác `{}`).
   - Thêm vào giỏ (mang `designId` + `designVersion`) → thanh toán mock → `Pending_Review`.
   - `order_items.design_version = 1`; xưởng mở được `canvas_json`.
4. **Từ chối rồi gửi lại thiết kế:**
   - Operator `moderate_design(false)` → `Action_Required`.
   - Khách sửa và lưu → v2 → `resubmit_design` → `Pending_Review`.
   - Duyệt → `Pending_Confirmation`.
   - Bản v1 không sửa được (RLS).
5. **Idempotency:** gọi `place_order` hai lần cùng `checkout_ref` → cùng một đơn. Giả lập lỗi mạng sau thanh toán → retry → không có đơn trùng.
6. **Chèn giá trị từ client:** gửi `order_code: 'CE-89421'`, `fee: 0`, `discount: 999999` → server bỏ qua.
7. **Gộp dữ liệu khách → thành viên:**
   - Khi chưa đăng nhập: thêm 2 sản phẩm, tạo bản nháp studio.
   - Đăng nhập → giỏ cộng dồn (giới hạn bởi tồn kho và 99), bản nháp chuyển sang "Thiết kế của tôi" (DB), key tạm bị xoá, thông báo "Đã chuyển X bản thiết kế và Y sản phẩm".
8. **Import một lần:** trình duyệt có sẵn `caseyes_saved_designs_v3` → đăng nhập → xác nhận → các design xuất hiện trong DB; đăng nhập lại không import lại lần nữa.
9. **RLS:**
   - Khách B không thấy đơn, design, ticket, evidence, `onboarding_answers` của A.
   - CSKH không đọc được thông tin ngân hàng.
   - Khách không tự đặt được `role` hay `is_rewarded`.
10. **Admin ↔ khách đồng bộ:** admin `sim_create_sample_order` cho email của khách → khách thấy đơn; tua thời gian → cả hai màn cùng trạng thái. Không còn key `casecraft.ot.db.v2` mới được ghi.
11. **Khiếu nại:** khách gửi Print_Defect kèm 2 ảnh → `support_tickets` + `ticket_evidence` + `orders.support_ticket_id` (atomic) → CSKH `apply_ticket_result('Reprint')` → hàng in sẵn `Ready_for_Pickup`, hàng custom `In_Production` (B17).

---

## Phụ lục — Tóm tắt

- **Nguồn mock:** ≈ 68 nguồn — A ≈ 15, B ≈ 16, C ≈ 10, D ≈ 16, E ≈ 11.
- **P0:**
  - `20261120090000_profiles_onboarding_pending.sql`
  - `20261120090100_catalog_sku_metadata.sql`
  - `20261120090200_seed_catalog_v2.sql`
  - `20261120090300_place_order_v3.sql`
  - sinh lại `database.types.ts`
  - sửa app: B4, B6, B7, B8, bỏ CASEFIRST / TXN hard-code
- **Cần chốt trước khi làm:**
  - Q1: catalog chuẩn ở DB
  - Q2: tồn kho theo SKU
  - Q5: `vouchers` tách khỏi `order_vouchers`
  - Q11: nâng một phần B9 lên P0
  - Q12: chạy `db diff` với DB live
  - giá trị thật của `VIP30` (30% hay 30.000)
