# Function Tìm kiếm (Search) – khung lý thuyết và plan triển khai

Bản nháp để team duyệt. Chưa code, chưa đưa lên git. Ý tưởng tham khảo: Casetify. Ở đó có một ô tìm kiếm duy nhất trên header; mở ra là lớp phủ gồm từ khóa phổ biến, tìm bằng ảnh và quét mã; gõ thì có gợi ý theo nhóm; bấm Enter ra trang kết quả có bộ lọc.

## 1. Hiện trạng trong code (bằng chứng)

| Chỗ | Đang làm gì | Vấn đề |
|---|---|---|
| Header: lớp phủ tìm kiếm (`core/layout/header` + `core/search/omni-search-state.ts`) | Ô gõ chữ và tìm bằng ảnh (so màu trung bình với 8 mẫu ốp), Enter thì chuyển sang `/shop?q=` | Chỉ tìm **hàng có sẵn của Shop**. `core/` import `features/shop/catalog`, **phạm quy ước core không import features** |
| Trang Shop (`features/shop/shop.ts`) | Dùng chung `query` với header, lọc theo tên, bộ sưu tập, phong cách, tag; thêm lọc giá và sắp xếp | Ô tìm thứ hai, chỉ trong Shop |
| Design Studio, kho mẫu (`template-browser.ts`) | 16 mẫu có `hashtags`, lọc theo danh mục / hashtag, "AI gợi ý mẫu" (so từ khóa), ô tìm trong My Designs | Ô tìm thứ ba. **Header không tìm thấy mẫu thiết kế** |
| Đơn hàng của tôi, admin (`order-tracking`) | Tìm theo mã đơn hoặc tên mẫu trong danh sách đơn | Đây là **lọc tại chỗ** (trong một danh sách), không phải tìm kiếm toàn site, nên giữ nguyên |

Tìm bằng ảnh hiện chỉ so màu trung bình với một bảng màu viết cứng cho 8 mẫu. Code đã ghi rõ là bản demo, chưa phải AI.

## 2. Khung lý thuyết

Một function tìm kiếm cho thương mại điện tử gồm 6 phần:

1. **Nguồn dữ liệu (index):** những thứ tìm được. Mỗi thứ chuẩn hóa thành một `SearchDoc` gồm `type`, `title`, `subtitle`, `keywords`, `image`, `link`, `facets` và `boost`. Với CasEYE's:
   - **Ốp có sẵn và phụ kiện:** bảng `products` / `product_variants` trên Supabase (đã seed), kèm ảnh và tag từ `catalog.ts` của Shop.
   - **Mẫu thiết kế:** `TEMPLATE_CATALOG` của Design Studio (tên, phong cách, hashtag, người tạo).
   - **Dòng máy:** bảng `phone_models` (để gõ "iphone 15" là ra ốp và mẫu cho máy đó).
   - **Hỗ trợ:** các mục trang chính sách (hủy đơn, hoàn tiền, giao hàng…) và trang CSKH.
   - **Đơn hàng của tôi:** chỉ khi đã đăng nhập. Gõ mã `CC-…` là mở thẳng đơn đó.
2. **Hiểu truy vấn:**
   - Chuẩn hóa tiếng Việt: bỏ dấu, chữ thường, `đ` → `d`; gõ "hoa la" ra "Hoa lá".
   - Từ đồng nghĩa: "dẻo" ~ TPU; "hoa" ~ hoa lá, sakura; "mèo" ~ cat; "ip15" / "iphone15" ~ iPhone 15; "s24" ~ Galaxy S24.
   - Nhận diện dòng máy trong câu, ví dụ "ốp mèo iphone 15", thành bộ lọc.
   - Nhận diện mã: `CC-…` là mã đơn.
