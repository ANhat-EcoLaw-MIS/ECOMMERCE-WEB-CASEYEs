# Hướng dẫn áp migration Quản lý đơn hàng (M1–M7)

Dành cho người giữ project Supabase `qkshedamkirnpkqxfspk`. Plan và lý do: [`docs/integration/SUPABASE_MIGRATION_PLAN.md`](../docs/integration/SUPABASE_MIGRATION_PLAN.md).

## Các file

| Thứ tự | Migration (`supabase/migrations/`) | Rollback (`supabase/rollbacks/`) | Đụng dữ liệu có sẵn? |
|---|---|---|---|
| M1 | `20261114100000_profiles_role.sql`: cột `profiles.role` (mặc định `customer`) + hàm `current_app_role`, `is_staff`, `require_role` | `…100000_profiles_role.down.sql` | Có, nhưng chỉ **thêm một cột có mặc định**. Không đổi dữ liệu user/profile |
| M2 | `20261114100100_orders_tracking.sql`: cột theo dõi đơn, `status_detail` 12 mã + trigger đồng bộ enum 5 giá trị, lịch sử có người thao tác, hàm lịch làm việc giờ Việt Nam | `…100100_orders_tracking.down.sql` | Không (`orders` đang trống) |
| M3 | `20261114100200_order_support_tables.sql`: yêu cầu hủy, hoàn tiền, đồng ý chính sách, duyệt thiết kế, vận chuyển, webhook, voucher + RLS chỉ đọc | `…100200_order_support_tables.down.sql` | Không |
| M4 | `20261114100300_notifications.sql`: bảng thông báo dùng chung + Realtime | `…100300_notifications.down.sql` | Không |
| M5 | `20261114100400_order_rpcs.sql`: RPC nghiệp vụ; **thay `place_order` và `cancel_order`** | `…100400_order_rpcs.down.sql` (sau đó chạy lại `place_order` / `cancel_order` từ `20261105060407_rpc_orders.sql`) | Không, nhưng `cancel_order` đổi hành vi: chỉ còn hủy được đơn COD trong 30 phút |
| M6 | `20261114100500_order_jobs.sql`: `run_order_jobs()` chạy mỗi phút bằng `pg_cron` | `…100500_order_jobs.down.sql` | Không |
| M7 | `20261114100600_seed_catalog.sql`: 11 dòng máy, phôi, 8 mẫu ốp + 3 phụ kiện + gói quà của Shop | `…100600_seed_catalog.down.sql` | Không (bảng catalog đang trống; chạy lại vẫn an toàn) |

Bảng `test` giữ nguyên.

## Trước khi áp

1. **Bật `pg_cron`:** Dashboard → Database → Extensions → `pg_cron`. Nếu chưa bật, M6 vẫn chạy nhưng chỉ in thông báo "schedule manually".
2. **Sao lưu:** Dashboard → Database → Backups, hoặc `supabase db dump -f backup.sql`.
3. **Kiểm tra trigger đăng ký:** `handle_new_user()` (migration `20261105084918_profiles_autocreate.sql`) chèn profile **không có `onboarding_status`**, trong khi cột này `NOT NULL`. Nếu server thật đúng như repo, đăng ký mới sẽ lỗi. Bước kiểm tra nhanh:
   ```sql
   select column_default, is_nullable from information_schema.columns
   where table_name = 'profiles' and column_name = 'onboarding_status';
   ```
   Lỗi này có từ trước và không thuộc M1–M7. Người phụ trách Auth/Profile cần chốt cách sửa, ví dụ đặt default hoặc cho phép null.

## Áp

```bash
supabase link --project-ref qkshedamkirnpkqxfspk
```

```bash
supabase db push
```

`db push` chỉ áp các file chưa có trên server, theo thứ tự tên file.

Sau khi áp, cập nhật type cho Angular rồi commit:

```bash
supabase gen types typescript --project-id qkshedamkirnpkqxfspk > src/app/core/supabase/database.types.ts
```

## Kiểm tra sau khi áp

```sql
select role, count(*) from public.profiles group by role;          -- every row: customer
select count(*) from public.products;                               -- 12
select jobname, schedule from cron.job where jobname = 'order-jobs'; -- * * * * *
```

Nhân viên: gán vai trò khi cần, ví dụ `update public.profiles set role = 'admin' where id = '<uuid>';`. Hiện khu `/admin` của web là **bản cố định, không cần đăng nhập** (đã chốt), nên chưa bắt buộc gán.

## Đã kiểm thử

`supabase/tests/migrations.test.mjs` chạy **toàn bộ migration của repo** trên Postgres (PGlite) với stub `auth`/`storage`, rồi chạy kịch bản. Kết quả: **37/37 đạt**. Các kịch bản:
- đơn thiết kế trả trước từ đặt hàng tới hoàn tất, có webhook trùng và voucher giao trễ;
- COD hủy trong 30 phút, hàng trả về kho;
- yêu cầu hủy → CSKH chấp nhận → hoàn S1 → Admin chuyển khoản;
- phân quyền RLS: khách khác, CSKH không xem được tài khoản ngân hàng, khách không tự nâng vai trò;
- tiến trình nền;
- rollback giữ nguyên toàn bộ users và profiles.

Chạy lại (ngoài repo, không thêm dependency cho project):

```bash
mkdir pgtest && cd pgtest && npm init -y && npm install @electric-sql/pglite@0.3
```

```bash
node <đường-dẫn-repo>/supabase/tests/migrations.test.mjs <đường-dẫn-repo>
```

Giới hạn: PGlite không có `pg_cron`, Realtime và Storage thật. Phần đó cần kiểm trên project sau khi áp.

## Lưu ý về khu admin không đăng nhập

Các RPC của nhân viên (duyệt thiết kế, quyết định yêu cầu hủy, hoàn tiền…) kiểm tra `profiles.role` của **người đang đăng nhập**, hoặc chấp nhận `service_role` (dùng cho Edge Function / `pg_cron`). Vì `/admin` hiện không đăng nhập, khi web chuyển sang đọc Supabase, khu admin sẽ cần một trong hai cách:
- (a) một tài khoản nhân viên cố định đăng nhập ngầm;
- (b) một Edge Function nhỏ dùng service role.

Hiện tại khu admin vẫn chạy trên dữ liệu mô phỏng, không bị ảnh hưởng.
