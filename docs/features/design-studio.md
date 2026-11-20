# Design Studio Module — Tình trạng hiện tại (`feature/design-studio`)

Tài liệu tóm tắt nhanh kiến trúc, luồng hoạt động, các tính năng đã hoàn thiện và những điểm tích hợp của module **Design Studio** (Phòng thiết kế ốp lưng 2D + 3D) để các thành viên trong nhóm dễ nắm bắt và phối hợp khi merge vào `develop`.

> **Cập nhật:** 14/11/2026 · **Branch:** `feature/design-studio` · **Trạng thái build:** `npx ng build` thành công 100% (0 TypeScript errors, xuất `dist/DoAnWEB`).

---

## 1. Luồng người dùng & Routes

Module được lazy-load tại `/design-studio` trong `src/app/app.routes.ts` và định nghĩa các route con trong `src/app/features/design-studio/design-studio.routes.ts`:

```text
/design-studio
  ├── '' (full) ──► modelOnboardingGuard
  │                    ├── Có `localStorage['caseyes_active_model']` ──► /design-studio/templates
  │                    └── Chưa có ────────────────────────────────────► /design-studio/select-model
  ├── /select-model  ──► ModelPicker (Bước 1: Chọn hãng & dòng máy)
  ├── /templates     ──► TemplateBrowser (Bước 2: My Designs, Kho 16 mẫu 2-Layer AI & Modal 3D)
  └── /editor        ──► StudioWorkspace (Bước 3: Canvas 2D + Live 3D WebGL Spotlight, full-screen)
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
│   ├── model-selector/                     # Dropdown / Modal chọn nhanh model/SKU
│   ├── template-browser/                   # My Designs + Kho 16 mẫu 2-Layer AI + Modal Chi tiết 3D & Góp ý thẩm mỹ
│   └── studio-workspace/                   # Trình chỉnh sửa Canvas 2D + Live 3D WebGL Spotlight + Kho Element AI
├── constants/
│   └── template-artworks.ts                # SVG artworks & artwork map đồng bộ 1:1 vào Canvas
├── models/
│   ├── canvas-element.model.ts             # `TextElement`, `StickerElement`, `ImageElement`, `BackgroundElement`, `CanvasLayer`
│   ├── studio-domain.model.ts              # `Brand`, `PhoneModel`, `SafeZoneMask`, `CameraCutout`, `BaseSKU`, `CASE_MATERIALS`
│   ├── studio-state.model.ts               # `DesignStatus`, `DesignDraft`, `StudioHistoryState`, `ActiveToolSelection`
│   └── policy-consent.model.ts             # `ContentPolicyConsent`, `BannedKeyword`
└── services/
    ├── studio-catalog.ts                   # Dữ liệu 3 hãng, 5 dòng máy, camera cutout & SKUs
    ├── studio-state.ts                     # State reactive (Signals): layers, undo/redo, stickers AI, savedDesigns, giá 250.000đ
    └── studio-draft.ts                     # Auto-save bản nháp 60s vào `localStorage['caseye_studio_draft']`
```

**Assets bổ sung trên nhánh:**
- `public/models/*.glb`: 6 model 3D (`iphone-15-pro-max.glb`, `iphone-16-pro.glb`, `iphone-14.glb`, `galaxy-s24.glb`, `xiaomi-14-ultra.glb`, `phone-generic.glb`).
- `public/assets/templates/background/`: 13 ảnh nền phôi ốp AI độ phân giải cao định dạng `.webp`.
- `public/assets/templates/elements/`: 13 ảnh element nghệ thuật AI tách nền trong suốt định dạng `.png`.
- `public/assets/templates/the-creators-*.webp`: 2 tác phẩm độc quyền The Creators (Real team & Chibi squad).
- `public/assets/stickers/`: 13 element đồ họa & sticker AI tách nền trong suốt chất lượng cao chuẩn print.
- `public/assets/chibi-designer.webp`: Nhân vật Chibi áo tím xuất hiện khi hover card phôi trắng.
- `public/assets/badges/*.svg`: Các huy hiệu SVG (`360-rotate.svg`, `polycarbonate-shield.svg`, `uniform-price.svg`).

---

## 3. Những tính năng đã hoàn thiện

### A. Chọn dòng máy (`ModelPicker` & `StudioCatalogService`)
- Hỗ trợ 3 hãng / 5 máy: **iPhone 15 Pro Max**, **iPhone 16 Pro**, **iPhone 15 Pro**, **Galaxy S24**, **Xiaomi 14 Ultra**.
- Đồng bộ giao diện nút đổi dòng máy chuẩn UI thương hiệu giữa ngoài Kho Mẫu và trong Canvas Studio.
- Đổi dòng máy bằng **Modal chuyên dụng**, khóa cuộn nền (`body overflow: hidden`) chống giật lag.
- Khi người dùng đổi máy trong Canvas Studio rồi nhấn *"Tiếp tục"*, hệ thống tự động cập nhật ngay phôi ốp và lỗ camera tương ứng mà không bị văng về kho mẫu.
- Hiển thị kích thước vùng in (`printWidthMm × printHeightMm`), DPI tối thiểu (`150 DPI`), số ống kính và cờ hỗ trợ 3D thật (`has3dModel`).