3. **Xếp hạng:** điểm = khớp trường × trọng số (tên 5, tag/hashtag 3, bộ sưu tập/phong cách 2, mô tả 1), cộng thưởng nếu khớp đầu từ hoặc khớp cả cụm, cộng `boost` (bán chạy, mẫu hot, còn hàng). Hàng hết hàng xếp sau. Gõ sai một chữ vẫn ra kết quả (so gần đúng). Kho ít dữ liệu (dưới vài trăm mục) nên tính ngay trên trình duyệt; không cần máy chủ tìm kiếm riêng.
4. **Trải nghiệm khi chưa gõ (zero state)**, giống Casetify: từ khóa phổ biến, tìm kiếm gần đây (có nút xóa), dòng máy phổ biến, 4 mẫu đang hot.
5. **Gợi ý khi đang gõ** (debounce khoảng 150 ms), chia nhóm: Từ khóa · Ốp có sẵn (3) · Mẫu thiết kế (3) · Dòng máy · Hỗ trợ, kèm dòng "Xem tất cả kết quả cho '…'". Dùng được bằng bàn phím: ↑↓ chọn, Enter mở, Esc đóng, Ctrl+K mở.
6. **Trang kết quả** `/tim-kiem?q=&loai=&may=`:
   - tab Tất cả / Ốp có sẵn / Mẫu thiết kế / Hỗ trợ;
   - bộ lọc theo dòng máy, phong cách, khoảng giá;
   - sắp xếp: liên quan nhất, giá, mới;
   - ảnh hiển thị đúng tỷ lệ ốp, **không cắt vuông**;
   - **không có kết quả:** gợi ý từ gần đúng, và nút "Tự thiết kế với ý tưởng '…'" mở Design Studio. Đây là điểm khác Casetify, đúng với thế mạnh custom của CasEYE's.

**Phần phụ:**
- **Tìm bằng ảnh:** giữ cách so màu hiện có nhưng mở rộng sang cả mẫu thiết kế, ghi rõ "tìm theo màu sắc".
- **Tra mã:** thay cho "Code Scanner" của Casetify. Gõ hoặc dán mã đơn / mã sản phẩm để mở thẳng. Không làm quét camera.
- **Ghi nhận truy vấn:** lưu từ khóa và các lượt tìm không ra kết quả để team biết khách cần gì. Không lưu dữ liệu cá nhân.

## 3. Kiến trúc đề xuất trong project

```
core/search/                  (dùng chung, KHÔNG import features)
  search.types.ts             SearchDoc, SearchSource, SEARCH_SOURCES (InjectionToken, multi)
  search.service.ts           trạng thái: query, mở/đóng lớp phủ, gần đây, chạy các nguồn + xếp hạng
  search-overlay/             lớp phủ trên header (thay omni overlay hiện tại)
shared/search/
  normalize-vi.ts, rank.ts, synonyms.ts   hàm thuần, có test
  color-match.ts              tìm theo màu (chuyển từ OmniSearchState)
features/search/              function mới "Tìm kiếm"
  search.routes.ts            /tim-kiem
  search-results/             trang kết quả (tab, bộ lọc, trống)
features/shop/search-source.ts            nguồn "Ốp có sẵn" (Supabase products + ảnh/tag từ catalog.ts)
features/design-studio/search-source.ts   nguồn "Mẫu thiết kế" (TEMPLATE_CATALOG)
features/order-tracking/search-source.ts  nguồn "Hỗ trợ" (mục chính sách) + "Đơn của tôi" (mã CC-…)
app.config.ts                 { provide: SEARCH_SOURCES, useExisting: …, multi: true } cho từng nguồn
```

**Lý do:** mỗi function tự khai báo dữ liệu tìm được của mình, còn `core` chỉ biết interface. Thêm nguồn mới (ví dụ CSKH, FAQ) không phải sửa function Tìm kiếm. Cách này sửa luôn lỗi `core` import `features/shop`.

**Tác động lên các function khác:**

