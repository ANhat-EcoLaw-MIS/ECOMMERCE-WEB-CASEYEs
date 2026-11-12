# Script họp team – Quản lý đơn hàng & giao vận (Thy)

Phần của mình chiếm khoảng 5 phút ở mục BPMN và 5–7 phút ở mục trình chiếu. Chữ in nghiêng trong ngoặc là thao tác, không đọc ra.

---

## 0. Chuẩn bị trước giờ họp (10 phút)

1. Mở terminal ở thư mục repo, kiểm tra đang đứng đúng nhánh:
   ```bash
   git branch --show-current
   ```
   Phải ra `feature/order-tracking`. Nếu không, chạy `git checkout feature/order-tracking`.
2. Chạy web:
   ```bash
   npm start
   ```
   Đợi tới khi terminal báo `Local: http://localhost:4200/`.
3. Mở Chrome, **tab 1**: `http://localhost:4200/order-tracking/demo?demo=1` (Demo Console). Bắt buộc mở tab này trước vì `?demo=1` mới bật chế độ demo.
4. Bấm **"Xóa dữ liệu demo"** ở cuối Console để bắt đầu sạch, rồi tạo sẵn 3 đơn ở mục **"Tạo đơn mẫu"**:
   - Đơn A: hàng có sẵn, **COD**, "Đặt cách đây" 5 phút (để demo hủy).
   - Đơn B: **thiết kế theo yêu cầu**, Trả trước (QR) (để demo duyệt thiết kế và yêu cầu hủy).
   - Đơn C: hàng có sẵn, Trả trước, gói Standard (để demo giao hàng).
   Lần nào tạo đơn cũng phải tick ô đồng ý chính sách thì nút "Tạo đơn" mới bấm được.
5. **Tab 2**: `http://localhost:4200/order-tracking` (trang khách). Đặt 2 tab cạnh nhau: thao tác ở Console thì tab khách tự đổi theo, không cần F5.
6. Mở sẵn VS Code ở thư mục `src/app/features/order-tracking/` để chuyển qua khi trình chiếu code.
7. Share màn hình **cả cửa sổ trình duyệt**, không share riêng 1 tab.

Lỡ web lỗi lúc đang chiếu: bấm "Xóa dữ liệu demo" rồi tạo lại đơn. Nếu vẫn lỗi thì tắt terminal (Ctrl+C) và chạy lại `npm start`.

---

## 1. BPMN – luồng đơn hàng (~5 phút)

**Mở đầu (15 giây)**
"Phần của mình là Quản lý đơn hàng và giao vận. Mình nhận đơn từ lúc bạn Thanh toán bấm đặt hàng xong, và theo nó tới khi khách nhận hàng, hủy, hoặc được hoàn tiền."

**Điểm nối với các bạn (30 giây)**
"Mình có 4 điểm nối với module khác:
- **Thanh toán** gửi sang một gói dữ liệu tên là `OrderHandoff`, gồm sản phẩm, địa chỉ, cách thanh toán (COD hoặc chuyển khoản QR), phí ship và số ngày vận chuyển, cùng phiên bản chính sách khách đã tick đồng ý. Phí ship do Thanh toán tính, mình chỉ lưu lại.
- **Design Studio** gửi ảnh bản thiết kế, để nhân viên duyệt và để khách xem lại.
- **CSKH** xử lý yêu cầu hủy và khiếu nại.
- **Đơn vị vận chuyển** báo trạng thái giao về cho mình qua webhook."

**Luồng chính (2 phút)** *(chỉ vào sơ đồ BPMN)*
"Đơn chia làm 2 loại:
1. **Hàng có sẵn**: vào trạng thái *Chờ xác nhận*. Đơn COD có 30 phút đổi ý, trong 30 phút đó khách tự hủy được. Mình không hiện đồng hồ đếm ngược để khách khỏi bị hối thúc.
2. **Hàng thiết kế theo yêu cầu**: vào *Chờ duyệt thiết kế*. Nhân viên xưởng duyệt bản thiết kế. Duyệt thì đơn qua *Chờ xác nhận*; từ chối thì đơn qua *Cần xử lý*, khách sửa rồi gửi lại hoặc hủy và được hoàn tiền.

Sau đó hai loại đi chung một đường: 16 giờ mỗi ngày chốt mẻ → *Đang sản xuất* → *Chờ lấy hàng* → *Đang giao* → *Đã giao*. Sau khi giao, khách có 72 giờ để báo sự cố; hết 72 giờ thì đơn *Hoàn tất*."

