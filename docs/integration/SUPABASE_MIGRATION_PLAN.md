# Plan migration Supabase (bản nháp để team duyệt, chưa áp)

Nguồn: `src/app/core/supabase/database.types.ts` và `supabase.types.ts` (develop `8a9d146`, giống nhánh có phần Profile/onboarding), `supabase/migrations/*`, và kiểm tra trực tiếp project bằng publishable key (14/11/2026).

## 0. Nguyên tắc

1. **Chỉ thêm, không phá.** `auth.users` và `profiles` đã có dữ liệu thật:
   - không đổi tên hay xóa cột;
   - không đổi khóa chính;
   - cột mới trên bảng có dữ liệu phải có `default` hoặc cho phép `null`.
2. **Quan hệ đi theo `profiles.id`** (vốn là `auth.users.id`). Mọi bảng mới của khách đều tham chiếu `profiles(id)`:
   - dữ liệu thuộc về khách (thông báo, địa chỉ, thiết kế nháp): `on delete cascade`;
   - dữ liệu có giá trị pháp lý hoặc tiền (đơn hàng, hoàn tiền, đồng ý chính sách): `on delete restrict`. Không xóa được tài khoản khi còn đơn chưa khép (khớp Bảng 3.1).
3. **Khách chỉ đọc dữ liệu của mình (RLS). Mọi thay đổi trạng thái đi qua RPC `security definer`**, trong đó kiểm tra quyền và luật nghiệp vụ. Frontend không bao giờ dùng service-role key.
4. **Mỗi migration có kèm script rollback** (`down`), áp theo thứ tự, mỗi bước một file.
5. Sau khi áp: chạy `supabase gen types typescript` để cập nhật `database.types.ts`, rồi commit cùng migration.

## 1. Khung hiện có (đã kiểm)

| Bảng | Cột chính | Dữ liệu | Quan hệ |
|---|---|---|---|
| `profiles` | `id`, `display_name`, `avatar_url`, `device_type`, `preferences[]`, `onboarding_status` ('completed' / 'skipped'), `created_at`, `updated_at` | **Có** | `id` → `auth.users` (cascade) |
| `addresses` | `recipient`, `phone`, `line`, `ward`, `district?`, `city`, `is_default` | trống | → `profiles` (cascade) |
| `designs` | `phone_model_id`, `name`, `canvas_json`, `preview_url` | trống | → `profiles` (cascade), → `phone_models` |
| `phone_models` | `brand`, `name`, `slug`, `custom_price`, `mask_image_url`, `is_active` | trống | |
| `inventory_items` | `kind` (blank / material / trade_good), `quantity_on_hand` | trống | → `phone_models` |
| `products`, `product_variants` | `product_type` (case / accessory), `price`, `slug`, ảnh | trống | variant → product, model, inventory |
| `orders` | `status` enum (pending / confirmed / shipping / delivered / cancelled), `total`, `payment_method`, snapshot địa chỉ | trống | → `profiles` (**không cascade**) |
| `order_items` | `variant_id` **hoặc** `design_id`, `inventory_item_id`, `name`, `image_url`, `unit_price`, `qty` | trống | → `orders` (cascade) |
| `order_status_history` | `status`, `note` | trống | trigger ghi khi đổi `status` |
| RPC | `place_order(p_items, p_shipping)`: trừ kho, tính `total`; `cancel_order`: hủy mọi đơn `pending` | — | chỉ role `authenticated` |
| Storage | bucket ảnh sản phẩm (public), `design-assets` (thư mục theo user) | — | |
| view `stock_availability` | | | |
| Bảng `test` | bảng thử | 1 dòng | Nên xóa khi dọn |

**Thiếu so với nghiệp vụ:**
- vai trò nhân viên;
- 12 trạng thái chi tiết, mốc thời gian và ngày giao dự kiến của đơn;
- gói giao và phí ship;
- yêu cầu hủy, hoàn tiền, đồng ý chính sách;
- vận chuyển và webhook;
- voucher bồi thường;
- thông báo dùng chung;
- duyệt thiết kế;
- dữ liệu catalog.

