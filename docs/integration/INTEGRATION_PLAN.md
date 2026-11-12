# Kế hoạch tích hợp CasEYE's (giai đoạn A)

Nhánh `integration/local` (tạo từ `feature/order-tracking`, chỉ ở máy, chưa push). Ngày 12/11/2026.
Đã gộp: `origin/feature/design-studio`, `origin/feature/checkout`, `origin/feature/onboarding`, `origin/feature/shop` (develop đã có từ trước qua `69e2773`).

## 1. Tóm tắt

**Hiện trạng.** Mới có 4/7 function có code thật: Trang chủ & Tài khoản (auth + onboarding), Design Studio, Thanh toán, Order Tracking. **Mua sắm** (`shop`, `cart`), **CSKH & Khiếu nại** (`customer-support`) và **Ưu đãi/Loyalty** mới là khung trống hoặc chưa có. Không có khu quản trị (`/admin`) và profile chưa có cột role. Mỗi function giữ dữ liệu riêng: Design Studio, Checkout và Order Tracking lưu ở localStorage/signal; Account dùng mảng tĩnh `ORDERS`. Hiện **chưa có đường dữ liệu nào chạy từ function này sang function khác**.

**Điểm lệch nghiêm trọng nhất**
1. **Checkout không tạo đơn sang Order Tracking** (MIS-01). `generateOrder()` chỉ trả về object, không lưu, không điều hướng.
2. **COD:** Checkout khóa cứng COD vì "toàn bộ là hàng custom", trong khi Order Tracking (BRD v8) cho COD với đơn hàng có sẵn và có 30 phút đổi ý (MIS-02).
3. **Hàng có sẵn chưa có đường vào:** Shop và Cart trống. Checkout chỉ nhận `CustomOrderItem` (MIS-03).
4. **Phương thức thanh toán:** Checkout có `vietqr | momo | card | cod`. Order Tracking có `COD | QR_Transfer`. Bảng `orders` trong Supabase chưa có cột này (MIS-04).
5. **Trạng thái đơn có 3 bộ khác nhau:** Checkout (4 giá trị), Supabase `order_status` (5 giá trị), Order Tracking (12 mã BRD v8) (MIS-05).
6. **Ngày giao dự kiến:** gói giao của Checkout chỉ có `estimatedDelivery` dạng chữ. Thiếu `transitDays`, `standardFee`, `expressSurcharge`, nên Order Tracking không tính được EDD (MIS-06).
7. **Trùng lặp:**
   - Màn "thành công" của Checkout tự vẽ tiến độ xưởng, trùng với timeline của Order Tracking.
   - Tab "Đơn hàng" trong Account dùng dữ liệu giả riêng, trùng với `/order-tracking` (MIS-07, MIS-08).
8. **Design Studio → Giỏ hàng chưa nối:** `onAddToCart()` chỉ hiện toast (MIS-09).
9. **Không có role và khu quản trị:** Operator/CSKH/Admin đang mô phỏng bằng Demo Console (MIS-10, mục 7).

**Hướng đề xuất.**
- **Không đợi Supabase.** Chốt một lớp hợp đồng dùng chung, đặt ở `src/app/shared/models/` + `shared/services/`, gồm `CartItem`, `OrderHandoff`, `PolicyConsent`. Nối các function bằng các service `providedIn: 'root'` đang có.
- **Lưu trữ:** dùng localStorage, nằm sau repository để sau này đổi sang Supabase.
- **Lấy làm chuẩn:**
  - `OrderHandoff` của Order Tracking cho chặng Thanh toán → Đơn.
  - `CustomOrderItem` của Checkout làm gốc cho `CartItem`, thêm `productType`.

## 2. Hiện trạng theo branch