**Nhánh ngoại lệ (1 phút)**
- "**Hủy đơn trả trước**: khách không tự hủy được mà phải gửi *yêu cầu hủy*. Trong lúc chờ, đơn bị tạm giữ. CSKH quyết trong 1 ngày làm việc. Chấp nhận thì đơn hủy và tạo yêu cầu hoàn tiền. Từ chối thì đơn chạy tiếp, ngày giao được lùi đúng số ngày đã giữ.
- **Giao thất bại**: hàng về kho, giữ 14 ngày. Khách được chọn giao lại 1 lần, hoặc hủy và hoàn tiền.
- **Hoàn tiền**: không bao giờ tự động. Chỉ Admin được duyệt và ghi nhận đã chuyển khoản."

**Ngày giao dự kiến (30 giây)**
"Ngày giao dự kiến bằng ngày chốt mẻ, cộng thời gian xử lý (hàng có sẵn 1–2 ngày, hàng thiết kế 2–3 ngày làm việc), cộng số ngày vận chuyển từ Thanh toán. Gói Hỏa tốc chỉ áp dụng cho hàng có sẵn, giờ chốt là 14 giờ. Giao trễ thì khách được voucher 10%, tối đa 30 nghìn."

**Chốt (10 giây)**
"Tổng cộng có 12 trạng thái, cái nào đi qua cái nào thì nằm hết trong một file. Lát nữa trình chiếu code mình chỉ file đó. Mình xong rồi, mọi người hỏi nha."

### Câu hỏi dễ bị hỏi (trả lời mỗi câu dưới 30 giây)
| Câu hỏi | Trả lời |
|---|---|
| Sao COD được tự hủy còn trả trước thì không? | Trả trước thì tiền đã vào shop, hủy là phải hoàn tiền, nên cần người duyệt. COD chưa thu tiền nên cho đổi ý trong 30 phút. |
| Bảng `orders` của team chỉ có 5 trạng thái, của bạn tới 12? | Đúng, đây là chỗ cần chốt. Mình đề xuất hai cách: (1) mở rộng enum lên 12; (2) giữ 5 trạng thái lớn, thêm một cột trạng thái chi tiết. Mình nghiêng về cách 2 vì ít ảnh hưởng code của các bạn. |
| Data hiện lấy ở đâu? | Đang là dữ liệu giả lưu trong localStorage, nằm sau một lớp repository. Khi nối Supabase chỉ cần viết thêm một repository, không phải sửa giao diện. |
| Hoàn tiền có qua cổng thanh toán không? | Không. Admin chuyển khoản tay rồi nhập mã giao dịch vào hệ thống. |
| Mình (Thanh toán) cần đưa gì cho bạn? | Gói `OrderHandoff`, đặc biệt là phần `shipping` (phí, phí Standard, phụ phí Hỏa tốc, số ngày vận chuyển), cùng phiên bản chính sách khách đã đồng ý. |

---

## 2. Trình chiếu giao diện + source code (~5–7 phút)

### 2a. Giao diện (3 phút)
*(Tab khách)* "Đây là trang **Đơn hàng của tôi**. Có các tab theo trạng thái, tab *Cần xử lý* có chấm đỏ. Có ô tìm theo mã đơn hoặc tên mẫu, gõ không dấu cũng tìm được."

*(Bấm vào Đơn A)* "Trang chi tiết trả lời 4 câu hỏi: đơn đang ở đâu, bao giờ tới, mình cần làm gì, có vấn đề thì hỏi ai. Đơn này COD nên còn nút Hủy." *(Bấm Hủy → chọn lý do → xác nhận. Nút chính là "Giữ đơn" để khách không lỡ tay hủy.)*

*(Tab Console, vai Operator)* "Bên Console mình đóng vai nhân viên. Mình từ chối bản thiết kế của Đơn B…" *(bấm từ chối)* "…và bên tab khách, đơn B nhảy liền sang *Cần xử lý*, có banner 'Bạn cần làm gì?'."

*(Console, Đơn C)* "Mình tua giờ, chạy chốt mẻ, rồi bấm webhook giao hàng." *(Đồng hồ giả lập → Chốt mẻ → Đóng gói → webhook Đã giao)* "Tab khách hiện ngày giao thực tế, nút 'Đã nhận được hàng' và 'Báo sự cố'."

*(Mở `localhost:4200/order-tracking/chinh-sach`)* "Đây là trang **Chính sách đơn hàng**. Bạn Giỏ hàng và Thanh toán chỉ cần gắn `routerLink` tới trang này, cách gắn mình ghi trong `docs/order-policy-links.md`."