### B. Kho mẫu & My Designs (`TemplateBrowser`)
- **Hiệu ứng Chibi Peeker độc quyền:**
  - Tại card **"Ốp Lưng Trắng Tiêu Chuẩn"**, khi hover chuột, nhân vật Chibi áo tím từ từ ló ra phía sau góc trên bên phải, chỉ tay về phía ốp kèm bong bóng thoại *"Tự thiết kế ngay!"*.
  - Layer chibi nằm sau card (`z-0`), không che nút bấm/nội dung, căn sát lề 16px mượt mà, hỗ trợ tắt trên màn hình cảm ứng hoặc `prefers-reduced-motion`.
- **My Designs (Thiết kế của tôi):**
  - Yêu cầu đăng nhập tài khoản để xem và đồng bộ các mẫu cá nhân.
  - Nền khu vực My Designs chuyển sang dải gradient tím dịu nhẹ, phân biệt rõ ràng với kho mẫu bên dưới.
  - Hiển thị tối đa 4 card thiết kế to rõ; khi `> 4` bản vẽ có nút **Xem tất cả** mở popup có bộ lọc tìm kiếm.
  - Menu `⋮` hỗ trợ: *Tiếp tục chỉnh sửa*, *Nhân bản*, *Đổi tên*, *Xóa* (kèm modal xác nhận).
- **Kho mẫu (`TEMPLATE_CATALOG` — 16 mẫu 2-Layer AI trọn gói):**
  1. **#1. Ốp Lưng Trắng Tiêu Chuẩn** (Tự vẽ từ đầu với Chibi Peeker).
  2. **#2. The Creators • Đội Ngũ CasEYE** (Bản vẽ chân dung độc quyền của team).
  3. **#3. The Creators • Chibi Squad** (Phiên bản hoạt hình 5 thành viên siêu dễ thương).
  4. **#4 – #16. 13 Mẫu AI 2 Lớp Hoàn Chỉnh:** *Fluffy Cloud Kittens, Matcha Boba Corgi, Baby Dino Picnic, Cyber Chrome Heart, Holographic Cosmic Butterfly, Retro Arcade 1998, Tokyo Night Sakura, Fuji Lavender Sunset, Wild Botanical Garden, Manifesting Good Vibes, Create Your Own Luck, Liquid Amethyst Waves, Aura Gradient Energy*.
  - **Cơ chế 2-Layer độc lập:** Nền phôi (`bgImage`) và đối tượng chính (`elementImage` tách nền PNG). Khi bấm *"Dùng mẫu này & Vào Studio"*, ảnh nền được nạp vào `caseBg`, còn element trở thành một `ImageElement` độc lập trên canvas để người dùng tự do phóng to, thu nhỏ, xoay, lật, di chuyển hoặc xóa.
  - Card thiết kế tinh gọn: Đã lược bỏ điểm số sao và nhãn tuyển chọn không cần thiết, hover có viền tím pastel phát sáng nổi bật.
- **Thanh Hashtag Chủ Đề Đồng Bộ 100%:**
  - Tự động quét và tổng hợp toàn bộ 60+ hashtag có trong catalog (`#Creators`, `#Chibi`, `#Hoa_lá`, `#Cute`, `#Pastel`, `#Tối_giản`, `#Phong_cảnh`, `#Hoạt_hình`, `#Typography`, `#Abstract`, `#Aesthetic`, `#Mèo_con`, `#Y2K`, `#Retro`, `#Streetwear`, `#Vintage`, `#Cyberpunk`, `#GenZ`,...).
  - Hỗ trợ chọn nhiều nút chủ đề cùng lúc (loại trừ nút *Tất cả* khi chọn cụ thể), nút *"Xem tất cả"* / *"Thu gọn"* chuyển đổi mượt mà giữa cuộn ngang và lưới đầy đủ.
- **Modal Chi tiết & Xem trước 3D Realtime:**
  - Phối màu gradient tím tối trầm sang trọng, cân đối, full chiều cao modal.
  - Cột preview bên trái cố định (sticky) khi cuộn nội dung thông tin bên phải.
  - Khắc phục triệt để lỗi đen màn hình: Cắt đường bao ốp trước (`ctx.clip()`), sau đó chiếu texture nền và element sắc nét, bảo toàn không gian màu sRGB.
  - Chuyển đổi linh hoạt giữa **Mô hình 3D xoay** và **Mặt lưng 2D**; với các dòng máy chưa hỗ trợ 3D, hệ thống ưu tiên mở tab 2D và hiện thông báo nhắc nhở tinh tế khi bấm tab 3D.
  - Tích hợp nút **Lưu vào yêu thích (Tim)** dễ nhìn, đồng bộ số lượng với tab *"Đã thích ❤️"*.
  - **Bình luận & Góp ý thẩm mỹ:** Thay thế hoàn toàn đánh giá sao truyền thống bằng góc góp ý độ đẹp và mong muốn tùy biến mẫu, có cổng chặn bắt buộc đăng nhập tài khoản trước khi gửi nhận xét.