| Branch | Function | Người làm | Commit cuối | So với develop | Gộp vào nhánh tích hợp | % (theo README/code) |
|---|---|---|---|---|---|---|
| `develop` | nền: layout, auth, migrations | team | `dec98cb` 05/11 | — | đã có | — |
| `feature/authentication` | Tài khoản (đăng nhập) | — | `46be82b` 31/10 | đã nằm trong develop | — | xong phần đăng nhập |
| `feature/onboarding` | Trang chủ & Tài khoản | — | `1040533` 06/11 | +3 / −1 | conflict `app.html`, `app.ts`, `app.routes.ts`, `tokens.css`: **đã xử lý** | onboarding + account (tab đơn dùng mock) |
| `feature/design-studio` | Design Studio | Đức | `80e3e75` 12/11 | +63 / −2 | conflict `app.routes.ts`: **đã xử lý** | ~85%; còn: giỏ hàng, Supabase, AI |
| `feature/checkout` | Thanh toán | Hồng Thắm | `bb4bfb3` 12/11 | +2 / −15 | conflict `app.routes.ts`, `index.html`, `tokens.css`, `docs/SKILL.md`: **đã xử lý** | UI xong; chưa tạo đơn thật |
| `feature/order-tracking` | Order Tracking | Thy | `69e2773` (local) | +nhiều | nhánh gốc | ~90% (mock) |
| `feature/shop` | Mua sắm | Mai Anh | `844f72e` 22/10 | chỉ `SHOP-README.md` ("hello Vietnam !!!") | sạch | 0%, **chưa push code** |
| — | CSKH & Khiếu nại | — | — | `customer-support` là khung 20 dòng | — | 0% |
| — | Ưu đãi / Loyalty | — | — | chưa có thư mục | — | 0% |
| `test`, `main` | nền | — | 10/2026 | cũ | không gộp | — |

**Build:** chưa chạy được trên nhánh tích hợp. `npm ci` cần cài thêm `@google/model-viewer` và `html2canvas` (từ Design Studio), nhưng `node_modules` đang bị server `npm start` khóa. Cần tắt server rồi chạy lại (xem cuối file). README Design Studio ghi build của nhánh đó pass. Các nhánh khác chưa build riêng.

## 3. Ma trận điểm nối

| Điểm nối | Kết luận | Bằng chứng |
|---|---|---|
| Tài khoản ↔ tất cả | **Lệch / Thiếu.** Phiên Supabase dùng chung qua `SupabaseAuthService` (khớp). Chưa có role (Khách/Admin/Operator/CSKH), chưa có guard theo role. | `core/supabase/supabase-auth.service.ts`, `core/auth/auth-guard.ts`; `supabase/migrations/*profiles*.sql` không có cột role |
| Mua sắm → Giỏ hàng | **Thiếu** | `features/shop/shop.ts` (20 dòng), `features/cart/cart.ts` (23 dòng) |
| Design Studio → Giỏ hàng | **Thiếu.** Chỉ hiện toast. | `design-studio/components/studio-workspace/studio-workspace.ts` `onAddToCart()`; DESIGN-STUDIO-README §4.1 |
| Giỏ hàng → Thanh toán | **Thiếu.** Checkout đã có API `items.set()`, `updateAddress()`, `applyVoucher()` nhưng chưa ai gọi. Item không có `productType`. | `checkout/README.md` §5.3; `checkout/models/checkout.model.ts` |
| Thanh toán → Order Tracking | **Thiếu + Lệch.** Không tạo đơn. Lệch kiểu thanh toán, trạng thái, gói giao, thiếu `PolicyConsent`. | `checkout/services/checkout.service.ts` `generateOrder()`; `order-tracking/models/order-handoff.model.ts` |
| Order Tracking ↔ CSKH | **Thiếu.** CSKH chưa có code; yêu cầu hủy và khiếu nại đang mô phỏng trong Demo Console. | `order-tracking/services/integrations.ts` (`ComplaintService` mock) |
| Order Tracking ↔ Loyalty | **Thiếu.** Bên đơn đã phát sự kiện (cộng/thu hồi điểm, voucher trễ hạn) qua mock. Chưa có bên nhận. | `integrations.ts` `LoyaltyService` |
| Order Tracking ↔ Thanh toán (hoàn tiền) | **Trùng/Lệch nhẹ.** Hoàn tiền do Admin xác nhận đang nằm trong Order Tracking, khớp BRD v8 "không tự động". Checkout không có phần hoàn tiền. | `order-tracking.service.ts` `approveRefund`/`completeRefund` |
| Account ↔ Order Tracking | **Trùng lặp.** Tab đơn của Account dùng `ORDERS` tĩnh. | `account/components/orders-tab/orders-tab.ts` |
| Layout / routing | **Đã khớp trên nhánh tích hợp.** `ShellLayout` của Onboarding, cộng `/checkout` và `/order-tracking`. Editor full-screen của Design Studio chuyển vào `ShellLayout`. | `app.routes.ts`, `core/layout/shell-layout/*` |
| Design token | **Khớp (gộp).** `tokens.css` giữ cả bộ token Material của Checkout và token Onboarding. Hai cặp màu trùng nghĩa: `--color-state-error` ~ `--color-danger`, `--color-state-success` ~ `--color-success`. | `src/styles/tokens.css` |
| Thông báo | **Trùng lặp.** Có 3 hệ thông báo: `shared/ui/notification` (develop), `account/components/toast-list` (Onboarding), hộp thư mock của Order Tracking. | `app.html`, `integrations.ts` |
| Format tiền/ngày | **Trùng lặp.** Mỗi function tự format, ví dụ `formatVnd` của Order Tracking. | `order-tracking/domain/shipping-fee.ts` |

