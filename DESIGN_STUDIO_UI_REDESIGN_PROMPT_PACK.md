# 🎨 KẾ HOẠCH NÂNG CẤP GIAO DIỆN & BỘ PROMPT TẠO ASSETS CHO DESIGN STUDIO (CASEYES)

> **Dự án:** ECOMMERCE-WEB-CASEYEs (Website Thương Mại Điện Tử Ốp Lưng Theo Yêu Cầu Cho Gen-Z)  
> **Module trọng tâm:** Design Studio Canvas & 3D Realtime Inspector  
> **Định hướng thẩm mỹ:** **Clean first, Gen-Z second** (80% thanh lịch tinh tế, 20% năng động rực rỡ; lấy cảm hứng từ Casetify, Apple Store, Figma và Canva).

---

## 📌 HƯỚNG DẪN DÀNH CHO BẠN (WORKFLOW THỰC HIỆN)

1. **Bước 1 (Gen Mockup Giao Diện):** Sao chép các prompt ở **PHẦN 2** vào ChatGPT Plus (chế độ GPT-4o / DALL-E 3) để tạo ra các concept hình ảnh giao diện mới. Điều này giúp cả team thống nhất phong cách thị giác (visual identity).
2. **Bước 2 (Gen Toàn Bộ Assets PNG):** Lần lượt copy các prompt ở **PHẦN 3** (Icons, Badges, 24 Stickers, 10 Templates Ốp lưng) vào ChatGPT Plus để tạo ảnh PNG nền trong suốt (transparent background).
3. **Bước 3 (Đóng gói ZIP):** Tải tất cả các ảnh về, đặt đúng tên file theo quy chuẩn đã định sẵn trong tài liệu này và nén lại thành 1 file ZIP:
   ```text
   caseyes-design-studio-assets.zip
   ├── icons/       (14 file PNG icons thanh công cụ & thao tác)
   ├── badges/      (5 file PNG huy hiệu chất liệu & giá)
   ├── stickers/    (24 file PNG sticker Gen-Z tách nền)
   └── templates/   (10 file PNG mẫu ốp lưng thực tế)
   ```
4. **Bước 4 (Cập nhật vào Web):** Bạn chỉ cần đặt file zip vào thư mục dự án hoặc giải nén vào thư mục `public/assets/design-studio/`, Antigravity sẽ tự động cập nhật toàn bộ code để thay thế tất cả emoji/placeholder tạm bợ!

---

## 📑 PHẦN 1: MÔ TẢ ĐẦY ĐỦ GIAO DIỆN HIỆN TẠI & PHÂN TÍCH ĐIỂM CẦN LỘT XÁC

### 1. Cấu trúc Layout 4 Cột Hiện Tại

```
┌──────────┬────────────────────┬──────────────────────────────────────┬──────────────────────┐
│  CỘT 1   │       CỘT 2        │                CỘT 3                 │        CỘT 4         │
│ TOOL     │ TOOL DRAWER        │ CANVAS STAGE                         │ 3D PREVIEW & SPECS   │
│ RAIL     │ (Ngăn kéo chi tiết)│ (Khu vực thiết kế trung tâm)         │ (Mô hình xoay 360°)  │
│ (72px)   │ (280px - 320px)    │ (Co giãn tự do)                      │ (300px)              │
│          │                    │                                      │                      │
│ [Ảnh]    │ • Upload dropzone  │ • Thanh trên: Tên + Tràn viền + Zoom │ • Phôi ốp 3D xoay    │
│ [Chữ]    │ • Font / Size / Fx │ • Phôi ốp 2D (Camera cutout)         │ • Nút xoay 360 / Lưng│
│ [Sticker]│ • 24 ô Sticker     │ • Vạch căn giữa thông minh (Snap)    │ • Chọn màu viền ốp   │
│ [Nền]    │ • Màu đơn/Gradient │ • Thanh công cụ nổi (Flip, Fx, Lock) │ • Polycarbonate 🛡️   │
│ [Layers] │ • Quản lý lớp layer│ • Khung ngắt dòng chữ tự nhiên (↔)   │ • Đồng giá 250k 🏷️   │
│ [Undo]   │                    │                                      │                      │
│ [Redo]   │                    │                                      │                      │
└──────────┴────────────────────┴──────────────────────────────────────┴──────────────────────┘
└─────────────────────────────────────────────────────────────────────────────────────────────┘
  BOTTOM BAR: Dòng máy đang chọn | Trạng thái tự lưu nháp | Nút "Thêm vào giỏ hàng - 250.000₫"
```

