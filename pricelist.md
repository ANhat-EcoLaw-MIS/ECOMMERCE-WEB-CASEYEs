# 1.3.7. Giả định và ràng buộc – CasEYE's

Nov 20, 2026 · @hihi

## a) Giả định

Giả định là những điều kiện được nhóm chấp nhận là đúng tại thời điểm lập kế hoạch và phân tích, làm cơ sở cho việc đặc tả yêu cầu ở Chương 3. Nếu một giả định không còn đúng, phạm vi, quy tắc nghiệp vụ hoặc thiết kế hệ thống tương ứng cần được xem xét lại. Các giả định được trình bày theo trình tự của hành trình kinh doanh: định vị doanh nghiệp và khách hàng → tài khoản → sản phẩm và định giá → dịch vụ cộng thêm và khuyến mãi → sản xuất và giao vận → thanh toán, hủy đơn và hoàn tiền → chăm sóc khách hàng → danh mục và tồn kho → công nghệ, dữ liệu và đối tác.

### (1) Định vị doanh nghiệp, thị trường và khách hàng

| Mã | Giả định |
| --- | --- |
| GĐ-01 | CasEYE's là doanh nghiệp thương mại điện tử D2C quy mô lớn, vận hành sản xuất in theo yêu cầu tập trung. Phạm vi đồ án hiện thực hóa và mô phỏng các luồng nghiệp vụ cốt lõi của doanh nghiệp này. |
| GĐ-02 | Khách hàng mục tiêu (16–28 tuổi) đã quen mua sắm trực tuyến, chủ yếu truy cập bằng thiết bị di động và chấp nhận thanh toán trước đối với sản phẩm thiết kế riêng. |
| GĐ-03 | Phần lớn khách hàng không có kỹ năng đồ họa nhưng có khả năng thao tác kéo – thả và mô tả ý tưởng bằng ngôn ngữ tự nhiên. |
| GĐ-04 | Nhu cầu cá nhân hóa và xu hướng mua sắm qua mạng xã hội của Gen Z tiếp tục tăng trong giai đoạn triển khai. |
| GĐ-05 | Đơn hàng điển hình gồm một ốp lưng, có thể kèm một phụ kiện. Giá trị đơn hàng trung bình mục tiêu khoảng 280.000 đồng. Tỷ trọng doanh thu dự kiến giữa hàng có sẵn và hàng thiết kế riêng là 60:40. |

### (2) Tài khoản và phân quyền

| Mã | Giả định |
| --- | --- |
| GĐ-06 | Khách vãng lai được duyệt sản phẩm, tìm kiếm, thiết kế thử và thêm sản phẩm vào giỏ hàng. Khách chỉ cần đăng nhập khi lưu thiết kế, thanh toán hoặc gửi khiếu nại. |
| GĐ-07 | Mỗi tài khoản có đúng một vai trò: khách hàng, Operator, nhân viên chăm sóc khách hàng (CSKH) hoặc Admin. Nhân viên đăng nhập qua cổng riêng. |

### (3) Sản phẩm và chính sách định giá

Doanh nghiệp định vị ở phân khúc tầm trung: cao hơn các đơn vị in ốp phổ thông trong nước (150.000–300.000 đồng) và thấp hơn nhiều so với thương hiệu quốc tế (1,2–2 triệu đồng). CasEYE's cạnh tranh bằng trải nghiệm thiết kế và độ tin cậy của quy trình, không cạnh tranh bằng giá.

Bảng giá tuân theo một thứ bậc nhất quán: ốp trơn < phụ kiện < ốp in sẵn < ốp phiên bản giới hạn < ốp thiết kế riêng. Ốp thiết kế riêng có giá cao nhất vì được in đơn chiếc, phải qua kiểm duyệt và chịu rủi ro in lại. Khoảng chênh với ốp in sẵn được giữ ở mức vừa phải để khuyến khích khách hàng chuyển sang tự thiết kế.