## 4. Điểm chưa khớp cần cập nhật

| Mã | Function | Mô tả | Mức | Đề xuất ai sửa / sửa gì | Team quyết? |
|---|---|---|---|---|---|
| MIS-01 | Thanh toán → Order Tracking | Đặt hàng xong không tạo đơn | Chặn luồng | Thanh toán: khi thanh toán thành công thì map `CheckoutOrder` → `OrderHandoff` và gọi `OrderTrackingService.receiveHandoff()`, qua service dùng chung ở `shared/` để không import chéo feature. Màn thành công có nút "Theo dõi đơn hàng" → `/order-tracking/:code` | Không (tự nối được) |
| MIS-02 | Thanh toán, Order Tracking | COD: Checkout khóa hết; BRD v8 cho COD với đơn chỉ có hàng có sẵn | Chặn luồng (đơn có sẵn COD) | Mở COD khi giỏ chỉ có hàng có sẵn, khóa khi có hàng custom | **Có** |
| MIS-03 | Mua sắm, Giỏ hàng | Chưa có Shop/Cart | Chặn luồng | Mai Anh / người làm Cart push code. Tạm thời: Cart tối thiểu (liệt kê `CartItem`, nút Thanh toán) | **Có** (ai làm Cart) |
| MIS-04 | Thanh toán, Order Tracking, DB | Phương thức thanh toán lệch (`momo`, `card` vs BRD "không có cổng") | Quan trọng | Map: `vietqr` → `QR_Transfer`; `cod` → `COD`; `momo`/`card` ẩn hoặc coi như trả trước | **Có** |
| MIS-05 | Thanh toán, Order Tracking, DB | 3 bộ trạng thái đơn | Quan trọng | Chốt: 12 mã BRD v8 là trạng thái chi tiết; `order_status` (5) là trạng thái lớn. Checkout chỉ cần `paid`/`pending` cho thanh toán | **Có** |
| MIS-06 | Thanh toán | Gói giao thiếu `transitDays`, `standardFee`, `expressSurcharge`; Hỏa tốc đang mở cho cả hàng custom | Quan trọng | Thêm các field vào `ShippingMethod`; chỉ cho Hỏa tốc khi giỏ toàn hàng có sẵn | Không |
| MIS-07 | Thanh toán | Màn thành công tự vẽ tiến độ xưởng | Nhỏ | Thay bằng link sang Order Tracking | Không |
| MIS-08 | Tài khoản | Tab đơn của Account là mock riêng | Quan trọng | Đọc danh sách từ Order Tracking qua service dùng chung, hoặc chuyển tab thành link `/order-tracking` | **Có** |
| MIS-09 | Design Studio → Giỏ hàng | `onAddToCart()` chưa đẩy dữ liệu | Chặn luồng (đơn custom) | Tạo `CartService` dùng chung (`shared/`); Design Studio thêm `CartItem{productType:'CUSTOM', designId, previewUrl, device, price}` | Không |
| MIS-10 | Tài khoản | Không có role, không có khu admin | Quan trọng | Thêm `role` vào profile (migration) + `roleGuard`; tạm dùng role demo | **Có** |
| MIS-11 | Thanh toán | Chưa có ô đồng ý chính sách (FR-OT-17) | Quan trọng | Chuyển `app-policy-consent` sang `shared/` để Checkout dùng | Không |
| MIS-12 | Thanh toán | Màn lỗi có đồng hồ đếm ngược 15:00, ngược nguyên tắc "không hối thúc" | Nhỏ | Góp ý cho người làm Thanh toán | **Có** |
| MIS-13 | Thanh toán | Route `?step=` và Dev Dock (`?dev=true`) nằm trong trang khách | Nhỏ | Gom vào khu admin/simulator như Order Tracking (mục 7) | **Có** |
| MIS-14 | Dùng chung | 3 hệ thông báo, 2 bộ token trùng nghĩa | Nhỏ | Chốt `shared/ui/notification` làm chuẩn; hợp nhất token sau | **Có** |
| MIS-15 | Thanh toán | Commit đổi tên nhầm `docs/GIT_WORKFLOW.md` → `docs/Skill (2).md`; thêm `checkout_readme.md` rỗng | Nhỏ | Đã khôi phục tên trên nhánh tích hợp; người làm Thanh toán sửa trên nhánh của mình | Không |
| MIS-16 | Thanh toán | `pathMatch: 'full'` trên các route lazy cha (`design-studio`, `cart`, `account`…) làm hỏng route con | Chặn (route con) | Đã bỏ trên nhánh tích hợp | Không |
| MIS-17 | Shop | Merge Shop làm Git hiểu `DESIGN-STUDIO-README.md` thành `SHOP-README.md` | Nhỏ | Đã tách lại 2 file | Không |
| MIS-18 | Design Studio | `html2canvas` cài nhưng không dùng; bundle vượt budget (667 kB / 500 kB) | Nhỏ | Đức tự dọn | Không |
| MIS-19 | DB | `orders`/`cancel_order` của develop cho hủy mọi đơn `pending`; thiếu EDD, tier, confirmedAt, policy, refund, cancel request | Quan trọng | Viết migration bổ sung theo BRD v8 (Order Tracking đề xuất) | **Có** |

