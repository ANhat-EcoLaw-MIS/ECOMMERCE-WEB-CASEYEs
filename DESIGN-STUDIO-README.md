# Design Studio Module — Tình trạng hiện tại (`feature/design-studio`)

Tài liệu tóm tắt nhanh kiến trúc, luồng hoạt động, các tính năng đã hoàn thiện và những điểm còn đang mock/chờ tích hợp của module **Design Studio** (Phòng thiết kế ốp lưng 2D + 3D) để các thành viên trong nhóm dễ nắm bắt và phối hợp khi merge vào `develop`.

> **Cập nhật:** 12/11/2026 · **Branch:** `feature/design-studio` · **Trạng thái build:** `npx ng build` thành công (xuất `dist/DoAnWEB`, kèm warning vượt budget nhẹ).

---

## 1. Luồng người dùng & Routes

Module được lazy-load tại `/design-studio` trong `src/app/app.routes.ts` và định nghĩa các route con trong `src/app/features/design-studio/design-studio.routes.ts`:

```text
/design-studio
  ├── '' (full) ──► modelOnboardingGuard
  │                    ├── Có `localStorage['caseyes_active_model']` ──► /design-studio/templates
  │                    └── Chưa có ────────────────────────────────────► /design-studio/select-model
  ├── /select-model  ──► ModelPicker (Bước 1: Chọn hãng & dòng máy)
  ├── /templates     ──► TemplateBrowser (Bước 2: My Designs, AI gợi ý & Kho mẫu)
  └── /editor        ──► StudioWorkspace (Bước 3: Canvas 2D + Live 3D WebGL Preview, full-screen)
```

> **Lưu ý layout:** Ở route `/design-studio/editor`, `App` (`src/app/app.ts` / `app.html`) tự động ẩn `<app-header>` và `<app-footer>` toàn site để hiển thị không gian làm việc full-screen kiểu Canva/Figma.

---

## 2. Cấu trúc code trong `src/app/features/design-studio/`

```text
src/app/features/design-studio/
├── design-studio.ts / .html / .scss        # Shell container (Header Undo/Redo, đổi máy, nút Thoát, modal xác nhận đổi máy)
├── design-studio.routes.ts                 # Routes + modelOnboardingGuard
├── design-studio.spec.ts                   # Smoke test mặc định
├── components/
│   ├── model-picker/                       # Chọn hãng (Apple, Samsung, Xiaomi) & dòng máy + thông số phôi in
│   ├── model-selector/                     # Dropdown chọn nhanh model/SKU
│   ├── template-browser/                   # My Designs + Kho mẫu + Modal Chi tiết & 3D (AI gợi ý tách sang module riêng)
│   └── studio-workspace/                   # Trình chỉnh sửa Canvas 2D + Preview 3D thời gian thực
├── constants/
│   └── template-artworks.ts                # Vector SVG artworks + `buildTemplateLayers()` đồng bộ 1:1 vào Canvas
├── models/
│   ├── canvas-element.model.ts             # `TextElement`, `StickerElement`, `ImageElement`, `BackgroundElement`, `CanvasLayer`
│   ├── studio-domain.model.ts              # `Brand`, `PhoneModel`, `SafeZoneMask`, `CameraCutout`, `BaseSKU`, `CASE_MATERIALS`
│   ├── studio-state.model.ts               # `DesignStatus`, `DesignDraft`, `StudioHistoryState`, `ActiveToolSelection`
│   └── policy-consent.model.ts             # `ContentPolicyConsent`, `BannedKeyword`
└── services/
    ├── studio-catalog.ts                   # Dữ liệu 3 hãng, 5 dòng máy, camera cutout & SKUs
    ├── studio-state.ts                     # State reactive (Angular Signals): layers, undo/redo, savedDesigns, moderation, giá 250.000đ
    └── studio-draft.ts                     # Auto-save bản nháp 60s vào `localStorage['caseye_studio_draft']`
```

**Assets bổ sung trên nhánh:**
- `public/models/*.glb`: 6 model 3D (`iphone-15-pro-max.glb`, `iphone-16-pro.glb`, `iphone-14.glb`, `galaxy-s24.glb`, `xiaomi-14-ultra.glb`, `phone-generic.glb`).
- `public/assets/stickers/*.svg`: 24 sticker SVG vector phân nhóm `y2k`, `cute`, `creative`.
- `public/assets/badges/*.svg`: 3 huy hiệu SVG (`360-rotate.svg`, `polycarbonate-shield.svg`, `uniform-price.svg`).
- `scripts/generate-assets.js`: Script Node dùng để sinh các asset SVG trên.

---

## 3. Những tính năng đã làm xong