## 2. Các migration đề xuất

### M1 `profiles_role` – vai trò nhân viên (đụng bảng có dữ liệu)

```sql
alter table public.profiles
  add column role text not null default 'customer'
  check (role in ('customer', 'operator', 'cskh', 'admin'));
-- every existing profile becomes 'customer' (default); no other column changes.
-- Customers can NOT change their own role: the existing column grant
-- "update (display_name, avatar_url, device_type, preferences, onboarding_status)" stays as is.

create function public.current_app_role() returns text
  language sql stable security definer set search_path = ''
  as $$ select role from public.profiles where id = auth.uid() $$;
```

- **Tác động:** thêm một cột có giá trị mặc định cho mọi dòng cũ. Không đổi gì ở `auth.users`.
- **Rollback:** `drop function current_app_role(); alter table profiles drop column role;`
- Thay cho vai trò demo ở `/admin`: `StaffSession` đọc `profiles.role`, và `roleGuard` dùng giá trị đó.

### M2 `orders_tracking` – mở rộng đơn hàng (bảng đang trống)

1. **Bảng `orders`:**
   - Giữ enum 5 giá trị trong `status` cho các module khác. Thêm `status_detail text not null default 'Pending_Confirmation'`, `check` theo 12 mã BRD v8.
   - Trigger `sync_order_status` tự map `status_detail` sang `status`:

     | `status` | `status_detail` |
     |---|---|
     | `pending` | Pending_Review, Pending_Confirmation, Action_Required |
     | `confirmed` | In_Production, Ready_for_Pickup |
     | `shipping` | In_Transit, Delivery_Failed |
     | `delivered` | Delivered, Completed, Return_Requested |
     | `cancelled` | Cancelled, Refunded |

   - Cột thêm:
     - mã và thanh toán: `order_code` unique, `payment_status` (unpaid / paid), `payment_txn_ref`;
     - giao hàng và tiền: `shipping_tier` (standard / express), `shipping_fee`, `standard_fee`, `express_surcharge`, `transit_min`, `transit_max`, `goods_total`, `discount`;
     - ngày giao dự kiến: `earliest_edd date`, `latest_edd date`, `batch_date date`;
     - mốc thời gian: `confirmed_at`, `confirm_due_at`, `review_queued_at`, `rejected_at`, `delivered_at`, `auto_complete_at`, `frozen_at`;
     - bộ đếm và cờ: `design_resubmit_count`, `redelivery_used`, `qc_reprint_count`, `late_voucher_issued`;
     - giao thất bại: `failure_cause`, `fault_override`, `warehouse_hold_until`, `warehouse_disputed`;
     - `updated_at`, `version int` (khóa lạc quan).
2. **Bảng `order_status_history`:** thêm `status_detail`, `actor_type`, `actor_id`, `reason`. Trigger cũ vẫn ghi `status`; trigger mới ghi thêm các cột này.
3. **Bảng `order_items`:** thêm `phone_model text` (snapshot dòng máy) và `design_version int`.

- **Tác động:** bảng `orders` hiện trống. Mọi cột mới có default nên không ảnh hưởng `place_order` cũ.
- **Rollback:** drop các cột và trigger mới.

### M3 `order_support_tables` – bảng mới (đều tham chiếu `orders` hoặc `profiles`)