## 5. Lệch so với tài liệu

- **Order Tracking:** đối chiếu với BRD v8 trong `docs/ui-review/report-v8.md`. Còn thiếu: chấm đỏ/chuông ở Header, ô đồng ý tại Checkout thật, Lighthouse.
- **Thanh toán:**
  - Khóa COD hoàn toàn, khác BRD v8 của Order Tracking (COD với hàng có sẵn).
  - Có MoMo/Thẻ, khác BRD "không có cổng thanh toán".
  - Có đếm ngược 15 phút.
  - README ghi Angular 19, repo là Angular 22.
- **Design Studio:** README ghi đồng giá 250.000đ. Checkout mẫu dùng 464.000đ cho hàng custom, nên **giá chưa thống nhất**.
- **Các function khác:** chưa có BRD/SRD trong repo để đối chiếu. Từng người tự rà.

## 6. Kế hoạch triển khai tích hợp

**Thứ tự merge (đã làm trên `integration/local`):**
1. develop (nền);
2. Design Studio (đổi `package.json`, `index.html`);
3. Checkout (thêm route, token);
4. Onboarding (dựng lại layout `ShellLayout`, phải sau cùng để bọc mọi route);
5. Shop.

Các nhánh mới về sau gộp theo cùng thứ tự.

**Lớp dùng chung cần chốt (tận dụng file đang có):**

| Thành phần | Lấy từ | Đặt ở |
|---|---|---|
| `CartItem` | gốc `CustomOrderItem` (Checkout), thêm `productType: 'IN_STOCK' \| 'CUSTOM'`, `designId?`, `previewUrl` | `shared/models/cart.model.ts` |
| `CartService` (signal + localStorage) | mới, nhỏ | `shared/services/cart.service.ts` |
| `OrderHandoff`, `ShippingQuote`, `PolicyConsent` | Order Tracking `models/order-handoff.model.ts` | chuyển sang `shared/models/` |
| `app-policy-consent` + `POLICY_HIGHLIGHTS` | Order Tracking | `shared/ui/policy-consent/` |
| Cổng nhận đơn `OrderIntake` (interface + token) | mới; Order Tracking cung cấp bản cài | `shared/services/order-intake.ts` |
| Thông báo | `shared/ui/notification` (develop) | giữ |
| Format tiền | `formatVnd` | `shared/utils/format.ts` |

**Các bước nhỏ:**

