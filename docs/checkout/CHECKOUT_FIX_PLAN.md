# Checkout fix plan — QA handoff 18/11/2026 (BUG-01 … BUG-06)

Source: `CaseEYES_Checkout_Dev_Handoff.md`. The code was checked on `integration/connect-functions` against `src/app/core/supabase/database.types.ts` and the Supabase migrations.

## 1. Root cause: checkout is still a mock island

The QA symptoms share one cause. **`CheckoutService` was built as a standalone demo, and only part of it was later wired to the cart and to `place_order`.** Most of its state is still hard-coded seed data, and the data contract between Cart, Checkout and the database is loose.

| Layer | What the DB / other modules provide | What checkout does today | Effect |
|---|---|---|---|
| Recipient | `addresses` (recipient, phone, line, ward, district, city, is_default, user_id), read by `ProfileRepository` | `address` signal is seeded with "Nguyễn Minh Anh / 0912345678 / Q1 HCM" (`checkout.service.ts:51`) | **BUG-01** |
| Address shape | `orders` needs separate `address_line`, `ward`, `district`, `city` | The handoff sends one string, `shippingAddress: streetAddress` (`checkout.ts:134`), which `placeRemoteOrder` re-splits on commas (`order-tracking.service.ts:1162`) | Wrong ward/city stored; no reliable city for the fee |
| Shipping fee | `orders.shipping_fee / standard_fee / express_surcharge`. **No rate table exists.** `place_order` stores whatever `p_shipping.fee` the client sends (`order_rpcs.sql:137`) | Fixed 25.000 / 45.000 in `shippingMethods` (`checkout.service.ts:72`) | **BUG-03**, and the client can tamper with the fee |
| Method count | — | `"1 khả dụng"` is literal text (`checkout-form.html:68`) | **BUG-02** |
| Images | Cart drawer and cart page use `productImage(id)` from `shop/catalog.ts` (artwork, or the Bg_Case fallback) | Checkout builds `/products/<id>.webp` (`checkout.service.ts:361`). Those files were removed in the "Clean files" commit; `public/products/` now holds only `Accessories/` and `Bg_Case/` | **BUG-06**: broken image icons |
| Item type | — | `ShopCart.addAccessory()` adds accessories with **`custom: true`** (`shop-cart.ts:60`) | Accessories are treated as custom designs: shown as #CustomDesign, COD and express locked, and `placeRemoteOrder` tries to **insert a design** for them |
| Success screen | The real order code is in `placedOrderCode` (returned by `place_order`) | The big pill shows `order.orderCode`, which is always the mock `'CE-89421'` (`createNewOrder`). The message is hard-coded to "bespoke" | **BUG-04** plus a wrong order code |
| Navigation | `/cart` route exists | Both success-screen buttons emit `newOrder`, which runs `onNewOrder()` → `createNewOrder()` + `setStep('form')` | **BUG-05** |
| Other seeded values (not in the QA list, same cause) | — | Voucher `CASEFIRST` pre-applied (−50.000); gift box pre-enabled (+25.000) with a personal message "From Minh Anh"; pre-filled shipper note; fixed `transactionId`; demo `items` when the cart is empty | Totals and order content are wrong for every real customer |

## 2. Priority and execution order

Priority follows business impact. Order follows dependencies: quick and safe fixes first, and BUG-03 after BUG-01 because the fee needs a structured city.

| Step | Bug | Priority | Size | Depends on | Blocker |
|---|---|---|---|---|---|
| 1 | BUG-04 success message + real order code | P2 | XS | — | — |
| 2 | BUG-05 "Tiếp tục mua sắm" → `/cart` | P1 | S | — | — |
| 3 | BUG-02 dynamic "N khả dụng" | P2 | XS | — | — |
| 4 | BUG-06 product images + accessory `custom` flag | P1 | M | — | — |
| 5 | BUG-01 recipient from account (`addresses`) + structured address in handoff | **P0** | M–L | — | Product decision 3.1 |
| 6 | BUG-03 shipping fee by zone (client + server-side) | **P0** | L | Step 5 | **BA rate table 3.2** |
| 7 | Remove the other seeded values (voucher, gift, note, txn id, demo items) | P1 | S | Steps 5–6 | Product decision 3.3 |

Run the steps one at a time in a fresh Claude Code session per step, on the branch `integration/connect-functions`. After each step run `npm test -- --watch=false` and `npm run build`, then commit.

## 3. Decisions needed before steps 5–7