### 2. Chi Tiết Từng Khu Vực & Điểm "Còn Xấu / Thô" Cần Thay Thế

| Khu Vực | Tính năng đang hoạt động | Điểm còn thô / xấu hiện tại | Mục tiêu nâng cấp với Assets mới |
| :--- | :--- | :--- | :--- |
| **Cột 1: Tool Rail** | Nút bấm chuyển tab (Ảnh, Chữ, Sticker, Nền, Layers) | Icon SVG phẳng mờ nhạt, ký tự F10, F12 thô, thiếu hiệu ứng chiều sâu 3D | Thay bằng bộ **3D Glossy Claymorphism Icons** bo góc tròn, ánh tím ngọc bích sang xịn |
| **Cột 2: Tool Drawer** | Hiển thị nội dung tương ứng tab đang chọn | • Tab Sticker đang dùng **Emoji Unicode của hệ điều hành** (nhìn méo mó, quê mùa)<br>• Tab Layers dùng ký tự 🏠, 🎨 làm avatar | Thay thế 100% bằng **24 Sticker Die-cut Vinyl 3D viền trắng nổi**, và icon phân loại layer chuyên nghiệp |
| **Cột 3: Canvas Stage** | Phôi ốp 2D, kéo thả ảnh/text, ngắt dòng chữ, snap guides | • Nền canvas xám chấm bi đơn điệu<br>• Phôi ốp 2D phẳng, chưa có hiệu ứng phản quang ánh sáng nhựa polycarbonate | Thêm hiệu ứng studio lighting, bóng đổ đa tầng (purple-tinted shadow), viền phản chiếu ánh kim |
| **Cột 4: 3D Preview & Specs** | Xoay 360 độ phôi ốp 3D, chọn màu viền, hiển thị chất liệu | • Icon chất liệu đang dùng emoji khiên 🛡️<br>• Giá tiền đang dùng emoji nhãn giá 🏷️<br>• Nút xoay 360 chữ thường đơn giản | Thay bằng **Huy hiệu Khiên Quân Đội 3D**, **Tag giá 250k Gold/Hologram 3D**, và **Icon bàn tay Orbit 360°** siêu mượt |
| **Trang Kho Mẫu (Template Browser)** | Danh sách các mẫu ốp lưng có sẵn để người dùng chọn nhanh | Hiện tại chỉ dùng **màu nền CSS gradient trơn lụi**, chưa có hình ảnh mockup ốp lưng in họa tiết thực tế | Thay bằng **10 Ảnh Mockup Ốp Lưng 3D Render** cực nét theo đúng phong cách Y2K, Cute, Cyberpunk, Minimalist |

---

## 🎨 PHẦN 2: BỘ PROMPTS GEN MOCKUP GIAO DIỆN MỚI CHO CHATGPT PLUS (DALL-E 3)

*Bạn hãy copy từng prompt dưới đây vào ChatGPT Plus (sử dụng GPT-4o với DALL-E 3) để tạo ra các concept hình ảnh giao diện mới đỉnh cao.*

---

### Prompt 1: Mockup Tổng Thể Giao Diện Desktop Design Studio (Full Studio Dashboard)

> **Mục đích:** Tạo ra bức tranh toàn cảnh giao diện web máy tính của Studio thiết kế ốp lưng điện thoại thời thượng, kết hợp giữa Casetify, Apple và Figma.