| # | Mục tiêu | File | Gợi ý người làm | Nghiệm thu |
|---|---|---|---|---|
| B1 | Build/test xanh trên nhánh tích hợp | — | Thy | `ng build`, test Order Tracking pass |
| B2 | Tạo lớp `shared/` ở bảng trên | `shared/**` | Thy | Không còn import chéo feature |
| B3 | Design Studio → Cart | `studio-workspace.ts` (`onAddToCart`) | Đức (Thy làm hộ nếu cần) | Bấm "Thêm vào giỏ" thì Cart có item CUSTOM |
| B4 | Cart tối thiểu → Checkout | `features/cart/*` | Người làm Cart / Thy tạm | Cart liệt kê item, nút Thanh toán đổ dữ liệu sang `CheckoutService` |
| B5 | Checkout → Order Tracking | `checkout.service.ts`, `checkout.ts` | Hồng Thắm / Thy | Thanh toán thành công thì đơn xuất hiện ở `/order-tracking` với EDD đúng |
| B6 | Ô đồng ý chính sách ở Checkout | `checkout.html` | Hồng Thắm | Không tick thì không đặt được hàng; đơn lưu `policyVersion` |
| B7 | Tách khu admin cho Order Tracking | xem mục 7 | Thy | Theo nghiệm thu mục 7 |
| B8 | Account → đơn hàng thật | `orders-tab.*` | người làm Account | Tab đơn hiện đúng đơn vừa đặt |

**Kịch bản test xuyên suốt:**
1. Đơn hàng có sẵn COD *(chặn bởi MIS-02/03)*.
2. Đơn custom trả online: Studio → Cart → Checkout → đơn chờ duyệt → admin duyệt → giao.
3. Đơn hỗn hợp *(chặn bởi MIS-03)*.
4. Hủy đơn: COD trong 30 phút; trả trước gửi yêu cầu → CSKH.
5. Giao thất bại → giao lại.
6. Khiếu nại → hoàn tiền (Admin).
7. Cộng điểm *(chặn: Loyalty chưa có, chỉ kiểm sự kiện mock)*.

**Rủi ro / câu hỏi cho team:** MIS-02, 04, 05, 08, 10, 12, 13, 14, 19. Thêm hai câu:
- Ai làm Cart, CSKH, Loyalty?
- Giá hàng custom là 250.000đ hay theo vật liệu?

## 7. Tách view quản trị cho Order Tracking

**Demo Console hiện ở đâu:**
- Route `/order-tracking/demo` có `demoGuard`, mở được khi trước đó đã vào một trang với `?demo=1` (`order-tracking.routes.ts`, `order-tracking.guards.ts`).
- `customerGuard` cho xem trang khách không cần đăng nhập khi đang bật demo.
- Service: `services/demo-settings.ts` (role giả Operator/CSKH/Admin, lỗi giả lập), `demo-order-factory.ts`, `clock.ts` (tua giờ), `scheduled-jobs.ts` (Job chạy tay), `integrations.ts` (mock module ngoài).
- Trang `demo-console/*` (gồm `insights.ts`).
- **Trang khách không có nút/panel demo nào.** Chỉ có cờ `?demo=1` ở guard.

**Khu admin trong repo:** chưa có ở bất kỳ branch nào (không có `/admin`, không có sidebar, không có role). Đề xuất khung tối thiểu:
- `core/layout/admin-layout/`: sidebar + topbar, dùng token team.
- `core/auth/role-guard.ts`: `roleGuard(['Admin','Operator','CSKH'])`.
- Route `/admin` có các con: `order-tracking`, sau này `customer-support`, `checkout`, `loyalty`.
- Role: tạm lấy từ role demo, sau này đọc `profiles.role` (MIS-10).

**Phân loại chức năng trong Console:**

| Nhóm | Chức năng | Đích mới |
|---|---|---|
| Nghiệp vụ thật | Danh sách đơn + lịch sử trạng thái; duyệt/từ chối thiết kế, chốt mẻ 16:00, đóng gói, in lại QC (Operator); xử lý yêu cầu hủy, kết quả khiếu nại, đối soát giao thất bại (CSKH); duyệt/ghi nhận/thử lại hoàn tiền (Admin) | `/admin/order-tracking` (+ `/:code`) |
| Mô phỏng | Webhook 3PL, tua giờ, chạy Job, tạo đơn mẫu (thay Checkout), giả lập sự cố liên module, hộp thư giả, Insights, xóa dữ liệu | `/admin/order-tracking/simulator`, nhãn "Mô phỏng – chỉ dùng khi demo" |

**Giai đoạn B** (chờ duyệt):
- Di chuyển component/service đang có, không viết lại.
- `/order-tracking/demo` chuyển hướng sang `/admin/order-tracking/simulator`.
- Bỏ cờ `?demo=1` khỏi guard trang khách. Muốn demo không đăng nhập thì dùng tài khoản demo.
- Hai view vẫn dùng chung `OrderRepository` + `SyncChannel` (2 tab cập nhật ngay).

## 8. Phụ lục: route toàn hệ thống (nhánh tích hợp)

