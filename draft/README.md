# Bản Thiết Kế Giao Diện Mẫu (Draft UI) - Order Tracking (CasEYE's)

Thư mục này chứa bản thiết kế giao diện mẫu (Interactive Prototype Draft) cho phân hệ **Order Tracking (Theo dõi đơn hàng)** của dự án **CasEYE's**.

---

## 1. Trải nghiệm UX Shopee-Style (Đồng bộ tài khoản người dùng)
Theo phản hồi thực tế của khách hàng: Khi người dùng đã đăng nhập vào tài khoản CasEYE's, **họ KHÔNG CẦN nhớ hay gõ mã đơn hàng**.
- **Màn hình "Đơn Mua Của Tôi" (My Purchases):**
  - Header đồng bộ thông tin tài khoản: Tên khách hàng (Nguyễn Nhật Anh), VIP Crown badge, Điểm thưởng Loyalty (420 điểm), thống kê đơn hàng đang xử lý.
  - **Thanh Tab phân loại trạng thái chuẩn Shopee (Sticky Status Tabs):**
    - `Tất cả`
    - `Chờ xác nhận` (Pending - Đếm ngược 30 phút cửa sổ hủy)
    - `Đang in ấn UV` (In_Production - Xưởng in CasEYE's đang làm)
    - `Đóng gói xong` (Ready_for_Pickup - Chờ GHN lấy hàng)
    - `Đã giao` (Delivered - Chờ khách bấm "Đã nhận được hàng")
    - `Giao thất bại` (Delivery_Failed - Đếm ngược 14 ngày lưu kho)
  - Thanh tìm kiếm nhanh theo tên sản phẩm, dòng máy (iPhone/Samsung) hoặc mã đơn.
  - Mỗi đơn hàng được hiển thị dưới dạng **Order Card** trực quan: Tên sản phẩm, thumbnail mockup ốp lưng, tổng tiền, trạng thái tóm tắt, và các nút thao tác nhanh.
- **Chuyển đổi sang Chi tiết đơn hàng (Order Detail View):**
  - Khách bấm **"Xem chi tiết đơn"** ➔ Mở màn hình Timeline chi tiết (Adaptive 5 mốc khi có ốp Custom, 4 mốc khi chỉ có phụ kiện).
  - Có nút **`‹ Quay lại danh sách đơn mua`** tiện lợi ở đầu trang giúp quay lại danh sách chỉ với 1 click.

---

## 2. Kiến trúc Lưu trữ Dữ liệu theo Luồng của Team (Data Flow Architecture)

### 📌 Thao tác trên web hiện tại đang lưu ở đâu?
- **Trên bản Prototype/Draft hiện tại:** Dữ liệu đang được lưu trữ tại **Reactive State (In-Memory)** của trình duyệt. Mọi hành động (chuyển kịch bản, bấm hủy đơn, đánh giá 5 sao, gửi khiếu nại, giả lập webhook 3PL) sẽ cập nhật state ngay lập tức mà không làm mất dữ liệu khi chuyển qua lại giữa các view.

### 📌 Khi nối vào hệ thống thực của Team, dữ liệu sẽ lưu vào đâu?
Dựa theo tài liệu đặc tả (BRD, SRD, BPMN, Class Diagram trang 33) và kiến trúc **Supabase** của dự án:

1. **Hình ảnh/Video bằng chứng khiếu nại (Evidence Files):**
   - Được upload lên **Supabase Storage** (Bucket: `complaint-evidences` hoặc `ticket-attachments`).
   - Đường dẫn file lưu trữ có cấu trúc: `orders/{order_id}/tickets/{timestamp}_{filename}.webp`.
   - Supabase Storage sẽ trả về Public URL hoặc Signed URL để lưu vào cơ sở dữ liệu.

2. **Dữ liệu Phiếu Khiếu nại (Ticket Record):**
   - Theo phân rã kiến trúc của dự án, khi khách bấm gửi báo sự cố (UC-OT-04):
     - Hệ thống khởi tạo một bản ghi tại bảng `return_requests` (hoặc `support_tickets` thuộc **Epic 6: CSKH**).
     - Lưu trữ các trường: `order_id`, `issue_type` (Lỗi in / Sai mẫu / Hư hỏng...), `description`, `evidence_urls` (mảng chứa các URL ảnh bằng chứng từ Supabase Storage), `status: 'Pending_Review'`.

3. **Cập nhật Vòng đời Đơn hàng & Nhật ký Lưu vết (Audit Trail):**
   - Bảng `orders`: Trạng thái đơn được chuyển sang `Return_Requested` (đồng thời đóng băng bộ đếm 72h tự hoàn thành).
   - Bảng `order_status_logs`: Ghi lại dòng log audit bắt buộc gồm: `order_id`, `old_status`, `new_status: 'Return_Requested'`, `actor: 'Khách hàng'`, `reason: Gửi khiếu nại mã #TK-XXXX`.

4. **Khi Admin/Xưởng duyệt khiếu nại (UC-OT-08):**
   - **Phương án in lại miễn phí:** Trạng thái chuyển về `In_Production`, cộng 1-2 ngày vào EDD.
   - **Phương án hoàn tiền 100%:** Trạng thái chuyển về `Refunded`, hệ thống tự động bắn Event sang **Payment Module** để hoàn tiền qua cổng thanh toán.

---

## 3. Cách mở và xem bản Draft mới
- Mở trực tiếp file `draft/order-tracking-draft.html` trên trình duyệt (hoặc chạy lệnh mở trên máy).
- Thử bấm lọc các Tab Shopee: *Tất cả*, *Đang in ấn UV*, *Đã giao*, *Giao thất bại*.
- Bấm **"Xem chi tiết đơn"** ở một đơn bất kỳ để vào xem Timeline, sau đó bấm **"‹ Quay lại danh sách đơn mua"** để trở về danh sách.