### A. Chọn dòng máy (`ModelPicker` & `StudioCatalogService`)
- Hỗ trợ 3 hãng / 5 máy: **iPhone 15 Pro Max**, **iPhone 16 Pro**, **iPhone 15 Pro**, **Galaxy S24**, **Xiaomi 14 Ultra**.
- Lưu lựa chọn vào `localStorage` (`caseyes_active_model`), hiển thị kích thước vùng in (`printWidthMm × printHeightMm`), DPI tối thiểu (`150 DPI`), số ống kính và trạng thái hỗ trợ 3D (`has3dModel`).
- Có modal cảnh báo/xác nhận khi đổi dòng máy lúc Canvas đang có layer (`DesignStudio`).

### B. Kho mẫu & My Designs (`TemplateBrowser`)
- **My Designs:** Hiển thị tối đa 4 card trên trang chính; khi `> 4` bản vẽ thì hiện nút **Xem tất cả** mở popup có ô tìm kiếm. Menu `⋮` hỗ trợ: *Tiếp tục chỉnh sửa*, *Nhân bản*, *Đổi tên*, *Xóa* (có modal xác nhận).
- **Kho mẫu (`TEMPLATE_CATALOG`):** 10 mẫu (vị trí `#1` là **Ốp Lưng Trắng Tiêu Chuẩn** để vẽ từ đầu + 9 mẫu artwork: *Dreamy Kitten, Sakura Bloom, Mountain Escape, Minimal Cat, Anime Girl, Abstract Waves, Dino Friend, Starry Night, That Girl Era*). Đã bỏ hiển thị giá trên card/modal theo thiết kế tinh gọn, lọc theo 8 danh mục và hashtag. (Phần AI gợi ý mẫu đã được bóc tách để nhóm phát triển thành module tìm kiếm thông minh riêng).
- **Modal Chi tiết & Xem trước 3D thật:** Dùng `<model-viewer>` nạp `.glb` + `syncTemplate3dTexture()` vẽ nền, artwork, lỗ cắt camera và viền bumper lên mô hình 3D; chuyển đổi qua lại giữa **Mô hình 3D xoay** và **Mặt lưng 2D**; có nút snap về mặt lưng & bật/tắt tự xoay.
- **Đánh giá mẫu:** Đã xóa toàn bộ comment NPC giả lập, hiển thị empty state khi chưa có đánh giá và cho phép người dùng chọn 1–5 sao + gửi nhận xét ngay trong modal.
- **Đồng bộ 1:1 vào Studio Canvas:** Chọn bất kỳ mẫu nào đều nạp chính xác màu nền/gradient và toàn bộ `CanvasLayer[]` từ `buildTemplateLayers()` (`constants/template-artworks.ts`) vào editor.

### C. Trình chỉnh sửa Canvas 2D + 3D Live (`StudioWorkspace`)
- **Thanh công cụ trái (5 tab):**
  1. **Tải ảnh (`img`):** Upload PNG/JPG/WEBP (hỗ trợ kéo-thả); ảnh `> 10MB` được tự nén/resize client-side (giữ kênh trong suốt alpha với PNG/WEBP); cảnh báo nếu `< 150 DPI`; modal cam kết bản quyền điện tử `v1.0` (`caseyes_dont_remind_consent` / `caseyes_dont_remind_resize`).
  2. **Chữ (`txt`):** Thêm chữ, preset style chữ, đổi font/màu/cỡ/căn lề/đậm/nghiêng/gạch chân, text effects (`shadow`, `neon`, `lift`), kiểm duyệt từ khóa cấm theo `BANNED_KEYWORDS`.
  3. **Sticker (`stk`):** 24 sticker SVG vector, lọc theo nhóm (`all`, `y2k`, `cute`, `creative`) và tìm kiếm.
  4. **Nền (`bg`):** Bảng màu solid, color picker tự chọn, bộ tạo dual gradient (`linear`/`radial`, chỉnh góc, đảo màu) và curated gradients.
  5. **Layers (`tpl`):** Danh sách layer theo stack trên→dưới, kéo-thả đổi thứ tự, khóa/mở khóa, lên/xuống bậc, xóa.
