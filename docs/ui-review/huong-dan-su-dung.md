# Hướng dẫn sử dụng – Quản lý đơn hàng & giao vận (CasEYE's)

Tài liệu này dành cho người chấm, người demo và thành viên team. Nó mô tả cách chạy web, từng màn hình và cách đi hết các luồng nghiệp vụ. Mọi bước dưới đây đã được chạy thử trên nhánh `feature/order-tracking` ngày 10/11/2026.

## 1. Hai phần của module

| Phần | Đường dẫn | Dành cho ai |
|---|---|---|
| Trang khách: danh sách đơn | `/order-tracking` | Khách hàng (sản phẩm thật) |
| Trang khách: chi tiết đơn | `/order-tracking/<mã đơn>` | Khách hàng |
| Trang khách: chính sách đơn hàng | `/order-tracking/chinh-sach` | Ai cũng mở được, không cần đăng nhập |
| Demo Console | `/order-tracking/demo?demo=1` | Người demo. Thay cho Thanh toán, Operator, CSKH, Admin, đơn vị vận chuyển và tiến trình nền chưa có |

Dữ liệu là dữ liệu giả, lưu trong trình duyệt (localStorage). Không có cổng thanh toán; hoàn tiền là Admin "chuyển khoản tay" và chỉ ghi lại mã tham chiếu.

## 2. Chạy web

```bash
npm ci
```

```bash
npm start
```

1. Mở `http://localhost:4200/order-tracking/demo?demo=1` **trước**. Tham số `?demo=1` bật chế độ demo và cho phép xem trang khách bằng một khách mẫu (Nguyễn Nhật Anh) mà không cần đăng nhập.
2. Mở thêm một tab `http://localhost:4200/order-tracking` (hoặc bấm "Mở trang khách ↗" trong Console).
3. Đặt hai tab cạnh nhau. Mọi thao tác ở Console hiện ngay ở tab khách, không cần tải lại.

Tắt chế độ demo: mở một trang bất kỳ của module với `?demo=0`. Khi đó trang khách yêu cầu đăng nhập như bình thường.

## 3. Demo Console

### 3.1 Vai trò giả (góc trên phải)

| Vai trò | Làm được gì |
|---|---|
| Operator | Duyệt / từ chối bản thiết kế, Chốt mẻ 16:00, đóng gói, đánh dấu in lại do lỗi QC |
| CSKH | Chấp nhận / từ chối yêu cầu hủy đơn; chọn kết quả khiếu nại (A in lại, B voucher, C hoàn 100%, D từ chối); đối soát nguyên nhân giao thất bại |
| Admin | Duyệt, từ chối, ghi nhận chuyển khoản hoàn tiền. Chỉ Admin thấy các nút về tiền |

Các nút webhook (đơn vị vận chuyển), job nền và đồng hồ dùng được ở mọi vai trò.

### 3.2 Đồng hồ giả lập

- Các nút `+30 phút`, `+1 giờ`, `+6 giờ`, `+1 ngày`, `+3 ngày`, `+7 ngày`, `+14 ngày` tua thời gian của cả hệ thống (cả tab khách).
- `Tới 16:00 hôm nay`: nhảy tới giờ chốt mẻ.
- `Về giờ thật`: bỏ tua.
- Tua giờ **không** tự chạy job. Sau khi tua, bấm job tương ứng ở mục "Tiến trình nền".

### 3.3 Tạo đơn mẫu

| Ô | Lựa chọn | Ghi chú |
|---|---|---|
| Loại đơn | Thiết kế theo yêu cầu (có ảnh / không ảnh), Chỉ hàng có sẵn, Hỗn hợp | Đơn có hàng thiết kế luôn bắt đầu ở "Đang kiểm tra thiết kế" |
| Thanh toán | Trả trước (QR), COD | COD chỉ chọn được với đơn toàn hàng có sẵn |
| Đặt cách đây | Vừa đặt … 26 giờ trước | Dùng để thử thời gian đổi ý của COD (30 phút, ẩn với khách) |
| Địa chỉ | Gần (1–2 ngày), Xa (3–5 ngày) | Số ngày vận chuyển là dữ liệu giả của Thanh toán |
| Gói giao | Standard, Hỏa tốc | Hỏa tốc chỉ cho đơn hàng có sẵn, địa chỉ gần |