| Route | Function | Ghi chú |
|---|---|---|
| `/account/onboarding` | Tài khoản | ngoài ShellLayout |
| `/` | Trang chủ | |
| `/design-studio` → `/select-model`, `/templates`, `/editor` | Design Studio | editor full-screen |
| `/cart` | Giỏ hàng | khung trống |
| `/checkout` (`?step=`, `?dev=true`) | Thanh toán | |
| `/shop` | Mua sắm | khung trống |
| `/account/**` | Tài khoản | |
| `/customer-support` | CSKH | khung trống |
| `/order-tracking`, `/:orderCode`, `/chinh-sach`, `/demo` | Order Tracking | |
| `/auth/**` | Tài khoản | |
| `/test` | dev | nên bỏ khỏi menu |

**Model/service chính theo function:**
- **Design Studio:** `studio-state`, `studio-draft`, `studio-catalog`; models `canvas-element`, `studio-domain`, `studio-state`.
- **Checkout:** `CheckoutService`; `checkout.model.ts`.
- **Order Tracking:** `OrderTrackingService`, `OrderRepository`, `ScheduledJobs`, `integrations.ts`; `order-tracking.model.ts`, `order-handoff.model.ts`.
- **Tài khoản:** `account-state`, `profile.repository`, `SupabaseAuthService`.

---

## Cách build lại nhánh tích hợp

Tắt server `npm start` đang chạy (Ctrl+C ở terminal đó), rồi chạy:

```bash
npm ci
```

```bash
npx ng build
```

---

# Giai đoạn B: kết quả (12/11/2026)

Nhánh `integration/local`, chưa push.
- `ng build` pass: chỉ còn cảnh báo cũ và vượt budget.
- Test Order Tracking và Checkout pass.
- `footer.spec`, `button.spec`, `account.spec`, `landing.spec`, `hero.spec` đã lỗi từ develop (spec cũ hoặc thiếu provider), không thuộc phần tích hợp.

## B.1 Quyết định đã tự chốt

| Mã | Quyết định | Lý do |
|---|---|---|
| MIS-02 | COD và Hỏa tốc **chỉ mở khi giỏ toàn hàng có sẵn**. Có hàng custom thì khóa, giữ nguyên lý do khóa của Checkout | Khớp BRD v8 và lý do "in độc bản" của Checkout. Hai bên không mâu thuẫn, chỉ khác phạm vi |
| MIS-04 | `vietqr`/`momo`/`card` đều tính là **trả trước** → `QR_Transfer` khi sang đơn. Giữ nguyên UI Checkout | Order Tracking chỉ cần biết đơn trả trước hay COD |
| MIS-05 | 12 mã BRD v8 là trạng thái chi tiết ở frontend. Đề xuất cách map sang enum DB 5 giá trị (xem B.4) | Không phải sửa code người khác |
| MIS-06 | Thêm `ShippingMethod.transitDays`. Phụ phí Hỏa tốc = giá Hỏa tốc − giá Standard | Để Order Tracking tính được EDD |
| MIS-07 | Giữ timeline 4 bước của Checkout (UI của bạn ấy), thêm nút **"Theo dõi đơn hàng"** | Không đổi giao diện function khác |
| MIS-08 | Tab "Lịch sử mua hàng" đọc đơn thật qua port `CustomerOrderFeed` | Không import chéo feature |
| MIS-09 | Design Studio → `CartService` dùng chung. Toast dẫn thẳng tới `/checkout` vì trang Giỏ hàng còn trống | Giữ luồng chạy được |
| MIS-10 | Khu `/admin` + vai trò nhân viên **demo** (chọn ở `/admin/dang-nhap`) | Chưa có `profiles.role` |
| MIS-11 | Dùng ô xác nhận sẵn có của Checkout, **bỏ tick sẵn**, thêm link chính sách và phiên bản, lưu `PolicyConsent` | Tick sẵn là dark pattern; cách này không đổi UI |
| Giá | Giá hàng custom lấy từ Design Studio (250.000đ). 464.000đ của Checkout chỉ là dữ liệu mẫu khi giỏ trống | Design Studio là nơi định giá thiết kế |
| Giờ | Đơn tạo từ Checkout lấy giờ theo đồng hồ của Order Tracking | Giữ đúng 30 phút đổi ý và giờ cắt khi demo có tua giờ |
| Người nhận | Tên và SĐT trên đơn là người nhận nhập ở Checkout; id và email là của tài khoản | Đúng ngữ cảnh giao hàng |