- **Tương tác Canvas 2D:** Kéo thả di chuyển kèm đường gióng căn tâm (**Smart Snap Guides**), kéo ra ngoài vùng stage để xóa, 4 tay cầm phóng to/thu nhỏ, xoay, 4 tay cầm crop ảnh/sticker (hoặc đổi bề rộng wrap text), lật ngang/dọc, **nhấn đúp sửa chữ trực tiếp trên canvas** với caret xanh (`#2563eb`) và tự xóa layer nếu xóa hết chữ.
- **Phím tắt Canva (`?`):** `Ctrl+D`, `Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z`, `Delete`/`Backspace`, phím mũi tên (`+ Shift` để nudge nhanh), `T`, `S`, `Ctrl+[` / `Ctrl+]`, `Esc`, `Ctrl + Cuộn chuột` zoom (50–160%).
- **Live 3D Preview & Specs (Cột phải):** Render Offscreen Canvas (`600×1264`) chiếu lên Three.js `CaseOverlayMesh` + dựng viền bumper `CaseExtrusionBumper` đổi màu theo 7 preset (`caseStrokeColor`); hiển thị thông số phôi *Polycarbonate Ultra-Defense* và đồng giá `250.000đ` (`UNIFIED_STUDIO_PRICE`).
- **Lưu & Guest flow:** Auto-save nháp mỗi `60s`; nếu khách chưa đăng nhập bấm Lưu / Thêm vào giỏ sẽ lưu ngầm bản nháp vào `localStorage` (`caseyes_guest_draft`), mở `AuthModal`, và tự đồng bộ vào *My Designs* sau khi đăng nhập thành công (`checkAndSyncGuestDraft()`).

---

## 4. Trạng thái tích hợp & Việc còn lại (Handoff cho team)

### Đã tích hợp thật
- **Authentication:** Dùng `SupabaseAuthService` và `AuthModal` (`src/app/core/supabase/supabase-auth.service.ts`, `src/app/core/auth/auth-modal.ts`).
- **3D Rendering:** `@google/model-viewer` + Three.js texture injection trực tiếp trên trình duyệt.

### Đang chạy Local / Mock phía Frontend (chờ ghép Backend / Module khác)
1. **Cart integration (`onAddToCart()` trong `studio-workspace.ts`):** Hiện mới kiểm tra điều kiện (`REJECTED`, `hasLayers()`, đã đăng nhập) và hiện toast *"Đã thêm thiết kế vào giỏ hàng thành công!"* kèm link tới `/cart`. Chưa đẩy dữ liệu sang `CartService` do `src/app/features/cart/cart.ts` hiện vẫn là component khung và `App.cartCount` trong `src/app/app.ts` đang để `TODO(cart team)`.
2. **Supabase Database & Storage:**
   - `StudioCatalogService` (hãng, dòng máy, SKU) và `TEMPLATE_CATALOG` hiện là dữ liệu tĩnh ở frontend, chưa query bảng `phone_models` trong Supabase (`database.types.ts`).
   - `savedDesigns`, bản nháp (`StudioDraft`) và đánh giá mẫu (`reviewsMap`) đang lưu ở `localStorage` / signal state, chưa đồng bộ CRUD lên bảng `designs` của Supabase.
   - Ảnh upload của người dùng hiện lưu dưới dạng Data URL base64 trong layer, chưa upload lên Supabase Storage.
3. **AI gợi ý mẫu & Tìm kiếm thông minh:** Nhóm đã thống nhất tách phần này ra khỏi template browser để phát triển thành một module tìm kiếm độc lập kết hợp với thanh search trên navbar.

### Một số điểm nhỏ cần lưu ý khi review / dọn PR
- **3D trên Samsung / Xiaomi:** Thư mục `public/models/` đã có `galaxy-s24.glb` và `xiaomi-14-ultra.glb`, nhưng `StudioCatalogService` hiện vẫn đặt `has3dModel: false` và chưa gán `model3dUrl` cho 2 máy này (chỉ 3 mẫu iPhone đang bật `has3dModel: true`).
- **Dependency chưa dùng:** `package.json` có cài `"html2canvas": "^1.4.1"` nhưng code hiện tại dựng ảnh bằng Canvas 2D thuần, chưa import `html2canvas`.
- **Budget cảnh báo khi `ng build`:** Initial bundle `666.86 kB` (budget `500.00 kB`) và `studio-workspace.scss` `4.39 kB` (budget `4.00 kB`); unit test mới có spec khởi tạo cơ bản trong `design-studio.spec.ts`.

---

## 5. File ngoài `design-studio/` có chỉnh sửa trên nhánh

Để tránh conflict khi merge vào `develop` (xem thêm `docs/GIT_WORKFLOW.md`), cần chú ý các file dùng chung đã chạm tới:
- `package.json`, `package-lock.json` (thêm `@google/model-viewer`, `html2canvas`)
- `src/index.html` (thêm script `@google/model-viewer` v4.0.0 CDN)
- `src/app/app.ts`, `src/app/app.html` (thêm signal `isCanvasEditor` ẩn header/footer ở `/design-studio/editor`)
- `src/app/app.routes.ts` (format lại route lazy-load `design-studio`)
- `src/app/core/layout/header/header.ts`, `src/app/features/landing/section/hero/hero.ts`, `hero.html` (gỡ nút phụ ở hero, gọn lại import)
- `.gitignore` (thêm `.agents/`), kèm file tài liệu/prompt nội bộ (`DESIGN_STUDIO_UI_REDESIGN_PROMPT_PACK.md`, `docs/*`)