```text
A hyper-modern, award-winning UI/UX design mockup for a D2C custom phone case design studio web application called "CasEYE's". 
Clean first, Gen-Z aesthetic, 80% calm minimalism with 20% vibrant futuristic purple gradients.
Color palette: deep royal purple (#433075), lavender lilac accent (#A58CF4), warm off-white surface (#FAFAFA), jet black typography (#0A0A0A).

Layout structure shown in a crisp 16:9 desktop viewport:
1. Left Slim Tool Rail (72px): Elegant frosted glass vertical dock with 3D glossy rounded icons for "Images", "Typography", "Stickers", "Background Gradient", "Layers", "Undo/Redo".
2. Expanded Tool Drawer (300px): Clean white floating card panel displaying high-end Y2K die-cut sticker assets, font pairing pickers, and dual-color gradient sliders.
3. Center Canvas Workspace (Hero focus): An ultra-realistic 2D mockup of an iPhone 16 Pro phone case resting on an elevated stage with soft purple ambient occlusion shadows. A trendy design on the case featuring aesthetic typography and holographic butterfly art. Interactive bounding boxes, subtle magenta smart-alignment guidelines, and a sleek floating pill toolbar on top.
4. Right 3D Inspection Panel (320px): An interactive Three.js 3D phone case rendered in photorealistic studio lighting showing the back and camera bezel, with a sleek bumper color palette selector (matte black, titanium, baby blue, lilac) and a premium "Military Grade Polycarbonate" badge with a 250,000 VND fixed price tag.
5. Bottom Sticky Bar: Minimalist status bar with device model switcher, auto-saved indicator, and a vibrant glowing gradient pill button: "Thêm vào giỏ hàng - 250.000₫".

Figma-style high-fidelity UI presentation, Dribbble trending, Behance featured, ultra-crisp vector typography, modern frosted glassmorphism accents, soft subtle blur, 8k resolution render. --ar 16:9
```

---

### Prompt 2: Cận Cảnh Vùng Canvas Trung Tâm & Phôi Ốp 3D Siêu Thực

> **Mục đích:** Tạo concept cận cảnh không gian tương tác phôi ốp điện thoại với ánh sáng phản quang cao cấp.

```text
Macro close-up UI screenshot of a luxury phone case customization canvas. 
In the center, a photorealistic iPhone 16 Pro Max clear polycarbonate phone case is showcased with glossy reflections, refined camera cutout bump, and an artistic graphic print on the back.
Surrounding the phone case are modern Canva-inspired editing controls:
- Soft magenta magnetic snap alignment guide lines with a floating tooltip badge reading "CĂN GIỮA".
- Floating frosted-glass contextual micro-toolbar with sleek rounded icon buttons: Horizontal Flip, Center Align, Lock Layer, Text Shadow, Neon FX, and Delete.
- Aesthetic typography element selected with soft purple corner drag handles and horizontal resize pills showing natural multi-line text wrapping.
Background is a warm studio canvas with subtle dot-matrix grid and ethereal ambient purple neon rim light. Clean, sophisticated, ultra-polished ecommerce interface. 8k resolution, photorealistic product rendering. --ar 16:9
```

---

### Prompt 3: Mockup Cột Công Cụ Bên Trái & Thư Viện Sticker Gen-Z

> **Mục đích:** Tạo concept cho thanh menu công cụ bên trái và ngăn kéo sticker/typography với phong cách sticker dán 3D.

```text
UI mockup focus on the left sidebar and secondary drawer of a creative design studio application.
The vertical tool rail features glossy, tactile 3D icons: Photo camera, Stylized 3D letter 'T', Glossy peeled sticker, Color palette orb, Layered acrylic sheets.
The open side-drawer reveals a vibrant "Sticker Library" grid showcasing premium 3D puffy die-cut vinyl stickers (chrome cyber star, holographic butterfly, Y2K flame, retro daisy flower, kawaii cat). Each sticker sits on an individual subtle rounded tile with hover elevation.
Header reads "Kho Sticker Gen-Z" with category filter chips (Y2K, Aesthetic, Kawaii, Cyberpunk, Typography).
Design language: Soft UI, frosted glassmorphism, Apple-level polish, Plus Jakarta Sans typography, high contrast, clean white cards with gentle purple drop shadows. --ar 4:3
```

---

### Prompt 4: Mockup Góc Nhìn Mobile Responsive (Giao Diện Trên Điện Thoại)

> **Mục đích:** Xem trước giao diện Design Studio khi người dùng truy cập bằng điện thoại thông minh (iPhone/Android).

