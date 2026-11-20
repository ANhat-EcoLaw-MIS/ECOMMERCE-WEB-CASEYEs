# TÀI LIỆU BÀN GIAO DEV – CÁC VẤN ĐỀ CẦN ĐIỀU CHỈNH TẠI CHECKOUT CASEEYE'S

**Loại tài liệu:** Bug report / yêu cầu cải tiến  
**Phạm vi:** Trang Checkout và màn hình đặt hàng thành công  
**Người bàn giao:** QA  
**Ngày ghi nhận:** 18/11/2026  
**Mức độ ưu tiên đề xuất:** P1 – các vấn đề ảnh hưởng đến tính chính xác của thông tin đơn hàng và trải nghiệm mua hàng

---

## 1. Tổng quan

Trong quá trình kiểm thử chức năng checkout của website CaseEYE's, QA ghi nhận các vấn đề liên quan đến dữ liệu người nhận, phương thức và phí vận chuyển, nội dung xác nhận đơn hàng, điều hướng sau khi đặt hàng và hiển thị hình ảnh sản phẩm.

Đề nghị Dev kiểm tra và điều chỉnh theo mô tả dưới đây. Các nội dung được ghi nhận từ giao diện kiểm thử và đối chiếu thêm với mã nguồn checkout được cung cấp.

## 2. Danh sách vấn đề

### BUG-01 – Thông tin giao nhận hàng chưa liên kết với thông tin tài khoản

- **Màn hình:** Checkout → Thông tin giao nhận hàng.
- **Hiện trạng:** Thông tin người nhận (họ tên, số điện thoại, địa chỉ) đang hiển thị một bộ dữ liệu cố định, không phản ánh thông tin trong trang cá nhân của tài khoản đang đăng nhập.
- **Mong muốn:** Khi người dùng vào checkout, hệ thống tự động lấy thông tin giao nhận từ hồ sơ/tài khoản tương ứng. Nếu tài khoản có địa chỉ mặc định, ưu tiên hiển thị địa chỉ đó.
- **Yêu cầu xử lý:**
  1. Lấy dữ liệu người dùng đang đăng nhập từ nguồn dữ liệu tài khoản/hồ sơ.
  2. Đồng bộ họ tên, số điện thoại và địa chỉ giao hàng vào checkout.
  3. Khi người dùng thay đổi địa chỉ tại checkout, cần xác định rõ thay đổi chỉ áp dụng cho đơn hiện tại hay đồng bộ ngược về trang cá nhân theo nghiệp vụ sản phẩm.
  4. Có trạng thái xử lý khi tài khoản chưa có thông tin hoặc chưa thiết lập địa chỉ; không hiển thị dữ liệu mẫu như dữ liệu thật.
- **Tiêu chí nghiệm thu:**
  - Đăng nhập bằng hai tài khoản có thông tin khác nhau thì checkout hiển thị đúng thông tin của từng tài khoản.
  - Thay đổi địa chỉ mặc định trong hồ sơ và tải lại checkout thì dữ liệu được cập nhật theo quy tắc đồng bộ.
  - Không còn hiển thị thông tin người nhận hard-code khi đã có dữ liệu tài khoản.

### BUG-02 – Số lượng phương thức vận chuyển khả dụng đang hiển thị cố định

- **Màn hình:** Checkout → Phương thức vận chuyển.
- **Hiện trạng:** Nhãn đang hiển thị cố định **“1 khả dụng”**. Khi có hai phương thức cùng khả dụng, con số vẫn không thay đổi.
- **Mong muốn:** Số lượng phải được tính động dựa trên số phương thức có trạng thái khả dụng tại thời điểm hiển thị.
- **Yêu cầu xử lý:** Thay nội dung hard-code bằng phép đếm các phương thức có `available = true` (hoặc trạng thái tương đương từ API).
- **Tiêu chí nghiệm thu:**
  - Có 1 phương thức khả dụng → hiển thị “1 khả dụng”.
  - Có 2 phương thức khả dụng → hiển thị “2 khả dụng”.
  - Không có phương thức khả dụng → hiển thị trạng thái phù hợp, không hiển thị sai số lượng.
  - Khi giỏ hàng thay đổi khiến trạng thái phương thức vận chuyển thay đổi, số lượng được cập nhật tương ứng.