1. **Address change at checkout (BUG-01 req. 3).** Recommended: changes apply to the current order only by default. A checkbox "Lưu vào sổ địa chỉ" writes to `addresses`, and "Đặt làm mặc định" sets `is_default`.
2. **Shipping rate table (BUG-03).** QA says not to invent prices. BA must provide: the ship-from city (assumed TP. Hồ Chí Minh); the zones (e.g. same city / same region / other regions); the Standard fee per zone; the Express surcharge and which zones Express covers; and any free-shipping threshold. Until then, step 6 ships with a clearly marked placeholder config and must not be released.
3. **Seeded extras (step 7).** Confirm: no voucher applied by default, gift box off by default with an empty message, empty shipper note.

## 4. Prompts for Claude Code (one per step)

### Step 1 — BUG-04: generic confirmation message and real order code

```text
Fix BUG-04 in the checkout success screen (Angular 22, signals).

Files: src/app/features/checkout/components/success/checkout-success.html (+ .ts if needed),
src/app/features/checkout/services/checkout.service.ts.

1. Line ~14 hard-codes "Đơn hàng bespoke đã được xác nhận tự động". Replace it with exactly
   "Đơn hàng đã được xác nhận tự động" for every order type. Grep the whole checkout feature
   (html, ts, spec) for "bespoke" and remove any other user-facing occurrence.
2. Related sync bug: the order-code pill (line ~44) and the copy/share buttons use
   order.orderCode, which is always the mock 'CE-89421' from createNewOrder(). Show
   checkoutService.placedOrderCode() when it is set, else the existing pending state. Copy and
   share must use the same value. Do not show 'CE-89421' to a real customer.
3. Add or extend a spec (vitest, see checkout.spec.ts) asserting the new text for a stock-only
   order and for a custom order, and that the pill shows placedOrderCode.
Acceptance: TC-05, TC-06 in the QA handoff. Run npm test -- --watch=false and npm run build.
```

### Step 2 — BUG-05: "Tiếp tục mua sắm" goes to the cart

```text
Fix BUG-05 on the checkout success screen.

Context: checkout-success.html has two buttons that both emit `newOrder`: the top back button
(.btn-back, line ~3) and the CTA "Tiếp tục mua sắm" (line ~236). checkout.html binds
(newOrder)="onNewOrder()". In checkout.ts, onNewOrder() calls checkoutService.createNewOrder()
and setStep('form'), which re-opens the form and creates a new mock order.

Do:
1. In CheckoutSuccess add a separate output `continueShopping`. Bind the "Tiếp tục mua sắm"
   CTA to it. Decide the back button's purpose: if it is meant to be "Đặt thêm đơn hàng khác",
   keep it on `newOrder`; otherwise also bind it to `continueShopping`. Label it to match.
2. In Checkout add onContinueShopping():
   - do NOT call createNewOrder() or placeOrder;
   - clear the finished checkout session: activeOrder, placedOrderCode, placedForOrderId, and
     the sessionStorage key 'caseeye_active_checkout_order' (add a resetSession() method to
     CheckoutService for this);
   - navigate with Router to ['/cart'], with no step/orderCode query params.
3. Make sure placeOrderOnce() cannot fire again for the same order when the user comes back
   (the guard on placedForOrderId / placedOrderCode must survive; add a test).
4. The order must still appear in order tracking (/order-tracking): do not touch
   OrderIntake / place_order.
5. Spec: clicking the CTA navigates to /cart and createNewOrder is not called.
Acceptance: TC-07. Run tests and build.
```

### Step 3 — BUG-02: dynamic number of available shipping methods

```text
Fix BUG-02 in src/app/features/checkout/components/form/checkout-form.html line ~68, where
"1 khả dụng" is literal.

1. In CheckoutService add
   readonly availableShippingCount = computed(() => this.shippingMethods().filter(m => m.available).length);
2. Template: show "{{count}} khả dụng" when count > 0, and "Không có phương thức khả dụng"
   (badge variant warning) when count = 0. When count is 0, the place-order button must be
   disabled, with a short reason.
3. The count must follow applyCartRules(): express becomes available only for stock-only carts
   (after step 4, accessories count as stock).
4. Spec: stock-only cart → "2 khả dụng"; cart with a custom design → "1 khả dụng"; all methods
   unavailable → empty state.
Acceptance: TC-03 and the BUG-02 criteria. Run tests and build.
```

### Step 4 — BUG-06: correct product images across cart → checkout → success