```text
Mobile app UI/UX design mockup for the "CasEYE's" Phone Case Customizer running on an iPhone 16 Pro screen.
Clean vertical layout:
- Top bar: Back button, phone model dropdown ("iPhone 16 Pro Max"), and a glossy shopping bag icon.
- Upper half: Interactive 3D phone case view that can be rotated 360 degrees with finger swipe gesture indicator.
- Center stage: 2D touch canvas with intuitive pinch-to-zoom, rotate, and resize handles around a trendy graphic element.
- Bottom docked sheet: Quick swipeable tool tabs (Ảnh, Chữ, Sticker, Nền, Màu viền) with thumb-friendly circular buttons.
- Sticky bottom action bar: "Chất liệu: Polycarbonate • Đồng giá 250.000₫" and a prominent glowing purple pill button "Thêm vào giỏ hàng".
Modern Gen-Z mobile ecommerce, Figma quality, minimalist white interface with lilac purple accents, pixel-perfect layout. --ar 9:16
```

---

## 📦 PHẦN 3: BỘ PROMPT TẠO TẤT CẢ ASSETS PNG TÁCH NỀN (ICONS, BADGES, STICKERS, MẪU ỐP)

> **Quy cách kỹ thuật chung khi gen bằng ChatGPT Plus (DALL-E 3):**
> - Luôn yêu cầu: `Isolated on a pure white background` hoặc `Isolated on transparent background, no shadow clipping`.
> - Định dạng file sau khi tải: **PNG 32-bit (có kênh Alpha trong suốt)**.
> - Kích thước chuẩn:
>   - Icons & Badges: `512 x 512 px`
>   - Stickers: `512 x 512 px` hoặc `1024 x 1024 px`
>   - Mẫu Ốp Lưng (Templates): `600 x 1200 px` (tỷ lệ 1:2)

---

### NHÓM A: BỘ ICONS CÔNG CỤ & THAO TÁC (14 FILE)
*Thư mục lưu trữ dự kiến: `public/assets/design-studio/icons/`*

#### 1. `icon-tool-image.png` (Công cụ: Thêm ảnh)
```text
A premium 3D app icon representing "Add Photo/Image", modern Claymorphism and glossy glass style. A sleek minimalist camera with glowing purple lens and a photo polaroid sliding out. Vibrant lilac (#A58CF4) and deep royal purple (#433075) accents, smooth rounded corners, isolated on a clean white background, high quality 3D render. --ar 1:1
```

#### 2. `icon-tool-text.png` (Công cụ: Thêm chữ)
```text
A stylish 3D typography app icon representing "Add Text". A bold dimensional 3D letter 'T' made of polished lilac acrylic and frosted glass with a glowing cyan cursor underline. Clean modern design, smooth bevels, vibrant purple gradient reflections, isolated on a pure white background. --ar 1:1
```

#### 3. `icon-tool-sticker.png` (Công cụ: Kho Sticker)
```text
A playful 3D app icon representing "Stickers Library". A puffy, glossy heart and star sticker peeling off from a shiny vinyl sheet with a folded corner. Pastel purple, holographic sheen, aesthetic Gen-Z vibe, smooth lighting, isolated on a pure white background. --ar 1:1
```

#### 4. `icon-tool-background.png` (Công cụ: Nền & Gradient)
```text
A modern 3D icon representing "Case Background and Gradient Colors". A floating translucent glass sphere/orb containing an iridescent, swirling liquid gradient of deep purple, pink, and bright cyan. Glossy reflections, luxury design, isolated on a pure white background. --ar 1:1
```

#### 5. `icon-tool-layers.png` (Công cụ: Quản lý Layers)
```text
A high-tech 3D icon representing "Design Layers". Three stacked, floating isometric rectangular glass plates hovering in parallel with gentle purple rim lighting, illustrating transparent design sheets. Minimalist, premium tech aesthetic, isolated on a pure white background. --ar 1:1
```

#### 6. `icon-tool-undo.png` & `icon-tool-redo.png` (Hoàn tác / Làm lại)
```text
A sleek, glossy 3D curved arrow icon pointing counter-clockwise (Undo), crafted in metallic polished lilac and chrome with smooth beveled edges. Minimalist UI icon, studio lighting, isolated on a pure white background. --ar 1:1
```
*(Đối với Redo: Đổi "counter-clockwise" thành "clockwise pointing to the right" -> lưu thành `icon-tool-redo.png`)*

#### 7. `icon-action-flip-h.png` (Lật ảnh ngang)
```text
A clean minimalist 3D icon for "Horizontal Flip": two mirrored geometric triangles reflecting each other across a vertical glowing dashed line. Polished purple chrome material, isolated on a pure white background. --ar 1:1
```

