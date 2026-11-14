# Audit tích hợp hệ thống (theo prompt "Tích hợp và hoàn thiện hệ thống – Angular + Supabase")

Nhánh `integration/local`, ngày 14/11/2026. Mục 2.5 của prompt chỉ dùng để tham khảo.

## 1. Repository & branch

| Nhánh | Commit mới | Đã gộp vào `integration/local` | Ghi chú |
|---|---|---|---|
| `feature/design-studio` | `b09b28e` (14 commit mới: 16 mẫu AI, chibi, sửa texture 3D) | ✓ gộp sạch | Trùng `catalog` với phần tích hợp cũ, đã sửa |
| `feature/authentication` | `2a41f42` | ✓ | Chỉ thêm `auth_profile_management.md` (danh sách việc còn thiếu của Auth/Profile) |
| `feature/shop` | `ef06931` "update CS & SH" | ✓ có conflict, đã xử lý | Shop, chi tiết sản phẩm, giỏ hàng (`core/cart-state`), giỏ kéo ngang, tìm kiếm, chat hỗ trợ |
| `feature/checkout` | `1ec0972` "chưa db" | ✓ có conflict, đã xử lý | Checkout tách thành component (form, processing, success, failed, address modal, dev dock) |
| `feature/onboarding` | không đổi | đã gộp từ trước | |
| `feature/order-tracking` | không đổi | là gốc của nhánh tích hợp | Mọi sửa mới của Order Tracking nằm trên `integration/local` |

Build pass. Test: Order Tracking + Checkout pass. Test Shop/Cart (`shop.spec`, `cart.spec`) **đã lỗi sẵn trên `feature/shop`** (đã kiểm bằng worktree riêng); `footer`, `button`, `account`, `landing`, `hero` lỗi sẵn từ develop.

## 2. Supabase audit

Kiểm trực tiếp project `qkshedamkirnpkqxfspk` bằng publishable key (chỉ đọc, qua REST) và đối chiếu `supabase/migrations`:

| Thành phần | Trên server | Dữ liệu | Ai đang dùng trong code |
|---|---|---|---|
| `profiles` (+ onboarding_status, trigger tự tạo) | có, RLS own | — | Account, Auth |
| `addresses` | có, RLS "manage own" | trống | **chưa ai dùng** (Checkout dùng địa chỉ mẫu cứng) |
| `designs` (+ Storage folder theo user) | có, RLS own | trống | **chưa ai dùng** (Design Studio lưu localStorage) |
| `phone_models`, `inventory_items`, `products`, `product_variants`, view `stock_availability` | có | **trống** | chưa ai dùng (Shop dùng `catalog.ts` cứng) |
| `orders`, `order_items`, `order_status_history` (enum 5 trạng thái) | có, RLS read own | trống | chưa ai dùng |
| RPC `place_order`, `cancel_order` | có (chỉ `authenticated`) | — | chưa ai gọi |
| `notifications`, yêu cầu hủy, hoàn tiền, đồng ý chính sách, vai trò nhân viên | **không có** | — | Order Tracking đang mock |

**Kết luận:** schema nền đã có nhưng **chưa function nào đọc/ghi dữ liệu nghiệp vụ qua Supabase** (chỉ Auth + Profile). `place_order` cần `product_variants`/`designs` thật, trong khi catalog đang trống, nên muốn đặt hàng qua DB phải có seed dữ liệu trước.

**Bảo mật:** frontend dùng publishable key (đúng). Nhưng `supabase/.temp/start-secrets/.../docker.env` **đang được commit**, chứa service-role key và JWT secret của **stack Supabase chạy local** (Docker). Không phải key của project thật, nhưng nên gỡ khỏi git và thêm `supabase/.temp/` vào `.gitignore`.

## 3. Đã làm ở lượt này

| Commit | Nội dung |
|---|---|
| `3ae4230`, `49f0e42` | Gộp Design Studio, Authentication |
| `e47ee57` | Gộp Shop: giữ layout `ShellLayout` và **đăng nhập Supabase thật**; header thêm giỏ kéo ngang, hiệu ứng thêm giỏ, tìm kiếm của Shop; `AuthState` (đăng nhập giả bằng sessionStorage của Shop) chuyển sang đọc phiên Supabase; `/cart` dùng `authGuard`; chat hỗ trợ đặt trong `ShellLayout`. **Giỏ của Shop (`CartState`) là giỏ duy nhất**: Design Studio thêm thiết kế vào đó, nút Thanh toán của giỏ đi tới `/checkout` |
| `d0affff` | Gộp Checkout bản component, nối lại: đọc `CartState`, COD chỉ khi giỏ toàn hàng có sẵn, ô đồng ý có link chính sách, chỉ lần bấm đặt hàng thật mới tạo đơn (link `?step=success` không tạo trùng), màn thành công có nút "Theo dõi đơn hàng". Bỏ giỏ dùng chung cũ |
| `dc1ac26` | Chuyển trang luôn bắt đầu ở đầu trang (Đơn hàng → Chính sách); link `#mục` vẫn cuộn đúng, không bị header che |

Đã chạy trên web: giỏ Shop (hàng có sẵn) → Checkout → COD → đơn sang Order Tracking, giỏ được xóa; chuyển trang về đầu; link `#hoan-tien` cuộn đúng mục.

## 4. Đối chiếu Phần 1 của prompt

| Yêu cầu | Hiện trạng | Đề xuất |
|---|---|---|
| Shop: ảnh bên trái phủ kín | Chưa sửa | Sửa CSS trang Shop (phần của Mai Anh) |
| Render 3D thật từ mẫu 2D | Design Studio đã có preview 3D (model-viewer + Three.js) cho 3 mẫu iPhone; Samsung/Xiaomi có file `.glb` nhưng `has3dModel: false` | Bật 3D cho 2 máy còn lại, lưu trạng thái 3D cùng thiết kế (cần `designs` Supabase) |
| Mẫu CasePhone không bị crop vuông | Chưa rà | Rà các chỗ dùng `object-cover` khung vuông (Shop card, Account, Checkout) |
| Chuyển tab về đầu trang | **Đã xong** | |
| Liên kết chính sách thanh toán | Chưa có nội dung chính sách thanh toán | Thêm mục "Thanh toán" vào trang chính sách (COD, VietQR, ví, thẻ, hoàn tiền), link từ Checkout và Giỏ |
| Đăng ký từ màn bất kỳ → đồng bộ trạng thái; guest design | Auth dùng signal phiên Supabase (đã đồng bộ toàn app); guest draft của Design Studio lưu localStorage rồi đẩy vào "My Designs" sau đăng nhập | Lưu thiết kế lên `designs` sau đăng nhập để không mất khi đổi máy |
| Profile: xem Design & Order Tracking | Tab Đơn hàng đọc đơn thật (đã làm); tab Thiết kế dùng dữ liệu mẫu `DESIGNS` | Nối tab Thiết kế với My Designs của Design Studio / bảng `designs` |
| Profile: thêm, sửa địa chỉ | Chưa có | Làm CRUD trên bảng `addresses` (đã có RLS), Checkout lấy địa chỉ mặc định |
| Onboarding hiện ngay, skip/complete quay lại màn cũ | Guard có `returnUrl` nhưng bị trễ một nhịp | Mở onboarding ngay khi phiên mới tạo, lưu `onboarding_status`, quay về `returnUrl` |
| Notification hợp nhất | Có 4 hệ: `NotificationManager` (core), toast của Account, hộp thư + chuông của Order Tracking, chat hỗ trợ | Một `NotificationCenter` ở core, nguồn là bảng `notifications` (cần migration) |