| Mã | Giả định | Giá đề xuất | Lý do cơ bản |
| --- | --- | --- | --- |
| GĐ-08 | Ốp in sẵn và ốp thiết kế riêng dùng chung phôi "Polycarbonate Ultra-Defense" (lưng cứng chống ố, viền TPU chống sốc), in bằng công nghệ UV. | – | Chuẩn hóa nguyên liệu để kiểm soát chất lượng và đơn giản hóa tồn kho phôi. |
| GĐ-09 | Ốp thiết kế riêng áp dụng đồng giá cho mọi dòng máy. | **250.000 đồng** | Đồng giá giúp khách tập trung vào sáng tạo. Mức giá bù được chi phí in đơn chiếc, kiểm duyệt và in lại, đồng thời vẫn nằm trong khoảng giá phổ thông. |
| GĐ-10 | Ốp in sẵn được định giá theo nhóm dòng máy. | **199.000 đồng** (dòng thường) / **219.000 đồng** (Pro Max, Ultra, máy gập) | Phôi cao cấp cần mức giá đủ bù chi phí giao hàng và marketing trên mỗi đơn. Dòng máy lớn dùng phôi lớn hơn. |
| GĐ-11 | Ốp phiên bản giới hạn hoặc hợp tác (Limited / Collab) là hàng in sẵn, số lượng có hạn. | **239.000 đồng** | Có tính khan hiếm nhưng vẫn thấp hơn ốp thiết kế riêng để giữ thứ bậc giá. |
| GĐ-12 | Ốp dẻo trơn hoặc trong suốt (không in) là sản phẩm thu hút khách hàng mới. | **99.000 đồng** | Dễ tiếp cận cho lần mua đầu tiên. |
| GĐ-13 | Phụ kiện là hàng có sẵn, không bị khóa thanh toán khi nhận hàng (COD). | Dây đeo 79.000; giá đỡ (griptok) 59.000; vòng MagSafe 79.000; bộ sticker 29.000; kính cường lực 99.000 (đồng) | Biên lợi nhuận cao, giúp tăng giá trị đơn hàng trung bình. |
| GĐ-14 | Giá niêm yết đã gồm VAT, làm tròn đến hàng nghìn đồng. Giỏ hàng lưu giá tại thời điểm thêm sản phẩm; Checkout yêu cầu khách xác nhận nếu giá hiện hành thay đổi. | – | Bảo đảm minh bạch, tránh tranh chấp về giá. |

### (4) Phí dịch vụ, khuyến mãi và khách hàng thân thiết

| Mã | Giả định | Giá trị |
| --- | --- | --- |
| GĐ-15 | Giao tiêu chuẩn áp dụng đồng giá toàn quốc cho mọi loại đơn. Mức phí gần với cước vận chuyển thực tế bình quân; phần chênh lệch ở tuyến xa do doanh nghiệp chi trả. | **25.000 đồng** |
| GĐ-16 | Giao hỏa tốc 24 giờ chỉ áp dụng cho đơn toàn hàng có sẵn, giao nội thành Hà Nội và TP. Hồ Chí Minh. Đơn xác nhận trước 14:00 được giao trong ngày. | **45.000 đồng** (25.000 phí tiêu chuẩn + 20.000 phụ phí hỏa tốc) |
| GĐ-17 | Không áp dụng ngưỡng miễn phí giao hàng; ưu đãi giao hàng chỉ được cấp dưới dạng voucher hậu mãi. | – |
| GĐ-18 | Dịch vụ gói quà Hologram kèm thiệp viết tay (lời nhắn tối đa 150 ký tự). | **25.000 đồng/đơn** |
| GĐ-19 | Không thu phí đối với đơn thanh toán khi nhận hàng (COD). | 0 đồng |
| GĐ-20 | Mỗi đơn áp dụng tối đa một voucher. Voucher chỉ giảm trên tiền hàng, không giảm phí giao, phí gói quà và phụ phí hỏa tốc. | – |
| GĐ-21 | Voucher đơn đầu (CASEFIRST, khách tự nhập mã) và voucher hoàn thiện hồ sơ (PROFILE\_COMPLETE, cấp một lần mỗi tài khoản). | Giảm 20.000 / 30.000 đồng, áp dụng cho đơn từ 199.000 đồng |
| GĐ-22 | Voucher bồi thường và hậu mãi: giao trễ so với ngày giao dự kiến (không do lỗi khách); đơn hỏa tốc giao trễ; đơn hoàn tất không phát sinh khiếu nại. | Giao trễ: 10% giá trị hàng, tối đa 30.000 đồng, hạn 30 ngày. Hỏa tốc giao trễ: 20.000 đồng. Đơn hoàn tất: miễn phí giao tiêu chuẩn cho đơn kế tiếp. |
| GĐ-23 | Chương trình khách hàng thân thiết Cosmic Club (hệ thống bên ngoài) cộng điểm khi đơn hoàn tất và thu hồi điểm khi đơn bị hoàn tiền. | 1 điểm / 1.000 đồng tiền hàng |