#### 8. `icon-action-flip-v.png` (Lật ảnh dọc)
```text
A clean minimalist 3D icon for "Vertical Flip": two mirrored geometric triangles reflecting each other across a horizontal glowing dashed line. Polished purple chrome material, isolated on a pure white background. --ar 1:1
```

#### 9. `icon-action-center.png` (Căn giữa Canvas)
```text
A precision 3D target icon representing "Center in Canvas": a sleek geometric circular bullseye crosshair with a glowing magenta center dot. Modern Figma-inspired tool icon, polished lilac and white finish, isolated on a pure white background. --ar 1:1
```

#### 10. `icon-action-lock.png` & `icon-action-unlock.png` (Khóa / Mở khóa Layer)
```text
A stylish 3D closed padlock icon representing "Lock Element". Modern rounded body made of matte deep purple composite with a shiny metallic gold or platinum shackle. Smooth minimal 3D design, isolated on a pure white background. --ar 1:1
```
*(Đối với Unlock: Đổi "closed padlock" thành "open padlock with lifted shackle" -> lưu thành `icon-action-unlock.png`)*

#### 11. `icon-action-delete.png` (Xóa Layer / Vứt đi)
```text
A sleek, modern 3D trash bin icon representing "Delete Element". Minimalist aesthetic container with lid slightly floating open, rendered in smooth matte coral/red and soft lilac tones, isolated on a pure white background. --ar 1:1
```

#### 12. `icon-action-duplicate.png` (Nhân bản Layer)
```text
A modern 3D icon representing "Duplicate Layer": two overlapping rounded rectangular cards floating in isometric perspective, top card highlighted with a glowing plus sign '+'. Sleek glass and purple acrylic, isolated on a pure white background. --ar 1:1
```

---

### NHÓM B: BỘ HUY HIỆU CHẤT LIỆU & CAM KẾT (5 FILE)
*Thư mục lưu trữ dự kiến: `public/assets/design-studio/badges/`*

#### 1. `badge-polycarbonate-shield.png` (Huy hiệu chất liệu: Polycarbonate cao cấp)
```text
A luxury 3D emblem badge representing "Military-Grade Polycarbonate Protection". A sleek multifaceted heraldic shield made of bulletproof crystal-clear polycarbonate with a glowing royal purple titanium outer rim and a subtle star crest in the center. Professional security badge, hyper-realistic glass refraction, isolated on pure white background. --ar 1:1
```

#### 2. `badge-uv-printing.png` (Huy hiệu công nghệ in: UV Chống Phai Màu)
```text
A futuristic 3D badge representing "Ultra-Vivid UV Printing Technology". An emblem with stylized ultraviolet light rays illuminating a crystal prism that disperses a vibrant neon rainbow beam. Text badge aesthetic with high-gloss metallic finish, isolated on pure white background. --ar 1:1
```

#### 3. `badge-price-tag-250k.png` (Huy hiệu: Đồng giá 250.000₫)
```text
A trendy Gen-Z 3D shopping price tag emblem. A puffy glossy 3D tag in royal purple (#433075) with metallic gold border and a shiny star ribbon, featuring embossed bold typography: "250K ĐỒNG GIÁ". Aesthetic Casetify-style ecommerce badge, isolated on pure white background. --ar 1:1
```

#### 4. `icon-360-rotate.png` (Biểu tượng: Giữ chuột xoay 360°)
```text
A modern 3D interactive icon for "360 Degree 3D Orbit Rotation". A sleek stylized hand cursor or fingertip smoothly tracing an elegant glowing circular orbit ring with motion direction arrows around a tiny 3D phone silhouette. Polished lilac and white, isolated on pure white background. --ar 1:1
```

#### 5. `badge-quality-guarantee.png` (Huy hiệu: Đảm bảo chất lượng)
```text
A premium 3D seal badge with a circular ribbon rosette, embossed checkmark in the center, crafted in metallic satin purple and polished platinum silver. Luxury warranty seal, isolated on pure white background. --ar 1:1
```

---

### NHÓM C: BỘ 24 STICKERS XU HƯỚNG GEN-Z (THAY THẾ TOÀN BỘ EMOJI THÔ)
*Thư mục lưu trữ dự kiến: `public/assets/design-studio/stickers/`*  
*Phong cách chung:* **3D puffy die-cut vinyl sticker with a thick clean white border, glossy reflections, vibrant Y2K / Cyber / Aesthetic colors, isolated on pure white background.**