### BUG-03 – Phí vận chuyển chưa thay đổi theo địa chỉ nhận hàng

- **Màn hình:** Checkout → Phương thức vận chuyển và phần tổng kết chi phí.
- **Hiện trạng:** Phí vận chuyển đang giữ cùng một mức dù địa chỉ giao hàng khác nhau. Ví dụ: địa chỉ shop ở TP. Hồ Chí Minh, nhưng giao trong TP. Hồ Chí Minh và giao ra Hà Nội vẫn có cùng phí ship.
- **Mong muốn:** Phí vận chuyển được xác định dựa trên địa chỉ gửi hàng, địa chỉ nhận hàng và phương thức vận chuyển được chọn.
- **Yêu cầu xử lý:**
  1. Xác định địa chỉ/kho gửi hàng của shop.
  2. Lấy địa chỉ nhận hàng đã chọn tại checkout.
  3. Tính phí theo khu vực hoặc tích hợp đơn vị vận chuyển/API tính phí phù hợp với nghiệp vụ thực tế.
  4. Cập nhật đồng bộ phí ở lựa chọn phương thức vận chuyển, phần chi tiết đơn hàng và tổng thanh toán.
  5. Tính lại phí khi người dùng thay đổi địa chỉ hoặc phương thức vận chuyển.
- **Tiêu chí nghiệm thu:**
  - Thử ít nhất hai địa chỉ nhận thuộc hai khu vực khác nhau (ví dụ TP. Hồ Chí Minh và Hà Nội); phí được trả về/tính theo quy tắc vận chuyển đã cấu hình, không mặc định bằng nhau.
  - Đổi địa chỉ nhận hàng thì phí ship và tổng tiền cập nhật chính xác.
  - Phí vận chuyển được lưu đúng vào đơn hàng và hiển thị nhất quán ở màn hình thành công.
- **Lưu ý:** QA chưa cung cấp bảng giá vận chuyển cụ thể. Dev/BA cần xác nhận bảng giá, khu vực, phụ phí và nguồn tính phí trước khi triển khai; không tự đặt mức phí.

### BUG-04 – Nội dung xác nhận đơn hàng đang gắn cố định với sản phẩm “bespoke”

- **Màn hình:** Đặt hàng thành công.
- **Hiện trạng:** Dòng thông báo đang là **“Đơn hàng bespoke đã được xác nhận tự động”** cho tất cả đơn hàng, kể cả khi sản phẩm trong đơn không phải bespoke.
- **Mong muốn:** Thay nội dung thành:

  **“Đơn hàng đã được xác nhận tự động”**

- **Yêu cầu xử lý:** Bỏ từ “bespoke” khỏi nội dung thông báo cố định. Thông báo xác nhận cần dùng chung cho mọi loại đơn hàng.
- **Tiêu chí nghiệm thu:**
  - Đặt đơn chỉ có sản phẩm có sẵn: hiển thị đúng câu mới.
  - Đặt đơn có sản phẩm custom/bespoke: cũng hiển thị đúng câu mới.
  - Không còn trường hợp thông báo mặc định gắn loại sản phẩm không đúng với đơn hàng.

### BUG-05 – Nút “Tiếp tục mua sắm” điều hướng chưa đúng

- **Màn hình:** Đặt hàng thành công → Tóm tắt đơn hàng.
- **Hiện trạng:** Khi nhấn **“Tiếp tục mua sắm”**, giao diện hiện tại chưa đưa người dùng quay về giỏ hàng theo mong muốn; luồng hiện tại vẫn chuyển về bước form checkout.
- **Mong muốn:** Khi nhấn nút, điều hướng người dùng về **trang giỏ hàng** để tiếp tục xem/chỉnh sửa giỏ và mua sắm.
- **Yêu cầu xử lý:**
  1. Điều chỉnh hành động của nút “Tiếp tục mua sắm” để điều hướng đến route giỏ hàng thực tế của website.
  2. Không gọi lại luồng tạo đơn mới hoặc đưa người dùng quay lại form checkout.
  3. Đảm bảo đơn hàng vừa đặt vẫn được lưu thành công và không bị tạo trùng khi người dùng quay lại giỏ hàng.