Khung tím bên dưới cho xem trước ngày vào mẻ, khoảng xử lý và ngày giao dự kiến. Tick ô đồng ý chính sách rồi bấm **Tạo đơn**.

### 3.4 Danh sách đơn và thẻ thao tác

Bấm một đơn trong "Đơn hàng (n)" để mở thẻ thao tác của đơn đó. Thẻ gồm:

- Dòng nhãn nội bộ: thời gian đổi ý còn lại của COD, đang tạm giữ, hạn tự hoàn thành, hạn lưu kho, bên chịu lỗi, đơn đã khép hay chưa.
- **Operator · xưởng in**: các nút theo trạng thái.
- **Mock 3PL · webhook**: `In_Transit`, `Delivered`, chọn nguyên nhân rồi `Delivery_Failed`, `Warehouse_Received`, và `↻ Gửi lại event trùng` để thử chống trùng.
- **CSKH · yêu cầu hủy đơn** và **CSKH · khiếu nại**: chỉ hiện khi đơn có yêu cầu đang mở.
- **Hoàn tiền · chỉ Admin xác nhận**: hiện khi đơn có khoản hoàn.
- **OrderStatusLog**: nhật ký đổi trạng thái đầy đủ.
- "Xem như khách ↗": mở đúng đơn đó ở trang khách.

### 3.5 Phần dưới của Console

- **Tiến trình nền (chạy tay)**: Job 1 (tự hoàn thành sau 72 giờ), Job 2 (hết hạn lưu kho 14 ngày), Job 3 (quá 7 ngày không sửa thiết kế), Job 4 (7 ngày chưa có tài khoản nhận hoàn), gửi lại hàng đợi sự kiện. Chạy lại nhiều lần không sao.
- **Giả lập sự cố liên module**: tick để một module "không phản hồi", mất mạng khi gửi sự cố, hoặc lỗi tải danh sách đơn.
- **Profile · chặn xóa tài khoản**: bấm `listOpenOrders` để xem các đơn chưa khép.
- **Hộp thư giả lập**, **Webhook đã nhận**, **Sự kiện đã gửi sang module khác**: để kiểm chứng.
- **Insights**: số liệu hành vi khách (bấm "Làm mới").
- **Xóa dữ liệu demo**: xóa toàn bộ đơn. Nên bấm kèm "Về giờ thật" trước mỗi buổi demo.

## 4. Trang khách

### 4.1 Đơn hàng của tôi

- Tab: Tất cả, Cần xử lý, Chờ xác nhận, Đang in, Đang giao, Hoàn thành, Đã hủy & hoàn tiền. Tab đang chọn nằm trên URL (`?tab=`).
- Ô tìm kiếm theo mã đơn hoặc tên mẫu, không phân biệt dấu.
- Chuông thông báo ở góc phải.
- Mỗi thẻ đơn có một nút chính theo trạng thái (Xem đơn hàng, Chỉnh sửa thiết kế, Chọn cách giao lại, Đã nhận được hàng, Mua lại).

### 4.2 Chi tiết đơn

- Cột trái: banner "Bạn cần làm gì?" (chỉ khi cần), mã đơn và trạng thái, ngày giao dự kiến kèm "Vì sao?", thanh tiến trình (4 mốc với hàng có sẵn, 5 mốc khi có hàng thiết kế), sản phẩm và bản thiết kế (bấm ảnh để phóng to), địa chỉ, lịch sử đơn.
- Cột phải: Thanh toán, Tiến độ hoàn tiền (khi có), Hỗ trợ đơn hàng. Mọi nút hủy, báo sự cố, xác nhận nhận hàng nằm ở khối "Hỗ trợ đơn hàng".
- Trên điện thoại cột phải nằm dưới cùng; nút chính được ghim ở đáy màn hình.

Nút khách thấy theo trạng thái:

| Trạng thái khách thấy | Nút |
|---|---|
| Chờ xác nhận (COD, còn trong thời gian đổi ý) | Hủy đơn |
| Đã xác nhận (COD) | Không có nút hủy |
| Đang kiểm tra thiết kế / Đã xác nhận (đơn trả trước) | Yêu cầu hủy đơn; khi đang chờ CSKH: Rút lại yêu cầu |
| Cần chỉnh sửa thiết kế | Chỉnh sửa thiết kế (tối đa 2 lần), Hủy đơn & nhận hoàn tiền |
| Đang in, Đã đóng gói, Đang giao | Không hủy được |
| Đã giao | Đã nhận được hàng, Hàng có vấn đề – Báo sự cố |
| Hoàn thành | Thẻ đánh giá, Báo sự cố (trong 7 ngày từ lúc giao) |
| Giao không thành công (hàng đã về kho) | Chọn cách giao lại, Hủy đơn & hoàn tiền (khi chính sách cho phép), Báo sự cố |
| Đã hủy / Đã hoàn tiền có khoản hoàn | Form chọn cách nhận hoàn trong khối "Tiến độ hoàn tiền" |

Lưu ý: hiện tại nút "Chỉnh sửa thiết kế" là mô phỏng, bấm là gửi lại thiết kế ngay và trừ một lượt.

## 5. Các kịch bản demo (làm theo từng bước)

Ký hiệu: **[C]** thao tác ở Console, **[K]** thao tác ở tab khách.

### KB1 – COD hủy trong thời gian đổi ý
1. [C] Tạo đơn: Chỉ hàng có sẵn, COD, Vừa đặt.
2. [K] Mở đơn → Hủy đơn → chọn lý do → Xác nhận hủy.
3. Kết quả: đơn "Đã hủy", không có khoản hoàn.

### KB2 – COD quá thời gian đổi ý
1. [C] Tạo đơn: Chỉ hàng có sẵn, COD, 35 phút trước (hoặc tạo "Vừa đặt" rồi bấm `+30 phút`).
2. [K] Mở đơn: nhãn "Đã xác nhận", không còn nút Hủy đơn, không có đồng hồ đếm ngược.
3. Thử xung đột: tạo đơn COD "29 phút trước", [K] mở pop-up hủy, [C] `+30 phút`, [K] bấm Xác nhận hủy → bị từ chối kèm thông báo.

### KB3 – Yêu cầu hủy đơn trả trước, CSKH chấp nhận, hoàn qua tài khoản
1. [C] Tạo đơn: Thiết kế theo yêu cầu, Trả trước.
2. [K] Yêu cầu hủy đơn → chọn lý do → Gửi. Thanh tiến trình mờ đi, khối "Yêu cầu hủy đơn" hiện phía trên.
3. [C] Vai trò CSKH → chọn đơn → Chấp nhận.
4. [K] Ở "Tiến độ hoàn tiền": nhập ngân hàng, số tài khoản, tên chủ tài khoản (phải trùng tên người thanh toán: NGUYEN NHAT ANH) → Lưu.
5. [C] Vai trò Admin → Duyệt → nhập `bankRef` → Đã chuyển.
6. [K] Thấy "Đã hoàn tiền" kèm mã giao dịch.

### KB4 – CSKH từ chối yêu cầu hủy
1. Làm bước 1–2 của KB3.
2. [C] Vai trò CSKH → nhập lý do từ chối (bắt buộc) → Từ chối.
3. [K] Thanh tiến trình sáng lại, có một dòng kết quả kèm lý do. Nếu CSKH trả lời sang ngày làm việc khác (trong hạn), ngày giao dự kiến lùi tương ứng.
4. Biến thể: [K] bấm "Rút lại yêu cầu" trước khi CSKH quyết định.

### KB5 – Thiết kế bị từ chối, khách hủy và nhận hoàn
1. [C] Tạo đơn thiết kế theo yêu cầu. Vai trò Operator → chọn nhóm vi phạm, nhập lý do → Từ chối.
2. [K] Đơn vào tab "Cần xử lý". Mở đơn → Hủy đơn & nhận hoàn tiền → chọn Chuyển khoản / Voucher 100% / Cung cấp sau → Xác nhận hủy.
3. [C] Vai trò Admin duyệt như KB3.
4. Biến thể "Cung cấp sau": [C] `+3 ngày` → Job 4 (nhắc) → `+7 ngày` → Job 4 (tự cấp voucher 100%).
5. Biến thể không phản hồi: không làm gì, [C] `+7 ngày` → Job 3 → đơn tự hủy, tạo khoản hoàn 100%.