| STT | Tên file quy chuẩn | Emoji hiện tại | Prompt ChatGPT Plus / DALL-E 3 |
| :---: | :--- | :---: | :--- |
| 1 | `sticker-y2k-heart.png` | ❤️ | `A glossy 3D die-cut vinyl sticker of a Y2K metallic chrome liquid heart with hot pink and lilac reflections, thick white sticker outline, isolated on a pure white background. --ar 1:1` |
| 2 | `sticker-cyber-star.png` | ⭐ | `A cute 3D die-cut sticker of a retro-futuristic four-pointed star in polished gold and lavender chrome with sparkling glints, thick white sticker border, isolated on pure white background. --ar 1:1` |
| 3 | `sticker-sakura-flower.png` | 🌸 | `A delicate 3D puffy vinyl sticker of a Japanese Sakura cherry blossom flower with translucent pink glass petals and golden stamen, thick white border, isolated on pure white background. --ar 1:1` |
| 4 | `sticker-happy-face.png` | 😊 | `A trendy retro 90s smiley face die-cut sticker in vibrant sunshine yellow with daisy flower petals surrounding it, glossy enamel finish, thick white border, isolated on pure white background. --ar 1:1` |
| 5 | `sticker-pastel-rainbow.png` | 🌈 | `A dreamy 3D die-cut vinyl sticker of a curved pastel rainbow ending in fluffy white marshmallow clouds, aesthetic soft gradients, thick white sticker border, isolated on pure white background. --ar 1:1` |
| 6 | `sticker-holographic-butterfly.png` | 🦋 | `A stunning 3D die-cut sticker of a holographic morpho butterfly with iridescent glowing cyan, violet and pink wings, metallic sheen, thick white border, isolated on pure white background. --ar 1:1` |
| 7 | `sticker-glossy-strawberry.png` | 🍓 | `A delicious-looking 3D die-cut vinyl sticker of a ripe strawberry with glossy sugar-glaze candy shine and fresh green leaves, thick white border, isolated on pure white background. --ar 1:1` |
| 8 | `sticker-magic-sparkles.png` | ✨ | `A magical 3D die-cut sticker cluster of four-point sparkles and twinkling diamond stars in bright cyan and lilac neon, thick white sticker border, isolated on pure white background. --ar 1:1` |
| 9 | `sticker-cute-puppy.png` | 🐶 | `An adorable 3D clay-style sticker of a smiling Corgi puppy wearing cool retro pink sunglasses, aesthetic kawaii style, thick white die-cut outline, isolated on pure white background. --ar 1:1` |
| 10 | `sticker-crescent-moon.png` | 🌙 | `An aesthetic 3D die-cut sticker of a gentle crescent moon wearing a sleepy nightcap resting on a fluffy lavender cloud with dangling golden stars, thick white border, isolated on pure white background. --ar 1:1` |
| 11 | `sticker-lucky-clover.png` | 🍀 | `A glossy 3D die-cut vinyl sticker of a vibrant emerald green four-leaf clover with dew drops on leaves, lucky charm aesthetic, thick white border, isolated on pure white background. --ar 1:1` |
| 12 | `sticker-neon-flame.png` | 🔥 | `A trendy Y2K die-cut sticker of a stylized fire flame in electric magenta and violet purple gradient, smooth glossy vinyl, thick white sticker border, isolated on pure white background. --ar 1:1` |
| 13 | `sticker-coquette-bow.png` | 🎀 | `A cute Coquette-style 3D puffy sticker of a silky baby pink ribbon bow with soft realistic fabric folds and pearl highlights, thick white border, isolated on pure white background. --ar 1:1` |
| 14 | `sticker-sunflower.png` | 🌻 | `A cheerful 3D clay-render die-cut sticker of a smiling sunny sunflower with rich golden-yellow petals and brown textured center, thick white border, isolated on pure white background. --ar 1:1` |
| 15 | `sticker-dreamy-cloud.png` | ☁️ | `A puffy 3D die-cut sticker of a smiling aesthetic cloud with soft sunset pastel pink and violet shading, thick white vinyl sticker outline, isolated on pure white background. --ar 1:1` |
| 16 | `sticker-shooting-star.png` | 💫 | `A dynamic 3D die-cut sticker of a shooting star comet streaking across with a sparkling rainbow particle trail, glossy finish, thick white border, isolated on pure white background. --ar 1:1` |
| 17 | `sticker-lightning-bolt.png` | ⚡ | `A bold, sharp 3D die-cut sticker of an electric lightning bolt in neon yellow and energetic cyan glow, beveled edges, thick white vinyl border, isolated on pure white background. --ar 1:1` |
| 18 | `sticker-kawaii-avocado.png` | 🥑 | `A super cute 3D clay-style die-cut sticker of an avocado half with a smiling brown seed face and blushing pink cheeks, thick white sticker border, isolated on pure white background. --ar 1:1` |
| 19 | `sticker-twin-cherries.png` | 🍒 | `A retro aesthetic 3D die-cut sticker of a pair of juicy deep red glossy cherries joined by a green leafy stem, thick white vinyl outline, isolated on pure white background. --ar 1:1` |
| 20 | `sticker-art-palette.png` | 🎨 | `A creative 3D die-cut sticker of a wooden painter's artist palette with colorful glossy paint dollops (purple, pink, turquoise, gold) and a brush, thick white border, isolated on pure white background. --ar 1:1` |
| 21 | `sticker-saturn-planet.png` | 🪐 | `A cosmic 3D die-cut sticker of Planet Saturn in pastel lavender and lilac rings with twinkling stars around it, aesthetic space theme, thick white border, isolated on pure white background. --ar 1:1` |
| 22 | `sticker-crystal-unicorn.png` | 🦄 | `An adorable 3D die-cut sticker of a magical baby unicorn with a pastel rainbow mane and a glittering golden horn, kawaii aesthetic, thick white border, isolated on pure white background. --ar 1:1` |
| 23 | `sticker-party-popper.png` | 🎉 | `A festive 3D die-cut vinyl sticker of a party popper bursting with colorful confetti stars, ribbons and streamers, glossy look, thick white border, isolated on pure white background. --ar 1:1` |
| 24 | `sticker-coffee-cup.png` | ☕ | `A cozy 3D die-cut sticker of a cute Korean cafe iced coffee tumbler or warm latte mug with a heart steam floating above, thick white border, isolated on pure white background. --ar 1:1` |