- **Tiêu chí nghiệm thu:**
  - Nhấn “Tiếp tục mua sắm” → mở đúng trang giỏ hàng.
  - Không tự động tạo thêm đơn hàng.
  - Thông tin đơn vừa đặt vẫn tồn tại trong lịch sử/theo dõi đơn hàng.
- **Lưu ý kỹ thuật:** Trong mã nguồn hiện tại, `onNewOrder()` đang gọi `createNewOrder()` và `setStep('form')`. Cần rà soát event được bind cho nút “Tiếp tục mua sắm” và tách hành vi này khỏi nút “Đặt thêm đơn hàng khác” nếu hai nút có mục đích khác nhau.

### BUG-06 – Hình ảnh sản phẩm trong các màn hình đơn hàng hiển thị chưa chính xác

- **Màn hình:** Checkout và các khu vực hiển thị tóm tắt đơn hàng.
- **Hiện trạng ghi nhận:** Ảnh sản phẩm trong phần tóm tắt đơn hàng có trường hợp không tải được/hiển thị ảnh lỗi (ảnh minh họa trong screenshot checkout).
- **Mong muốn:** Hình ảnh của từng sản phẩm phải hiển thị đúng, nhất quán giữa giỏ hàng, checkout và màn hình đặt hàng thành công.
- **Yêu cầu xử lý đề xuất:**
  1. Kiểm tra nguồn `imageUrl` của từng sản phẩm khi dữ liệu được đưa từ giỏ hàng sang checkout.
  2. Kiểm tra URL ảnh, đường dẫn tương đối, quyền truy cập và việc ảnh có tồn tại trên môi trường triển khai.
  3. Với sản phẩm custom, cần sử dụng đúng ảnh preview/snapshot của thiết kế; với sản phẩm có sẵn, sử dụng ảnh sản phẩm tương ứng.
  4. Có ảnh fallback hợp lệ khi ảnh chính không tồn tại, tránh hiển thị biểu tượng ảnh lỗi và alt text thay thế.
  5. Đảm bảo ảnh được lưu/đính kèm vào snapshot đơn hàng để màn hình thành công vẫn hiển thị đúng sau khi đặt hàng.
- **Tiêu chí nghiệm thu:**
  - Ảnh sản phẩm tải thành công ở giỏ hàng, checkout và màn hình thành công.
  - Ảnh đúng với từng SKU/thiết kế, không dùng chung một ảnh mặc định sai sản phẩm.
  - Khi URL ảnh không hợp lệ, giao diện hiển thị ảnh fallback có chủ đích.
- **Cần xác nhận thêm:** QA ghi nhận hiện tượng ảnh lỗi ở phần tóm tắt đơn hàng. Nếu vấn đề còn xuất hiện ở vị trí/màn hình khác, cần bổ sung screenshot hoặc mã sản phẩm tương ứng để Dev tái hiện chính xác.

---

## 3. Gợi ý kiểm tra kỹ thuật từ mã nguồn checkout được bàn giao

Các vị trí dưới đây là đầu mối để Dev kiểm tra, không phải kết luận rằng toàn bộ lỗi chỉ nằm tại các file này.