### (5) Sản xuất và giao vận

| Mã | Giả định |
| --- | --- |
| GĐ-24 | Hàng có sẵn được lưu tại hai kho ở Hà Nội và TP. Hồ Chí Minh. Hàng thiết kế riêng được sản xuất tại xưởng in tập trung. |
| GĐ-25 | Hàng in sẵn được sản xuất trước theo lô (make-to-stock). Thời gian xử lý gồm lấy hàng, đóng gói và bàn giao vận chuyển, từ 1 đến 2 ngày làm việc. |
| GĐ-26 | Hàng thiết kế riêng chỉ sản xuất sau khi khách đặt hàng và thanh toán (make-to-order): kiểm duyệt thiết kế trong vòng 24 giờ → chốt mẻ in lúc 16:00 mỗi ngày làm việc → in UV và kiểm tra chất lượng → đóng gói → bàn giao vận chuyển vào sáng hôm sau. Tổng thời gian xử lý từ 2 đến 3 ngày làm việc. |
| GĐ-27 | Ngày giao dự kiến = ngày bắt đầu xử lý + thời gian xử lý + thời gian vận chuyển. Đơn xác nhận sau 16:00 được tính từ ngày làm việc kế tiếp. Thời gian vận chuyển: nội thành 1 ngày, nội miền 1–2 ngày, liên miền 2–4 ngày. Ngày nghỉ lễ không được tính. |
| GĐ-28 | Thiết kế bị từ chối được khách chỉnh sửa và gửi duyệt lại tối đa 2 lần. Hệ thống nhắc khách vào ngày thứ 3; quá 7 ngày không phản hồi, đơn tự động hủy và được hoàn tiền 100%. |
| GĐ-29 | Sản phẩm không đạt kiểm tra chất lượng được in lại ở mẻ kế tiếp, ngày giao dự kiến cộng thêm 1 ngày làm việc. Đơn hỗn hợp mặc định giao chung một kiện; nếu việc in lại làm trễ quá 2 ngày thì tách kiện. |
| GĐ-30 | Xưởng in đủ công suất xử lý toàn bộ đơn hàng trong mẻ ngày; hệ thống không giới hạn số đơn trong mỗi mẻ in. |
| GĐ-31 | Ngày làm việc của xưởng và kho là thứ Hai đến thứ Bảy. |
| GĐ-32 | Hàng giao thất bại được lưu kho 14 ngày. Đơn tự động hoàn tất sau 72 giờ kể từ khi giao thành công. Khách được báo sự cố trong vòng 7 ngày kể từ khi giao. |
| GĐ-33 | Giao thất bại do lỗi khách được giao lại một lần, khách trả cước giao lại **25.000 đồng**. Giao thất bại do đơn vị vận chuyển hoặc do doanh nghiệp được giao lại miễn phí. |

### (6) Thanh toán, hủy đơn và hoàn tiền

| Mã | Giả định |
| --- | --- |
| GĐ-34 | Đơn có hàng thiết kế riêng bắt buộc thanh toán trước 100%, không được chọn COD và không được giao hỏa tốc. Đơn toàn hàng có sẵn được thanh toán khi nhận hàng, trừ khách có cờ rủi ro cao. |
| GĐ-35 | Khách bị gắn cờ rủi ro cao khi hủy 3 đơn do lỗi của khách trong 90 ngày. Cờ tự gỡ sau 5 đơn hoàn tất liên tiếp. |
| GĐ-36 | Phiên thanh toán được bảo lưu trong 15 phút khi giao dịch bị gián đoạn. |
| GĐ-37 | Hoàn tiền được thực hiện bằng chuyển khoản trong 3–5 ngày làm việc, tính từ khi khách cung cấp tài khoản nhận hoàn. |
| GĐ-38 | Đơn chỉ có hàng có sẵn, đã thanh toán, giao thất bại do lỗi khách và khách chọn hủy: khách được hoàn tiền hàng sau khi trừ cước hai chiều (50.000 đồng). |
| GĐ-39 | Không hỗ trợ đổi trả do khách đổi ý. Hàng thiết kế riêng là sản phẩm độc bản nên không đổi trả; mọi trường hợp lỗi được xử lý qua luồng khiếu nại trong vòng 7 ngày. |

### (7) Chăm sóc khách hàng