---

### NHÓM D: BỘ 10 ẢNH MOCKUP MẪU ỐP LƯNG THỰC TẾ CHO TEMPLATE BROWSER
*Thư mục lưu trữ dự kiến: `public/assets/design-studio/templates/`*  
*Tỷ lệ:* **Chiều dọc (Vertical 1:2 hoặc 9:16)**. Thay thế cho các ô màu gradient trơn ở trang Chọn Mẫu Thiết Kế (`/design-studio/templates`).

#### 1. `tpl-001-blossom-breeze.png` (Blossom Breeze - Y2K Sakura Vibe)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork on the back: delicate cherry blossom branches with floating soft pink petals, ethereal spring morning vibes, elegant script typography reading "Good Vibes Only". Premium polycarbonate gloss, isolated on pure white background. --ar 1:2
```

#### 2. `tpl-002-ocean-wave.png` (Ocean Wave - Deep Ocean Vibe)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork: hypnotic deep ocean swirls, turquoise and navy blue liquid ripples with shimmering seafoam accents, minimalist bold typography reading "DEEP OCEAN". Ultra-clear finish, isolated on pure white background. --ar 1:2
```

#### 3. `tpl-003-meow-daily.png` (Meow Daily - Cute & Pastel)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork: cute illustrated sleepy cartoon kittens on a pastel peach and butter-yellow checkered pattern with tiny paw prints and playful lettering "meow everyday". Kawaii aesthetic, isolated on pure white background. --ar 1:2
```

#### 4. `tpl-004-galaxy-dream.png` (Galaxy Dream - Cyber Cosmos)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork: deep space galaxy nebula with swirling violet dust, distant glittering stars, and an iridescent silver geometric compass, futuristic typography "COSMOS". Matte dark edge, isolated on pure white background. --ar 1:2
```