"Demo Console chỉ để demo, khách không bao giờ thấy, phải gõ `?demo=1` mới vào được. Nó đóng vai thay những phần chưa có: Thanh toán, Operator, CSKH, Admin, vận chuyển và các tác vụ chạy nền."

### 2b. Source code + data nằm ở đâu (3 phút)
*(VS Code, mở thư mục `src/app/features/order-tracking/`)*

| Thư mục / file | Nói gì |
|---|---|
| `order-tracking.routes.ts` | 4 trang: danh sách, chi tiết `/:orderCode`, chính sách `/chinh-sach`, Console `/demo`. |
| `models/order-tracking.model.ts` | Kiểu dữ liệu `Order`, 12 trạng thái. `models/order-handoff.model.ts` là "hợp đồng" với Thanh toán. |
| `domain/state-machine.ts` | **Luồng BPMN nằm ở đây**: trạng thái nào được đi sang trạng thái nào. |
| `domain/edd.ts` | Tính ngày giao dự kiến. `domain/order-rules.ts`: luật hủy, hoàn tiền, voucher. |
| `services/order-tracking.service.ts` | Mọi thao tác (hủy, duyệt, hoàn tiền…), có kiểm tra vai trò. |
| `services/order.repository.ts` | **Data nằm ở đây**: hiện là localStorage, key `casecraft.ot.db.v2`. Sau này đổi sang Supabase chỉ cần thay class này. |
| `services/scheduled-jobs.ts` | Các tác vụ chạy nền (hết hạn, tự hoàn tất…), trong demo thì bấm tay. |
| `config/` | Giờ chốt mẻ, 30 phút COD, nội dung chính sách, màu trạng thái. Muốn đổi số liệu thì sửa ở đây. |
| `components/` | Các mảnh UI: timeline, thẻ đơn, pop-up hủy, form hoàn tiền… |
| `*.spec.ts` | 70 test, chạy bằng `npx ng test --watch=false --include="src/app/features/order-tracking/**/*.spec.ts"`. |

*(Tùy chọn, F12 → Application → Local Storage → localhost:4200)* "Đây là data thật đang nằm trong trình duyệt."

Cho mọi người xem: "Mình chỉ code trong thư mục này, không sửa file của ai, và không import từ feature khác."

### 2c. Làm tới đâu (theo yêu cầu của Nhật, 1 phút)
**Đã xong:** giao diện khách (danh sách, chi tiết, chính sách), toàn bộ luồng nghiệp vụ v8, Demo Console, 70 test pass, ảnh chụp giao diện 3 kích thước màn hình.

**Chưa xong, cần team:**
1. **Bảng `orders` trên Supabase** chỉ có 5 trạng thái, chưa có các cột ngày giao dự kiến, gói giao, yêu cầu hủy, hoàn tiền. Cần chốt cách làm (xem câu hỏi ở mục 1).
2. **Header**: chấm đỏ "Đơn hàng của tôi" và chuông thông báo cần một service đặt ở `core/`. Đó là layout chung nên mình không tự sửa.
3. **Thanh toán**: cần gửi `OrderHandoff` và dùng ô đồng ý chính sách. Component này phải chuyển sang `shared/` thì bạn mới import được.
4. **Design Studio, Shop**: các nút "Chỉnh sửa thiết kế" và "Mua lại" đang trỏ sang trang của các bạn, mà các trang đó hiện còn trống.

**Kế tiếp:** sau khi chốt bảng `orders`, mình viết repository nối Supabase và đổi `OrderRepository` sang Supabase.

---

## 3. Hẹn ngày cuối tuần
Đề xuất của mình: buổi đó ưu tiên **merge các nhánh vào `develop` và chạy thử luồng Thanh toán → Đơn hàng**, vì đó là chỗ dễ vỡ nhất.

---

## Nếu bạn khác muốn tự mở module trên máy họ
```bash
git fetch origin
```
```bash
git checkout feature/order-tracking
```
```bash
npm ci
```
```bash
npm start
```
Sau đó mở `http://localhost:4200/order-tracking/demo?demo=1` trước, rồi mở `/order-tracking`. Hướng dẫn chi tiết từng màn hình nằm ở `docs/ui-review/huong-dan-su-dung.md`.

Lưu ý: trên GitHub nhánh đang ở commit `0bc728d`. Bản kéo develop về (`69e2773`) mới chỉ có ở máy mình. Máy khác vẫn chạy được, chỉ là chưa có code mới của develop.