| Mã | Giả định |
| --- | --- |
| GĐ-40 | Bộ phận chăm sóc khách hàng làm việc mỗi ngày, từ 8:00 đến 22:00. |
| GĐ-41 | Yêu cầu hủy đơn đã thanh toán được phản hồi trong vòng 24 giờ. |
| GĐ-42 | Thời hạn xử lý khiếu nại: phản hồi đầu tiên trong vòng 24 giờ; khách bổ sung thông tin trong vòng 3 ngày; quyết định phương án trong vòng 3 ngày làm việc kể từ khi đủ thông tin. |
| GĐ-43 | Số lượng Operator và nhân viên CSKH được bố trí đủ để đáp ứng các thời hạn kiểm duyệt và phản hồi khi lượng đơn hàng thay đổi. |

### (8) Danh mục sản phẩm và tồn kho

| Mã | Giả định |
| --- | --- |
| GĐ-44 | Danh mục dòng máy khi mở bán: iPhone 13 đến iPhone 17 (đủ các phiên bản), Samsung Galaxy S24 và S25 (thường, Plus, Ultra), cùng một số dòng Xiaomi phổ biến. Mô hình 3D chỉ được dựng cho một phần các dòng máy; các dòng còn lại xem trước bằng ảnh 2D. |
| GĐ-45 | Tồn kho được quản lý theo hai loại mặt hàng: (1) từng biến thể ốp in sẵn và phụ kiện; (2) phôi trắng theo từng dòng máy dành cho hàng thiết kế riêng, mỗi đơn thiết kế riêng trừ một phôi. |
| GĐ-46 | Tồn kho chỉ bị trừ khi đơn được tạo thành công, không giữ chỗ khi sản phẩm còn trong giỏ. Đơn bị hủy trước khi sản xuất được hoàn lại tồn kho. |
| GĐ-47 | Danh mục dòng máy, mẫu thiết kế, giá và tồn kho được cập nhật đầy đủ trước khi mở bán. Kho mẫu được bổ sung mẫu mới theo xu hướng ít nhất mỗi tháng. |

### (9) Công nghệ, dữ liệu và đối tác

| Mã | Giả định |
| --- | --- |
| GĐ-48 | Trình duyệt của khách hàng hỗ trợ HTML5 Canvas và WebGL. Dòng máy chưa có mô hình 3D vẫn được xem trước bằng ảnh 2D theo chuẩn phôi in. |
| GĐ-49 | Khách hàng chịu trách nhiệm về bản quyền hình ảnh tải lên sau khi xác nhận cam kết. Doanh nghiệp có quyền từ chối in nội dung vi phạm. |
| GĐ-50 | Khi xóa tài khoản, khách có 30 ngày để khôi phục. Sau thời hạn này, dữ liệu cá nhân được ẩn danh, dữ liệu đơn hàng được lưu ở dạng ẩn danh. Nhật ký tìm kiếm luôn được che thông tin cá nhân. |
| GĐ-51 | Xưởng in và đơn vị vận chuyển đáp ứng quy trình gom đơn theo mẻ và cập nhật trạng thái giao hàng theo từng sự kiện. Cổng thanh toán, ngân hàng, hệ thống kho, hệ thống khách hàng thân thiết và dịch vụ email/SMS cung cấp interface ổn định như mô tả trong phạm vi; trong đồ án, các hệ thống này được mô phỏng. |

### Bảng tổng hợp giá bán và phí dịch vụ

| Nhóm | Hạng mục | Giá |
| --- | --- | --- |
| Sản phẩm | Ốp dẻo trơn / trong suốt | 99.000 đồng |
| Sản phẩm | Ốp in sẵn – dòng thường | 199.000 đồng |
| Sản phẩm | Ốp in sẵn – Pro Max, Ultra, máy gập | 219.000 đồng |
| Sản phẩm | Ốp phiên bản giới hạn / hợp tác | 239.000 đồng |
| Sản phẩm | Ốp thiết kế riêng (đồng giá) | 250.000 đồng |
| Sản phẩm | Phụ kiện | 29.000 – 99.000 đồng |
| Dịch vụ | Giao tiêu chuẩn (toàn quốc) | 25.000 đồng |
| Dịch vụ | Giao hỏa tốc 24 giờ (nội thành Hà Nội, TP. Hồ Chí Minh) | 45.000 đồng |
| Dịch vụ | Gói quà kèm thiệp | 25.000 đồng |
| Dịch vụ | Cước giao lại (lỗi do khách) | 25.000 đồng |
| Dịch vụ | Phí thu hộ COD | 0 đồng |