#### 5. `tpl-005-forest-path.png` (Forest Path - Zen Nature)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork: minimalist Scandinavian pine tree forest silhouette at foggy dawn, sage green and eucalyptus tones, clean modern typography reading "Breathe Nature". Clean design, isolated on pure white background. --ar 1:2
```

#### 6. `tpl-006-memory-lane.png` (Memory Lane - That Girl Y2K)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork: Y2K collage aesthetic with vintage film frame textures, dried press flowers, holographic heart stickers, and handwritten quote "that girl era". Pastel sunset palette, isolated on pure white background. --ar 1:2
```

#### 7. `tpl-007-sunset-glow.png` (Sunset Glow - Golden Hour)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork: radiant California golden hour sunset gradient transitioning from warm tangerine orange to magenta and dusky purple, minimalist sun rays. Glossy finish, isolated on pure white background. --ar 1:2
```

#### 8. `tpl-008-kawaii-bear.png` (Kawaii Bear - Korean Cute Style)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork: adorable Korean fluffy teddy bear holding a freshly baked croissant on a warm cream beige grid background with tiny tulip doodles. Soft aesthetic, isolated on pure white background. --ar 1:2
```

#### 9. `tpl-009-neon-grid.png` (Neon Grid - 80s Cyberpunk Synthwave)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork: futuristic 80s synthwave laser perspective grid in neon cyan and hot magenta with a giant wireframe digital sun on a pitch-black surface. Cyberpunk aesthetic, isolated on pure white background. --ar 1:2
```

#### 10. `tpl-010-sweet-strawberry.png` (Sweet Strawberry - Cottagecore Sweet)
```text
Full back view of a luxury iPhone 16 Pro phone case product mockup. Design artwork: cute scattered strawberry milk carton illustrations, sweet juicy red berries, and delicate white blossoms over a soft pink gingham tablecloth pattern. Cottagecore vibe, isolated on pure white background. --ar 1:2
```

---

## 🗂️ PHẦN 4: HƯỚNG DẪN ĐÓNG GÓI ZIP & CÁCH ANTIGRAVITY TIẾP NHẬN

Sau khi bạn đã gen xong các hình bằng ChatGPT Plus, bạn chỉ cần tạo một thư mục và sắp xếp đúng như sau:

```text
📁 caseyes-design-studio-assets/
├── 📁 icons/
│   ├── icon-tool-image.png
│   ├── icon-tool-text.png
│   ├── icon-tool-sticker.png
│   ├── icon-tool-background.png
│   ├── icon-tool-layers.png
│   ├── icon-tool-undo.png
│   ├── icon-tool-redo.png
│   ├── icon-action-flip-h.png
│   ├── icon-action-flip-v.png
│   ├── icon-action-center.png
│   ├── icon-action-lock.png
│   ├── icon-action-unlock.png
│   ├── icon-action-delete.png
│   └── icon-action-duplicate.png
├── 📁 badges/
│   ├── badge-polycarbonate-shield.png
│   ├── badge-uv-printing.png
│   ├── badge-price-tag-250k.png
│   ├── icon-360-rotate.png
│   └── badge-quality-guarantee.png
├── 📁 stickers/
│   ├── sticker-y2k-heart.png
│   ├── sticker-cyber-star.png
│   ├── sticker-sakura-flower.png
│   ├── ... (đủ 24 file sticker theo bảng trên)
│   └── sticker-coffee-cup.png
└── 📁 templates/
    ├── tpl-001-blossom-breeze.png
    ├── tpl-002-ocean-wave.png
    ├── ... (đủ 10 file template theo danh sách trên)
    └── tpl-010-sweet-strawberry.png
```

Sau đó:
1. Bạn nén thành file **`caseyes-design-studio-assets.zip`**.
2. Thả file zip vào thư mục dự án: `d:\1. UEL\HK7\WEB\0. teamwork\ECOMMERCE-WEB-CASEYEs\` (hoặc giải nén trực tiếp vào `public/assets/design-studio/`).
3. Nhắn cho Antigravity một câu đơn giản: *"mình đã tải xong ảnh rồi, giải nén và ráp vào giao diện đi"*.
4. Antigravity sẽ chạy lệnh giải nén, cập nhật đồng loạt các model, service, template HTML để giao diện lập tức khoác lên mình bộ cánh mới siêu đẹp chuẩn quốc tế!