| Bảng | Cột chính | Xóa đơn / tài khoản |
|---|---|---|
| `cancel_requests` | `order_id`, `reason`, `note`, `status` (pending / accepted / rejected / withdrawn), `sla_due_at`, `decided_at`, `decided_by` → profiles, `decision_reason` | đơn: cascade |
| `refund_requests` | `order_id`, `situation` (S1–S4), `amount`, `deducted_fee`, `status`, `bank`, `account_no`, `account_holder`, `bank_ref`, `transfer_attempts`, `reminder_sent_at`, `escalated_at`, `approved_by` | đơn: **restrict** |
| `policy_consents` | `order_id`, `user_id`, `policy_version`, `accepted_at` | user: **restrict** |
| `design_reviews` | `order_id`, `design_id`, `round`, `decision`, `violation_group`, `reason`, `reviewer_id` | đơn: cascade |
| `shipments` + `delivery_attempts` | `carrier`, `tracking_code`; `attempt_no`, `started_at`, `result`, `failure_cause`, `ended_at` | đơn: cascade |
| `webhook_events` | `event_id` unique, `order_id`, `type`, `payload`, `received_at` (idempotent) | đơn: cascade |
| `order_vouchers` | `order_id`, `kind` (late / express_surcharge / complaint), `code` unique, `value`, `expires_at`, `used_at` | đơn: cascade |

- **RLS:**
  - khách `select` dòng thuộc đơn của mình (`exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())`);
  - nhân viên `select` theo `current_app_role()`;
  - **không ai `insert` / `update` trực tiếp**, chỉ qua RPC ở M5.
- Thông tin tài khoản ngân hàng trong `refund_requests` chỉ khách chủ đơn và `admin` đọc được.