```text
Fix BUG-06 (broken product images in checkout and on the success screen). Root cause found:

- Cart drawer and cart page render images with productImage(id) from
  src/app/features/shop/catalog.ts (artwork, or the Bg_Case fallback via fallbackArt).
- CheckoutService.loadFromCart() (checkout.service.ts ~361) instead uses
  c.snapshot ?? (c.custom ? '/logo.png' : `/products/${c.id.split(':')[0]}.webp`).
  The /products/*.webp files were deleted; public/products now only contains Accessories/ and
  Bg_Case/. So every shop case shows a broken image.
- ShopCart.addAccessory() (src/app/features/shop/services/shop-cart.ts ~60) adds accessories with
  custom: true. That is wrong: it marks accessories as custom designs (COD/express locked) and
  makes OrderTrackingService.placeRemoteOrder insert a design row for them.

Do:
1. Add `readonly image?: string` to CartItem in src/app/core/cart-state/cart-state.ts. It is the
   display image for every item; `snapshot` stays for the Design Studio preview. Keep restore()
   backward-compatible with carts already in localStorage.
2. Fill it at add time:
   - ShopCart.addVariant: image = productImage(design.id);
   - ShopCart.addAccessory: image = item.image, and custom: false;
   - studio-workspace addCurrentDesignToCart: image = the preview (lastPreviewUrl).
   Checkout must NOT import the shop feature; it only reads CartItem.image.
3. CheckoutService.loadFromCart: imageUrl = c.image ?? c.snapshot ?? FALLBACK, where FALLBACK is
   one real file that exists under public/ (e.g. a Bg_Case image or /logo.png; verify it exists).
   Remove the /products/<id>.webp path. Add productType 'IN_STOCK' for accessories.
4. Add a tiny shared fallback for any <img> in checkout (form line ~475, success line ~175, and
   the cart page if it lacks one): on (error) swap to the fallback once (no loop) and keep a
   meaningful alt. A small directive in src/app/shared/ui is fine.
5. The success screen must keep showing the images after the cart is cleared: it already reads
   activeOrder.items (persisted in sessionStorage). Check that data-URL previews still fit in
   sessionStorage; if they are too large, store a downscaled thumbnail.
6. Check placeRemoteOrder still saves design.previewUrl to designs.preview_url, and that
   order_items.image_url ends up correct for both product and design lines.
7. Specs: loadFromCart maps image for a shop case, an accessory (custom=false) and a design; the
   img error handler switches to the fallback.
Acceptance: TC-08, TC-09. Run tests and build, then open /cart → /checkout → success in the
browser (npm start) and confirm no broken image.
```

### Step 5 — BUG-01: recipient comes from the signed-in account

```text
Fix BUG-01: checkout shows a hard-coded recipient (CheckoutService.address seeded with
"Nguyễn Minh Anh / 0912345678 / Quận 1 HCM", checkout.service.ts ~51).

Data source (see src/app/core/supabase/database.types.ts):
- addresses: id, user_id, recipient, phone, line, ward, district (nullable), city, is_default.
- profiles has display_name but NO phone or address.
- ProfileRepository (src/app/features/account/services/profile.repository.ts) already loads
  addresses and has create/update/remove/setDefaultAddress.
Architecture rule: checkout must not import features/account. Follow the existing port pattern
(OrderIntake in src/app/shared/services/order-intake.ts, bound in app.config.ts):
create src/app/shared/services/customer-address-source.ts (abstract class) with
  list(): Promise<Result<CheckoutAddressDto[]>>, save(dto, opts: { makeDefault: boolean })
and implement it in features/account (wrapping ProfileRepository and the auth user id), then
bind it in app.config.ts.

Do:
1. CheckoutService: replace the seeded address with signals
   addresses, address (selected; null when none), addressLoading, addressError.
   Add loadAddresses(), called from Checkout.ngOnInit. Pick is_default first, otherwise the
   newest. Map recipient→fullName, line→detailAddress, ward, district, city, and build
   streetAddress for display only.
2. Empty / loading states in checkout-form.html: skeleton while loading; when the account has
   no address, show a call-to-action "Thêm địa chỉ giao hàng" that opens AddressModal. Never
   render placeholder data as if it were real. Disable "Đặt hàng" while there is no address.
3. AddressModal: list the saved addresses to choose from, plus "Thêm địa chỉ mới". On save:
   apply to the current order; if the user ticks "Lưu vào sổ địa chỉ", call
   CustomerAddressSource.save (and "Đặt làm mặc định" → makeDefault). Default is current-order
   only (product decision 3.1 in docs/checkout/CHECKOUT_FIX_PLAN.md).
4. Structured address end-to-end (fixes a DB sync bug): extend the handoff (OrderHandoff /
   OrderIntakeRequest in src/app/shared/models/order-handoff.model.ts) with
   address: { line, ward, district, city }. Send it from Checkout.toHandoff(). In
   OrderTrackingService.placeRemoteOrder (order-tracking.service.ts ~1162) use those fields
   instead of splitting shippingAddress on commas. Keep shippingAddress as the display string.
   Update the mock/local path in OrderTrackingService.placeOrder the same way.
5. A different signed-in user must never see a previous user's address: clear the checkout
   session (sessionStorage 'caseeye_active_checkout_order') when the auth user id changes.
6. Also guard /checkout with authGuard in app.routes.ts (cart already has it), because
   place_order needs a signed-in user.
7. Specs: account A vs account B get their own default address; no address → empty state; the
   handoff contains structured fields and placeRemoteOrder passes them to place_order unchanged.
Acceptance: TC-01, TC-02 and the BUG-01 criteria. Run tests and build.
```