| Function | Thay đổi |
|---|---|
| Header (layout chung) | Lớp phủ tìm kiếm mới thay cho lớp phủ cũ; hành vi mở giữ nguyên (nút, Ctrl+K) |
| Shop | Bỏ ô tìm chữ riêng. Đọc `?q=` từ trang kết quả để lọc khi khách bấm "Xem trong cửa hàng". **Giữ** lọc giá, phong cách, sắp xếp |
| Design Studio | Bỏ ô "AI gợi ý mẫu" trùng lặp: chuyển thành "Tìm mẫu" mở tìm kiếm chung với `loai=mau-thiet-ke`. **Giữ** lọc danh mục / hashtag và ô tìm trong My Designs (đồ của riêng khách) |
| Order Tracking | Giữ ô lọc danh sách đơn; thêm nguồn "Hỗ trợ" và "Đơn của tôi" |
| Supabase | Không bắt buộc. Tùy chọn M9: bảng `search_logs` (từ khóa, số kết quả, thời điểm; không lưu user id) để thống kê |

## 4. Các bước triển khai (sau khi chốt)

| # | Việc | Nghiệm thu |
|---|---|---|
| S1 | `shared/search`: chuẩn hóa tiếng Việt, đồng nghĩa, xếp hạng, so màu + unit test | Test: "hoa la" ra Sakura/Lavender, "ip15 meo" ra mẫu mèo có máy iPhone 15, gõ sai một chữ vẫn ra |
| S2 | `core/search`: types, `SearchService`, token `SEARCH_SOURCES` | Không còn import `features/*` trong `core/search` |
| S3 | 3 nguồn: Shop, Design Studio, Order Tracking (Hỗ trợ + Đơn của tôi) | Mỗi nguồn trả về `SearchDoc` đúng link |
| S4 | Lớp phủ mới ở header (zero state, gợi ý theo nhóm, ảnh, tra mã, bàn phím, ARIA combobox) | Ctrl+K mở; ↑↓/Enter/Esc chạy; gõ `CC-…` mở đơn; 375/768/1280 không tràn |
| S5 | Trang `/tim-kiem` (tab, bộ lọc, sắp xếp, trạng thái trống, ảnh không cắt vuông) | URL giữ được trạng thái lọc; quay lại vẫn giữ kết quả |
| S6 | Gỡ các ô tìm trùng ở Shop và Design Studio, nối liên kết sang tìm kiếm chung; bỏ `OmniSearchState` | Cả site chỉ còn một ô tìm toàn cục; lọc tại chỗ vẫn chạy |
| S7 | Ghi nhận truy vấn (localStorage; M9 nếu team muốn) + mục "Tìm kiếm" trong Insights admin | Có danh sách từ khóa không ra kết quả |
| S8 | Build, test, chạy thử trên web, cập nhật README | |

Ước lượng: S1–S6 khoảng một lượt làm việc dài; S7 tùy chọn.

## 5. Cần team chốt

| # | Câu hỏi | Đề xuất |
|---|---|---|
| Q1 | Tên và người phụ trách function "Tìm kiếm" | "Tìm kiếm"; mình làm trên nhánh tích hợp |
| Q2 | Có gỡ ô tìm chữ trong Shop và ô "AI gợi ý mẫu" trong Design Studio không? | Gỡ, chỉ giữ bộ lọc tại chỗ; báo Mai Anh và Đức |
| Q3 | Có tìm cả "Hỗ trợ" và "Đơn của tôi" không? | Có (Casetify cũng gộp trang hỗ trợ vào gợi ý) |
| Q4 | Tra mã: chỉ gõ / dán mã, không quét camera? | Có (quét camera cần thêm thư viện và quyền camera) |
| Q5 | Ghi nhận truy vấn lên Supabase (M9)? | Lúc đầu chỉ dùng localStorage; M9 để sau |
| Q6 | Từ khóa phổ biến lấy ở đâu? | Danh sách cố định do team đặt (ví dụ: iPhone 16 Pro Max, Dẻo, Hoa lá, Mèo, Y2K, Typography), sau thay bằng thống kê từ S7 |