| Hạng mục | Vị trí/logic đang thấy trong source | Hướng kiểm tra |
|---|---|---|
| Thông tin giao nhận | `checkout/services/checkout.service.ts` – `address` được khởi tạo bằng dữ liệu cụ thể | Thay dữ liệu khởi tạo mẫu bằng dữ liệu lấy từ account/profile service; xử lý loading và trường hợp chưa có địa chỉ |
| Số phương thức khả dụng | `checkout/components/form/checkout-form.html` – nhãn “1 khả dụng” đang hard-code | Tính số phần tử khả dụng từ `checkoutService.shippingMethods()` |
| Phí vận chuyển | `checkout/services/checkout.service.ts` – `shippingFee` hiện lấy trực tiếp `selectedShippingMethod().price`; giá phương thức đang khai báo cố định | Bổ sung logic tính phí theo địa chỉ gửi/nhận và phương thức; đồng bộ với tổng tiền |
| Thông báo thành công | `checkout/components/success/checkout-success.html` – nội dung “Đơn hàng bespoke…” đang viết cố định | Thay bằng câu thông báo chung theo yêu cầu |
| Nút tiếp tục mua sắm | `checkout/checkout.ts` – `onNewOrder()` gọi `createNewOrder()` và chuyển về `form` | Tạo handler điều hướng về route giỏ hàng; phân biệt với hành động “Đặt thêm đơn hàng khác” |
| Ảnh sản phẩm | `checkout/services/checkout.service.ts` – `loadFromCart()` gán `imageUrl` từ `c.snapshot` hoặc đường dẫn `/products/...`; template hiển thị qua `img [src]` | Kiểm tra dữ liệu snapshot, quy tắc tạo URL và sự tồn tại của file ảnh |

## 4. Phạm vi kiểm thử lại sau khi Dev hoàn tất

| Test case | Thao tác kiểm thử | Kết quả mong đợi |
|---|---|---|
| TC-01 | Đăng nhập tài khoản A và mở checkout | Hiển thị đúng thông tin giao nhận của tài khoản A |
| TC-02 | Đăng nhập tài khoản B và mở checkout | Hiển thị đúng thông tin giao nhận của tài khoản B, không dùng dữ liệu tài khoản A |
| TC-03 | Tạo giỏ hàng có 2 phương thức vận chuyển khả dụng | Nhãn hiển thị “2 khả dụng” |
| TC-04 | Thay đổi địa chỉ nhận từ TP. Hồ Chí Minh sang Hà Nội | Phí ship và tổng thanh toán được tính lại theo cấu hình |
| TC-05 | Đặt đơn sản phẩm có sẵn | Màn hình thành công hiển thị “Đơn hàng đã được xác nhận tự động” |
| TC-06 | Đặt đơn sản phẩm custom/bespoke | Màn hình thành công hiển thị cùng thông báo chung |
| TC-07 | Nhấn “Tiếp tục mua sắm” | Điều hướng về trang giỏ hàng, không tạo đơn mới |
| TC-08 | Kiểm tra ảnh sản phẩm ở giỏ hàng, checkout và màn hình thành công | Ảnh đúng sản phẩm/thiết kế và tải thành công |
| TC-09 | Thử sản phẩm có URL ảnh lỗi hoặc thiếu ảnh | Hiển thị ảnh fallback, không xuất hiện ảnh vỡ |

## 5. Tài liệu và bằng chứng đính kèm

- Screenshot checkout – thông tin giao nhận, phương thức vận chuyển và phần tóm tắt đơn hàng.
- Screenshot checkout – khu vực ghi chú shipper, lựa chọn phương thức vận chuyển và gói quà.
- Screenshot màn hình đặt hàng thành công – nội dung xác nhận đơn hàng và nút tiếp tục mua sắm.
- Source code checkout được cung cấp trong file `checkout(1).zip`.

## 6. Lưu ý khi bàn giao

- Các nội dung **Mong muốn** và **Tiêu chí nghiệm thu** là yêu cầu QA đề xuất để thống nhất hành vi sau khi sửa.
- Với phí vận chuyển, cần BA/đơn vị vận chuyển xác nhận quy tắc và bảng giá trước khi Dev triển khai.
- Với liên kết thông tin tài khoản, cần xác nhận nguồn dữ liệu account/profile và quy tắc lưu địa chỉ được chọn.
- Sau khi sửa, Dev vui lòng cập nhật trạng thái từng BUG và cung cấp môi trường/bản build để QA retest.
