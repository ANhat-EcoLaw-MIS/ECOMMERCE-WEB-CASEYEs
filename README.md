# CasEYE's — Cửa hàng ốp lưng điện thoại thiết kế riêng

Ứng dụng web thương mại điện tử cho phép khách hàng mua ốp lưng có sẵn, tự thiết kế ốp lưng trong Design Studio, đặt hàng và theo dõi đơn hàng. Dự án môn học (Đồ án WEB).

## Tính năng

- **Cửa hàng** (`/shop`): ốp lưng theo dòng máy, phụ kiện, chi tiết sản phẩm
- **Design Studio** (`/design-studio`): thiết kế ốp lưng, lưu thiết kế, mẫu cộng đồng
- **Giỏ hàng & Thanh toán**: giỏ hàng, địa chỉ, đặt hàng qua RPC Supabase
- **Theo dõi đơn hàng**: trang khách hàng + không gian làm việc cho admin/nhân viên, đồng bộ trực tiếp
- **Tài khoản**: đăng ký/đăng nhập, onboarding, hồ sơ, thiết kế đã lưu
- **Tìm kiếm** (`/tim-kiem`) và **Hỗ trợ khách hàng**

## Công nghệ

Angular 22 (standalone, signals) · Tailwind CSS 4 · SCSS · Supabase (Postgres, Auth, RLS, Storage) · Vitest

## Bắt đầu

```bash
npm ci
npm start                # http://localhost:4200
npm run start:network    # mở cho thiết bị khác trong cùng mạng (điện thoại thật)
```

Trên Windows PowerShell, nếu gặp lỗi Execution Policy, dùng `npm.cmd` thay cho `npm`.

Cấu hình Supabase nằm ở `src/environments/` (chỉ chứa publishable key; không bao giờ commit service-role key).

### Build và test

```bash
npm run build
npm test -- --watch=false
```

## Cơ sở dữ liệu (Supabase)

```
supabase/
  migrations/   schema, RLS, RPC, seed (áp theo thứ tự timestamp)
  rollbacks/    file .down.sql tương ứng cho từng migration
  seed/         catalog.json — nguồn duy nhất của danh mục sản phẩm
  tests/        kiểm tra migration
```

- Sinh lại migration seed: `node scripts/gen-catalog-seed.mjs` (kiểm tra: `--check`)
- Hướng dẫn áp migration: [docs/database/apply-migrations.md](docs/database/apply-migrations.md)

## Cấu trúc thư mục

```
src/app/
  core/       layout, auth, giỏ hàng, supabase, tìm kiếm, hỗ trợ
  features/   landing, shop, design-studio, cart, checkout, order-tracking, account, auth, search, customer-support
  shared/     ui, models, services, utils, devices, policy
public/       hình ảnh, mô hình 3D, tài nguyên template/sticker
scripts/      công cụ sinh seed và tài nguyên
docs/         tài liệu đặc tả và hướng dẫn (xem docs/README.md)
```

## Tài liệu

Xem [docs/README.md](docs/README.md).