### C. Trình chỉnh sửa Canvas 2D + 3D Live (`StudioWorkspace`)
- **Thanh công cụ trái (5 tab chuyên sâu):**
  1. **Tải ảnh (`img`):** Upload PNG/JPG/WEBP; tự nén/resize client-side giữ kênh alpha; cảnh báo `< 150 DPI`; cam kết bản quyền điện tử `v1.0`.
  2. **Chữ (`txt`):** Thêm chữ, preset style, font/màu/cỡ/căn lề/đậm/nghiêng/gạch chân, text effects (`shadow`, `neon`, `lift`), kiểm duyệt từ khóa cấm theo `BANNED_KEYWORDS`.
  3. **Sticker & Element AI (`stk`):** Thay mới toàn bộ bằng **13 Element AI đồ họa tách nền trong suốt**, viền mượt mà, phân loại `cute`, `y2k`, `creative`, bố trí lưới gọn gàng chống tràn viền.
  4. **Nền (`bg`):** Bảng màu solid, color picker tự do, bộ tạo dual gradient (`linear`/`radial`, góc quay, đảo màu) và kho gradient nghệ thuật.
  5. **Layers (`tpl`):** Danh sách layer trực quan, kéo-thả đổi thứ tự, khóa/mở khóa, lên/xuống bậc, ẩn/hiện, xóa.
- **Tương tác Canvas 2D mượt mà:** Kéo thả di chuyển kèm đường gióng căn tâm (**Smart Snap Guides**), kéo ra ngoài stage để xóa, 4 tay cầm resize/rotate/crop, lật ngang/dọc, **nhấn đúp sửa chữ trực tiếp trên canvas**.
- **Phím tắt Canva (`?`):** `Ctrl+D`, `Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z`, `Delete`/`Backspace`, mũi tên nudge, `T`, `S`, `Ctrl+[` / `Ctrl+]`, `Esc`, `Ctrl + Wheel` zoom.
- **Live 3D Preview (Cột phải):**
  - Khung 3D Stage nâng cấp sang **Radial Gradient Spotlight** (`radial-gradient(ellipse at 50% 25%, #ffffff 0%, #f6f3fe 35%, #ece6fd 70%, #d8cdf8 100%)`) có viền tím mờ và bóng chìm sang trọng.
  - Render thời gian thực từ Canvas 2D lên Three.js texture trên phôi ốp Polycarbonate.
- **Lưu & Guest flow:** Auto-save nháp mỗi `60s`; khách chưa đăng nhập bấm Lưu / Thêm vào giỏ sẽ lưu ngầm vào `caseyes_guest_draft`, mở `AuthModal` và tự động sync vào *My Designs* ngay sau khi đăng nhập.

---

## 4. Trạng thái tích hợp & Handoff cho team

### Đã tích hợp thật
- **Authentication:** Dùng `SupabaseAuthService` và `AuthModal` (`src/app/core/supabase/supabase-auth.service.ts`, `src/app/core/auth/auth-modal.ts`).
- **3D Rendering:** `@google/model-viewer` + Three.js texture projection trực tiếp trên WebGL.
- **Asset Pipeline:** 13 bộ mẫu 2-layer AI + 13 Element/Sticker AI hoàn chỉnh đã nằm trong `public/assets/`.

### Đang chạy Local / Chờ Backend kết nối
1. **Cart integration (`onAddToCart()`):** Kiểm tra điều kiện (`REJECTED`, `hasLayers()`, đăng nhập) và hiện toast thông báo. Sẵn sàng kết nối `CartService` khi nhánh cart hoàn thiện.
2. **Supabase Database & Storage:**
   - `savedDesigns`, bản nháp (`StudioDraft`) và đánh giá thẩm mỹ (`reviewsMap`) đang lưu qua Signal state và `localStorage`, có thể nối trực tiếp vào bảng `designs` của Supabase.
   - Ảnh upload cá nhân hiện lưu tạm dạng Data URL base64, sẵn sàng chuyển sang upload bucket Supabase Storage khi có endpoint.

---

## 5. Danh sách file chính của module

- `src/app/features/design-studio/components/template-browser/`:
  - `template-browser.ts`: Khai báo 16 `TEMPLATE_CATALOG`, hàm sinh hashtag đồng bộ `generateSynchronizedCategories()`, modal 3D và logic yêu thích/đánh giá.
  - `template-browser.html`: Giao diện My Designs, thanh hashtag, lưới mẫu kèm hiệu ứng Chibi Peeker và modal chi tiết.
  - `template-browser.scss`: Keyframes animation peeker, responsive breakpoint và hiệu ứng glow.
- `src/app/features/design-studio/components/studio-workspace/`:
  - `studio-workspace.ts`: Logic Canvas 2D, Three.js 3D texture projection và phím tắt.
  - `studio-workspace.html`: Canvas editor full-screen, kho Sticker AI và khung 3D Spotlight.
- `src/app/features/design-studio/services/studio-state.ts`: Quản lý reactive signal state cho Canvas, layers, history và danh sách `STICKERS_LIST`.