### Step 6 — BUG-03: shipping fee by ship-from / ship-to zone (client + server)

```text
Fix BUG-03: the shipping fee is the fixed price of the selected method (CheckoutService.shippingFee
= selectedShippingMethod().price, 25.000 / 45.000), whatever the address. Also, place_order
(supabase/migrations/20261114100400_order_rpcs.sql ~137) trusts p_shipping.fee from the client,
so the stored fee can be tampered with.

Requires step 5 (structured city). DO NOT invent prices: use the rate table in
docs/checkout/CHECKOUT_FIX_PLAN.md §3.2. If it is still empty, implement with values from a
single config file marked `// TODO(BA): placeholder rates, do not release`, and say so in your
final message.

Do:
1. Rates live in the DB so client and server agree: add a migration
   supabase/migrations/<timestamp>_shipping_rates.sql creating
     shipping_zones(code, name, cities text[])  and
     shipping_rates(zone_code, tier 'standard'|'express', fee integer, transit_min, transit_max, active)
   plus a setting for the ship-from city (e.g. a one-row table or a constant in a SQL function).
   RLS: read for everyone, write for admin only (follow the style of 20261105060355_rls_policies.sql).
   Add a matching .down.sql in supabase/rollbacks/ and a case in supabase/tests/migrations.test.mjs.
   Seed it only with BA-approved values.
2. Add SQL function quote_shipping(p_city text, p_has_custom boolean) returning, per tier,
   available, fee, transit_min, transit_max. Express is unavailable for custom carts (the same
   rule as place_order's express_requires_stock_only).
3. Change place_order to compute fee / standard_fee / express_surcharge / transit days from
   quote_shipping(city, has_custom) instead of p_shipping.fee (ignore or verify the client
   value). Recompute total server-side.
4. Regenerate database.types.ts (npx supabase gen types typescript --linked >
   src/app/core/supabase/database.types.ts), or hand-edit the new table and function types
   consistently.
5. Frontend: CheckoutService calls quote_shipping (via a shared port, like steps 4–5) whenever the
   selected address city or the cart changes. shippingMethods becomes computed from the quote
   (price, available, estimatedDelivery from transit days), and shippingFee follows it. Show a
   loading state on the shipping card while quoting; "Đặt hàng" waits for the quote.
6. Keep the fee consistent on all three places: shipping method card, order summary, total, and
   on the success screen (activeOrder.shippingFee) = orders.shipping_fee in the DB.
7. Specs: HCM vs Hà Nội give different fees per the configured table; changing the address
   recomputes fee and total; express is unavailable for custom carts; the fee sent and the fee
   stored match.
Acceptance: TC-04 and the BUG-03 criteria. Run tests and build. Do not apply the migration to the
linked remote project; leave that to the team (see supabase/APPLY_MIGRATIONS.md).
```

### Step 7 — remove the remaining seeded demo values (same root cause)

```text
Finish de-mocking CheckoutService (src/app/features/checkout/services/checkout.service.ts) so
totals reflect the real customer and cart. Product decisions: docs/checkout/CHECKOUT_FIX_PLAN.md §3.3.

1. voucher: start as null (no CASEFIRST pre-applied). Keep applyVoucher(); if vouchers exist in
   the DB (order_vouchers in database.types.ts), validate against it, otherwise keep the two demo
   codes behind applyVoucher only.
2. giftOption: enabled false and an empty message by default (no "From Minh Anh").
3. shipperNote: empty string by default.
4. items: start empty. If the cart is empty, Checkout redirects to /cart with a short toast,
   instead of rendering the demo "Cloud Bear Edition" item.
5. createNewOrder(): no fixed 'CE-89421' / 'TXN-CEY98241' / 'mock-order-001'. Generate a
   client-side id and txn ref (crypto.randomUUID), and treat placedOrderCode from place_order as
   the order code. Leave the mock production stages only if the success screen still needs them;
   otherwise remove them.
6. Make sure nothing in checkout-form / success / failed / dev-dock breaks when these start empty.
   Keep DevDock usable for demos.
7. Specs: a fresh checkout's total = subtotal + quoted shipping (no gift, no discount).
Run tests and build.
```

## 5. Retest checklist (for QA)

| TC | Covered by step |
|---|---|
| TC-01, TC-02 | 5 |
| TC-03 | 3 (+4 for accessories) |
| TC-04 | 6 |
| TC-05, TC-06 | 1 |
| TC-07 | 2 |
| TC-08, TC-09 | 4 |
| Totals without seeded voucher / gift | 7 |