### KB6 – Hỏa tốc COD trước và sau 14:00
1. [C] Khi đồng hồ trước 13:30 ngày làm việc: tạo đơn Chỉ hàng có sẵn, COD, Gần, Hỏa tốc → xem trước ghi "Giao … (trong ngày)".
2. [C] `Tới 16:00 hôm nay` → tạo đơn giống vậy → "Giao … (ngày làm việc kế tiếp)".
3. [K] Mở từng đơn để xem "Giao trong hôm nay" và "Giao ngày làm việc kế tiếp".
4. Lưu ý: đơn COD tính giờ xác nhận từ lúc hết thời gian đổi ý, nên đơn COD đặt sau 13:30 đã tính là sau 14:00.

### KB7 – Giao thất bại rồi giao lại
1. [C] Tạo đơn hàng có sẵn trả trước → Operator: Đóng gói xong → webhook `In_Transit` → chọn "Khách không nghe máy" → `Delivery_Failed` → `Warehouse_Received`.
2. [K] Banner "Chọn cách giao lại" → xác nhận địa chỉ → tick "Tôi đã chuyển khoản" (QR minh họa) → Xác nhận giao lại. Đơn về "Đã đóng gói" với ngày giao mới.
3. [C] `In_Transit` → `Delivered`.
4. Biến thể:
   - Nguyên nhân do vận chuyển/shop: giao lại miễn phí, hoặc khách chọn hủy và hoàn 100%.
   - Giao lại lần 2 vẫn thất bại (`Delivery_Failed` → `Warehouse_Received`): đơn tự đóng, hoàn theo chính sách (hàng có sẵn trả trước: tiền hàng trừ cước hai chiều; hàng thiết kế lỗi khách: không hoàn).
   - COD hàng có sẵn, lỗi khách: đơn đóng ngay khi hàng về kho.
   - Quá hạn lưu kho: `+14 ngày` → Job 2.
   - Khách không đồng ý nguyên nhân: [K] Báo sự cố → [C] CSKH chọn "Khách đúng" hoặc "Khách sai".

### KB8 – Đã giao, báo sự cố, đánh giá
1. [C] Đưa một đơn tới `Delivered`.
2. [K] Hàng có vấn đề – Báo sự cố → chọn loại, mô tả (ít nhất 10 ký tự), đính kèm ảnh nếu loại yêu cầu → Gửi. Đơn chuyển "Đang xử lý yêu cầu hỗ trợ".
3. [C] Vai trò CSKH → chọn A / B / C / D (D bắt buộc ghi lý do).
4. [K] Nếu đơn quay về "Đã giao": bấm Đã nhận được hàng → Xác nhận → chấm sao và gửi đánh giá.
5. Tự hoàn thành: không bấm gì, [C] `+3 ngày` → Job 1. Thời gian đơn bị treo vì khiếu nại được cộng bù.

### Thử thêm
- Webhook sai thứ tự: bấm `Delivered` khi đơn chưa `In_Transit` → bị từ chối, có ghi ở "Webhook đã nhận".
- Chuyển khoản hoàn lỗi: Admin → Duyệt → "Chuyển khoản lỗi" → "Thử chuyển lại" → lỗi lần nữa thì sang xử lý thủ công → nhập `bankRef` → Đã chuyển.
- Module khác lỗi: tick "Loyalty không phản hồi" → cho khách xác nhận nhận hàng → đơn vẫn hoàn thành, sự kiện nằm ở hàng đợi → bỏ tick → "Gửi lại hàng đợi sự kiện".
- Giao trễ: tua qua ngày giao dự kiến muộn nhất rồi mới bấm `Delivered` → chi tiết đơn có voucher giao trễ.

## 6. Mẹo khi demo

- Chốt mẻ chỉ bấm được từ 16:00 các ngày Thứ 2 – Thứ 6. Đơn thiết kế phải được duyệt trước 16:00 mới vào mẻ hôm đó.
- Đơn đang có yêu cầu hủy chờ CSKH bị tạm giữ: Operator không duyệt, không chốt mẻ, không đóng gói được.
- Đồng hồ đã tua thì giữ nguyên cho tới khi bấm "Về giờ thật", kể cả khi tải lại trang.
- Muốn làm lại từ đầu: "Xóa dữ liệu demo" + "Về giờ thật".
- Dữ liệu nằm trong localStorage của trình duyệt (khóa `casecraft.ot.db.v2`), nên mỗi trình duyệt có bộ đơn riêng.