## B.2 Đã làm

| Bước | Nội dung | Commit |
|---|---|---|
| Lớp dùng chung | `shared/models/cart.model.ts`, `order-handoff.model.ts`; `shared/services/cart.service.ts`, `order-intake.ts`, `customer-order-feed.ts`; `shared/policy/order-policy-ref.ts` | `adc2477`, `54cab32` |
| Studio → Giỏ | `onAddToCart()` thêm `CartItem` (CUSTOM, dòng máy, SKU, giá, ảnh preview 240px, cờ ảnh tải lên); header hiện số món | `c16e79b` |
| Giỏ → Thanh toán → Đơn | Checkout nạp giỏ, áp luật COD/Hỏa tốc, ô đồng ý bắt buộc, tạo đơn qua `OrderIntake`, xóa giỏ, thêm nút theo dõi đơn | `49eb38a`, `43407ec` |
| Khu admin | `/admin/dang-nhap`, `AdminLayout` (sidebar + vai trò), `roleGuard`; `/admin/order-tracking` (nghiệp vụ) và `/admin/order-tracking/simulator` (mô phỏng) | `79babb6` |
| Trang khách | Bỏ `?demo=1` khỏi guard; `/order-tracking/demo` chuyển sang simulator; "Khách demo" bật từ simulator | `79babb6` |
| Tài khoản | Tab đơn đọc đơn thật, có link sang chi tiết và trạng thái trống | `54cab32` |

## B.3 Kịch bản đã chạy trên web

| Kịch bản | Kết quả |
|---|---|
| **Đơn custom trả trước:** giỏ → Checkout (COD/Hỏa tốc khóa, ô đồng ý chưa tick) → thanh toán → đơn "Đang kiểm tra thiết kế" → Operator duyệt → chốt mẻ → đóng gói → webhook giao → khách thấy "Đã giao" | Đạt |
| **Đơn hàng có sẵn COD:** COD chọn được → đặt ngay, không qua đối soát → "Chờ xác nhận", có nút Hủy, không có đồng hồ đếm ngược | Đạt (sau khi sửa lỗi giờ) |
| **Phân quyền:** chưa đăng nhập nhân viên mà vào `/admin/**` thì chuyển sang `/admin/dang-nhap`; trang Đơn hàng chỉ hiện thao tác của vai trò; trang nghiệp vụ không có webhook | Đạt |
| **Route cũ:** `/order-tracking/demo?demo=1` → simulator (qua đăng nhập nhân viên) | Đạt |
| Tab "Lịch sử mua hàng" | **Chưa kiểm trên web**: `/account` cần đăng nhập Supabase thật |
| "Thêm vào giỏ" thật trong Design Studio | **Chưa kiểm trên web**: cần đăng nhập. Đã kiểm bằng giỏ giả lập có cùng cấu trúc |
| Hủy / yêu cầu hủy; giao thất bại → giao lại; khiếu nại → hoàn tiền | Chưa chạy lại trên web lần này. Logic Order Tracking không đổi, test pass, các thao tác vẫn nằm ở admin như trước |

## B.4 Còn chờ team quyết

1. **MIS-12:** đồng hồ 15:00 ở màn lỗi thanh toán, ngược nguyên tắc "không hối thúc".
2. **MIS-13:** Dev Dock và `?step=` của Checkout có chuyển sang `/admin` như Order Tracking không.
3. **MIS-14:** chốt một hệ thông báo; hợp nhất các token trùng nghĩa.
4. **MIS-19 / MIS-05 (migration):** đề xuất giữ enum 5 giá trị và thêm cột `status_detail` (12 mã):
   - `pending` ← Pending_Review, Pending_Confirmation, Action_Required
   - `confirmed` ← In_Production, Ready_for_Pickup
   - `shipping` ← In_Transit, Delivery_Failed
   - `delivered` ← Delivered, Completed, Return_Requested
   - `cancelled` ← Cancelled, Refunded

   Thêm bảng `cancel_requests`, `refund_requests`, `policy_consents` và các cột `shipping_tier`, `edd_earliest`/`edd_latest`, `confirmed_at`.
5. **Checkout có bắt buộc đăng nhập không?** Hiện chưa đăng nhập vẫn vào được; khi đó đơn gán cho khách demo (nếu đang bật chế độ khách demo).
6. **Ai làm Giỏ hàng, Mua sắm, CSKH, Ưu đãi** (xem quy trình giả định ở B.5).
7. **Bundle:** initial 815 kB, budget 500 kB. Nguyên nhân là `app.config` nạp sẵn `OrderTrackingService` để bind port. Có thể đổi sang nạp lười nếu team cần.