### M4 `notifications` – thông báo dùng chung toàn app (Phần 1.4 của prompt)

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('order', 'design', 'payment', 'support')),
  title text not null,
  body text not null,
  link text,                         -- e.g. /order-tracking/CC-...
  created_at timestamptz not null default now(),
  read_at timestamptz
);
-- RLS: select own; update own (read_at only, column grant). Inserts only from triggers / RPC.
```

- **Nguồn phát sinh:** RPC và trigger của đơn hàng (đặt hàng, duyệt / từ chối thiết kế, giao, giao thất bại, hoàn tiền), Thanh toán (thanh toán thành công / thất bại), Design Studio (thiết kế bị từ chối khi kiểm duyệt).
- **Frontend:** một `NotificationCenter` ở `core/` đọc bảng này qua Supabase Realtime. Thay cho chuông và hộp thư riêng của Order Tracking và toast của Account; toast của `NotificationManager` chỉ còn dùng cho phản hồi tức thời trên màn hình.

### M5 RPC nghiệp vụ (`security definer`, kiểm tra `auth.uid()` và vai trò)

| RPC | Ai gọi | Thay đổi |
|---|---|---|
| `place_order` (sửa) | Thanh toán | Nhận thêm gói giao, phí, số ngày vận chuyển, `policy_version`, phương thức (cod / prepaid). Kiểm tra COD và Hỏa tốc chỉ khi giỏ toàn hàng có sẵn. Đặt `status_detail` ban đầu (có thiết kế → Pending_Review), `confirm_due_at` cho COD, lưu `policy_consents` |
| `cancel_order` (sửa) | Khách | Chỉ cho đơn COD trong thời gian đổi ý (BRD v8). Hiện bản cũ cho hủy mọi đơn `pending`, kể cả đơn đã trả tiền |
| `request_cancel`, `withdraw_cancel_request` | Khách | |
| `decide_cancel_request` | `cskh` | |
| `moderate_design`, `start_production`, `mark_packed`, `mark_qc_reprint` | `operator` | |
| `apply_carrier_event` | Edge Function webhook (idempotent theo `event_id`) | |
| `submit_refund_account` | Khách | |
| `approve_refund`, `complete_refund`, `mark_transfer_failed`, `retry_transfer`, `reject_refund` | `admin` | |
| `confirm_received`, `report_issue`, `request_redelivery` | Khách | |
| `list_open_orders(user_id)` | Profile (chặn xóa tài khoản) | |

### M6 `order_jobs` – tiến trình nền bằng `pg_cron`

Thay cho `AutoJobs` đang chạy trong trình duyệt:
- đợt sản xuất 16:00 (Thứ 2 – Thứ 6, có chạy bù);
- tự hoàn tất sau 72 giờ;
- hết hạn lưu kho 14 ngày;
- hết hạn sửa thiết kế 7 ngày;
- nhắc khách nhập tài khoản hoàn tiền, chuyển CSKH sau 7 ngày.

Cùng logic với `domain/schedule.ts` và `scheduled-jobs.ts`.

### M7 `seed_catalog` – dữ liệu cho Shop và Design Studio

- `phone_models`: 5 máy của Design Studio (iPhone 15 Pro Max, 16 Pro, 15 Pro, Galaxy S24, Xiaomi 14 Ultra), `custom_price = 250000`, thêm các máy trong `MODELS` của Shop.
- `inventory_items`: phôi (`blank`) theo từng máy, hàng thương mại (`trade_good`) cho phụ kiện.
- `products` / `product_variants`: 8 mẫu và 3 phụ kiện trong `features/shop/catalog.ts`, giá và tồn kho lấy đúng như file đó.
- Seed chạy `on conflict (slug) do nothing`, chạy lại nhiều lần vẫn an toàn.

## 3. Thứ tự áp và kiểm tra

1. M1 → kiểm tra: user cũ vẫn đăng nhập và đọc được profile, `role = 'customer'`, khách không update được `role`.
2. M7 (seed) → kiểm tra: Shop đọc được `products` bằng publishable key.
3. M2 → M3 → M4 → M5 → kiểm tra: `place_order` với user thử tạo đúng đơn; khách A không đọc được đơn của khách B; `cskh` không duyệt được hoàn tiền.
4. M6 sau cùng (`pg_cron`).
5. `supabase gen types` → cập nhật `database.types.ts`.
6. Frontend:
   - viết `SupabaseOrderRepository` (cùng interface với `OrderRepository` hiện có) và chuyển provider;
   - Shop và Checkout đọc catalog, địa chỉ;
   - Design Studio lưu `designs`;
   - Profile đọc `addresses`, `designs`, `orders`.

## 4. Cần team quyết trước khi viết SQL

| # | Câu hỏi | Đề xuất |
|---|---|---|
| Q1 | Ai áp migration lên project thật? Mình không có mật khẩu DB hay access token | Mình viết file SQL và rollback, người giữ project chạy `supabase db push` sau khi duyệt |
| Q2 | Ngày giao dự kiến tính ở đâu? | Giai đoạn đầu: Angular tính (`domain/edd.ts`, đã có test), `place_order` lưu lại. Sau mới chuyển vào SQL |
| Q3 | Tài khoản nào là `operator` / `cskh` / `admin`? | Gán bằng SQL theo email do team đưa |
| Q4 | Bảng `test` và RPC `cancel_order` cũ | Xóa `test`; thay `cancel_order` bằng bản theo BRD v8 (đổi hành vi) |
| Q5 | Ví (MoMo…) và thẻ trong Checkout | Lưu là `prepaid`, có thêm `payment_channel` để biết kênh |
| Q6 | Khiếu nại (CSKH & Khiếu nại) | Bảng ticket thuộc function CSKH; Order Tracking chỉ cần `ticket_id` và kết quả |

## 5. Đã chốt (15/11/2026) và đã viết

| # | Quyết định |
|---|---|
| Q1 | Mình viết SQL + rollback lên nhánh integration, người giữ project áp (xem `supabase/APPLY_MIGRATIONS.md`) |
| Q2 | Ngày giao dự kiến do Angular tính, `place_order` lưu lại |
| Q3 | Khu admin cố định, không cần đăng nhập; chưa gán vai trò theo email (cột `role` vẫn có sẵn) |
| Q4 | Giữ nguyên bảng `test`; thay `cancel_order` theo BRD v8 |
| Q5 | Thanh toán là mock: lưu `payment_method` (cod / prepaid) + `payment_channel` (vietqr / e_wallet / card / cod), không ràng buộc chặt |
| Q6 | Ticket thuộc CSKH & Khiếu nại; đơn chỉ giữ `ticket_id` và kết quả (`apply_ticket_result`) |

Migration M1–M7 và rollback nằm trong `supabase/migrations/20261114100*` và `supabase/rollbacks/`, đã chạy thử 37/37 kịch bản trên Postgres (PGlite).