## B.5 Quy trình nghiệp vụ toàn hệ thống (phần còn trống là giả định)

Phần có dấu `*` chưa có code.

```
Khách: Đăng ký/Đăng nhập (Tài khoản) → Trang chủ
   ├─ Mua sắm*: xem hàng có sẵn theo dòng máy → "Thêm vào giỏ" (CartItem IN_STOCK)
   └─ Design Studio: chọn máy → mẫu → thiết kế → kiểm duyệt từ khóa → "Thêm vào giỏ" (CartItem CUSTOM)
        ↓
   Giỏ hàng*: xem / sửa số lượng / xóa, tạm tính → "Thanh toán"
        ↓
   Thanh toán: địa chỉ, gói giao (Hỏa tốc chỉ cho hàng có sẵn), voucher/điểm*, phương thức
               (COD chỉ cho hàng có sẵn), đồng ý chính sách
               → trả trước thì đối soát, COD thì đặt ngay
        ↓ OrderIntake.placeOrder (OrderHandoff)
   Quản lý đơn hàng: đơn custom → Operator duyệt thiết kế → chốt mẻ 16:00 → in → đóng gói
               → 3PL (webhook) → đã giao → 72 giờ báo sự cố → hoàn tất
               · đơn COD: khách tự hủy trong thời gian đổi ý
               · đơn trả trước: gửi yêu cầu hủy → CSKH
               · giao thất bại → lưu kho 14 ngày → giao lại 1 lần, hoặc hủy + hoàn tiền
        ↓ sự kiện
   CSKH & Khiếu nại*: hàng chờ yêu cầu hủy (SLA 1 ngày làm việc); ticket từ "Báo sự cố"
               (ảnh, mô tả) → kết quả trả về đơn: A in lại / B voucher / C hoàn 100% / D từ chối
   Ưu đãi*: hoàn tất → cộng điểm; hủy/hoàn → thu hồi điểm; voucher bồi thường giao trễ
        ↓
   Admin: duyệt và ghi nhận chuyển khoản hoàn tiền (không tự động)
        ↓
   Tài khoản: lịch sử đơn (CustomerOrderFeed), điểm*, voucher*
```

| Function | Giả định nghiệp vụ | Điểm nối đã chuẩn bị |
|---|---|---|
| Mua sắm | Danh mục hàng có sẵn lấy từ bảng `products`/`phone_models` (đã có migration); tồn kho trừ khi đặt, trả lại khi hủy | `CartService.add({ productType: 'IN_STOCK', ... })`; Order Tracking đã phát sự kiện trả tồn kho khi hủy (mock `ShoppingService`) |
| Giỏ hàng | Một giỏ cho cả site; hàng custom mỗi thiết kế số lượng 1; chưa đăng nhập vẫn giữ giỏ (localStorage), đến lúc thanh toán mới yêu cầu đăng nhập | `CartService` (`items`, `count`, `hasCustom`, `subtotal`); Checkout đã tự đọc giỏ |
| CSKH & Khiếu nại | Hàng chờ yêu cầu hủy và ticket; quyết định trả về đơn | Hàm có sẵn trong `OrderTrackingService`: `decideCancelRequest`, `applyComplaintResult`, `resolveDispute`; trang admin gắn vào `ADMIN_NAV` |
| Ưu đãi / Loyalty | Điểm tính theo giá trị đơn hoàn tất; thu hồi khi hủy/hoàn; voucher giao trễ 10%, tối đa 30k | Order Tracking đã phát sự kiện qua `LoyaltyService` (mock trong `integrations.ts`); Checkout đã có chỗ áp voucher |

## Chạy bản tích hợp

```bash
npm ci
```

```bash
npm start
```

| Muốn xem | Mở |
|---|---|
| Khách | `http://localhost:4200/` → Thiết kế → Thêm vào giỏ (cần đăng nhập) → `/checkout` → `/order-tracking` |
| Khách không cần đăng nhập | Vào `/admin/order-tracking/simulator`, tick "Khách demo" |
| Nhân viên | `http://localhost:4200/admin` → chọn vai trò Operator / CSKH / Admin |
| Công cụ mô phỏng | `/admin/order-tracking/simulator`: tua giờ, webhook, tạo đơn mẫu, xóa dữ liệu |
