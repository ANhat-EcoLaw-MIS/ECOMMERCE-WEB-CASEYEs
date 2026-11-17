"""3.4 Mô hình hóa yêu cầu: user story, use case, class diagram."""

USH = ["Mã", "User story", "Tiêu chí chấp nhận", "UC"]
USW = [2.4, 5.8, 5.6, 2.1]


def spec(key, title, rows):
    return ("table", key, f"Đặc tả {title}", ["Mục", "Nội dung"], rows, [3.3, 12.6], 10.5)


B = [
    ("h2", "3.4. Mô hình hóa yêu cầu"),
    ("h3", "3.4.1. User story"),
    ("p", "User story được viết theo mẫu “Là <vai trò>, tôi muốn <mục tiêu> để <giá trị>”. Tiêu chí chấp nhận viết gọn theo dạng Given–When–Then. "
          "Bảng dưới chọn các story cốt lõi của từng phân hệ; story nào trùng với FR thì chỉ ghi mã FR để tránh lặp."),
    ("table", "us", "User story cốt lõi theo phân hệ", USH, [
        ["US-AUTH-01", "Là khách vãng lai, tôi muốn đăng ký bằng email và mật khẩu để lưu thiết kế và đơn hàng.", "Khi email hợp lệ, mật khẩu ≥ 8 ký tự có chữ và số, hai lần nhập khớp, thì tài khoản và hồ sơ được tạo, tôi được đăng nhập.", "UC-AUTH-01"],
        ["US-AUTH-02", "Là khách hàng, tôi muốn đăng nhập rồi quay lại đúng chỗ đang làm.", "Khi tôi bấm Lưu thiết kế lúc chưa đăng nhập, sau khi đăng nhập thì thiết kế đã nằm trong My Designs.", "UC-AUTH-02"],
        ["US-AUTH-03", "Là khách mới, tôi muốn chọn dòng máy và sở thích, hoặc bỏ qua.", "Chọn xong hoặc bỏ qua thì không bị hỏi lại; ở Checkout hệ thống hỏi tôi trước khi mở onboarding.", "UC-AUTH-06"],
        ["US-AUTH-04", "Là nhân viên, tôi muốn đăng nhập trang vận hành và chỉ thấy việc của vai trò mình.", "Tài khoản không có vai trò nhân viên vào /admin thì bị từ chối.", "UC-AUTH-05"],
        ["US-PM-01", "Là khách hàng, tôi muốn lưu nhiều địa chỉ và chọn một địa chỉ mặc định.", "Đặt địa chỉ A làm mặc định thì địa chỉ mặc định cũ bị bỏ; Checkout tự điền địa chỉ A.", "UC-PM-03"],
        ["US-PM-02", "Là khách hàng, tôi muốn xem lịch sử đơn trong hồ sơ.", "Tab Đơn hàng liệt kê đơn mới nhất trước; bấm một đơn thì mở trang chi tiết.", "UC-PM-05"],
        ["US-SH-01", "Là khách vãng lai, tôi muốn lọc ốp theo phong cách và giá.", "Chọn “Pastel” và giá ≤ 300.000 đ thì chỉ còn sản phẩm thỏa cả hai điều kiện.", "UC-SH-01"],
        ["US-SH-02", "Là khách hàng, tôi muốn thêm ốp có sẵn vào giỏ cùng với ốp tự thiết kế.", "Giỏ hiện cả hai loại; không thêm được quá số tồn khả dụng.", "UC-SH-03"],
        ["US-DES-01", "Là khách, tôi muốn bắt đầu từ một mẫu có sẵn rồi chỉnh tiếp.", "Bấm “Thiết kế mẫu này” thì canvas nạp mẫu theo dòng máy đã chọn.", "UC-DES-01"],
        ["US-DES-02", "Là khách, tôi muốn xem ốp 3D trước khi mua.", "Nút xem 3D xoay được; nếu không tải được mô hình thì hiện bản 2D kèm thông báo.", "UC-DES-02"],
        ["US-DES-03", "Là khách, tôi muốn biết vì sao thiết kế bị từ chối và sửa lại.", "Đơn chuyển Cần sửa thiết kế kèm nhóm vi phạm; gửi lại thì đơn về Chờ duyệt.", "UC-DES-05"],
        ["US-P-01", "Là khách hàng, tôi muốn thấy phí giao và ngày giao dự kiến trước khi đặt.", "Đổi gói giao thì phí, tổng tiền và khoảng ngày giao cập nhật ngay.", "UC-P-01"],
        ["US-P-02", "Là khách hàng, tôi muốn thanh toán lại khi bị gián đoạn mà không mất đơn.", "Thử lại hoặc đổi phương thức thì mã đơn giữ nguyên, chỉ mã giao dịch đổi.", "UC-P-04"],
        ["US-OT-01", "Là khách hàng, tôi muốn xem đơn đang ở bước nào và khi nào nhận.", "Trang chi tiết hiện timeline đúng trạng thái, khoảng ngày giao, lịch sử.", "UC-OT-01"],
        ["US-OT-02", "Là khách hàng, tôi muốn hủy đơn COD ngay sau khi đặt nếu đổi ý.", "Trong 30 phút, nút Hủy hiện; chọn lý do thì đơn Đã hủy. Quá hạn thì nút biến mất.", "UC-OT-02"],
        ["US-OT-03", "Là khách hàng, tôi muốn yêu cầu hủy đơn đã thanh toán.", "Gửi yêu cầu thì đơn bị giữ lại; CSKH trả lời trong 1 ngày làm việc; chấp nhận thì hoàn 100%.", "UC-OT-12"],
        ["US-OT-04", "Là Operator, tôi muốn duyệt bản thiết kế trước khi in.", "Duyệt thì đơn về Đã xác nhận; từ chối phải chọn nhóm vi phạm.", "UC-OT-11"],
        ["US-OT-05", "Là Admin, tôi muốn xác nhận chuyển khoản hoàn tiền kèm mã đối soát.", "Ghi nhận xong thì yêu cầu là Đã hoàn tiền, đơn là Refunded, khách được thông báo.", "UC-OT-13"],
        ["US-CS-01", "Là khách, tôi muốn chat hỏi nhanh trên trang đang xem.", "Bấm nút chat thì mở khung có câu trả lời nhanh; tin của tôi được ghi nhận.", "UC-CS-01"],
        ["US-CS-02", "Là khách hàng, tôi muốn gửi khiếu nại kèm ảnh cho đơn bị lỗi.", "Chưa đăng nhập thì được yêu cầu đăng nhập; đã đăng nhập thì gửi được mã đơn, lý do, mô tả.", "UC-CS-03"],
        ["US-SR-01", "Là khách, tôi muốn tìm “meo” không dấu vẫn ra mẫu mèo.", "Kết quả có các mẫu gắn mèo, sai một chữ vẫn ra.", "UC-SR-01"],
        ["US-SR-02", "Là khách, tôi muốn mô tả “ốp tím pastel dễ thương” để được gợi ý.", "Hiện các khái niệm đã hiểu và tối đa 12 mẫu, mỗi mẫu ghi lý do.", "UC-SR-02"],
        ["US-SR-03", "Là khách, tôi muốn tải ảnh để tìm mẫu cùng tông màu.", "Ảnh sai định dạng hoặc quá 5 MB thì báo lỗi; ảnh hợp lệ thì hiện tông màu và mẫu cùng tông.", "UC-SR-03"]],
     USW, 10.5),

    ("h3", "3.4.2. Use case"),
    ("h4", "a) Use case phân rã theo phân hệ"),
    ("p", "Use case tổng quát (UC-00) ở mục 3.1.4 được phân rã thành tám sơ đồ, mỗi phân hệ một sơ đồ. Quan hệ «include» thể hiện bước bắt buộc, "
          "«extend» thể hiện bước tùy chọn hoặc có điều kiện. Use case của phân hệ khác (ghi kèm mã) chỉ được vẽ lại khi cần thể hiện điểm nối."),
    ("fig", "uc_auth", "UC-AUTH_xac-thuc", "UC-AUTH: Use case phân hệ Xác thực", "p", 14.5),
    ("fig", "uc_pm", "UC-PM_trang-chu-ho-so", "UC-PM: Use case phân hệ Trang chủ và hồ sơ cá nhân", "p", 14.5),
    ("fig", "uc_sh", "UC-SH_cua-hang", "UC-SH: Use case phân hệ Cửa hàng", "p", 14.5),
    ("fig", "uc_des", "UC-DES_design-studio", "UC-DES: Use case phân hệ Studio thiết kế", "p", 15),
    ("fig", "uc_p", "UC-P_thanh-toan", "UC-P: Use case phân hệ Thanh toán", "p", 14.5),
    ("fig", "uc_ot", "UC-OT_quan-ly-don-hang", "UC-OT: Use case phân hệ Quản lý đơn hàng và giao vận", "p", 15.5),
    ("fig", "uc_cs", "UC-CS_ho-tro-khach-hang", "UC-CS: Use case phân hệ Hỗ trợ khách hàng", "p", 14.5),
    ("fig", "uc_sr", "UC-SR_tim-kiem", "UC-SR: Use case phân hệ Tìm kiếm và gợi ý", "p", 13.5),
    ("h4", "b) Đặc tả use case"),
    ("p", "Phần này đặc tả các use case nằm trên luồng tạo ra giá trị chính: đăng ký và đăng nhập, mua và thiết kế, thanh toán, theo dõi và xử lý đơn, hỗ trợ, gợi ý. "
          "Các use case còn lại có hành vi đơn giản, đã được mô tả đủ bằng FR và user story."),
    spec("uc_a1", "UC-AUTH-01: Đăng ký tài khoản", [
        ["Tác nhân", "Khách vãng lai (chính); Supabase Auth (phụ)"],
        ["Truy vết", "BR-AUTH-01, BR-AUTH-04 · FR-AUTH-01, 03, 06 · US-AUTH-01, 03"],
        ["Tiền điều kiện", "Khách chưa đăng nhập"],
        ["Hậu điều kiện", "Có tài khoản trong Supabase Auth và hồ sơ profiles (role = customer); khách được đăng nhập"],
        ["Luồng chính", "1. Khách bấm Đăng ký. 2. Hệ thống hiện biểu mẫu email, mật khẩu, xác nhận mật khẩu. 3. Khách nhập và gửi. 4. Hệ thống kiểm tra định dạng, độ mạnh, sự khớp. "
                        "5. Hệ thống gửi yêu cầu đăng ký tới Supabase Auth. 6. Trigger tạo hồ sơ chờ onboarding. 7. Hệ thống mời onboarding (UC-AUTH-06) rồi đưa khách về màn hình trước đó."],
        ["Luồng thay thế", "3a. Khách chọn “Tiếp tục với Google”: hệ thống đăng nhập tài khoản demo (mô phỏng OAuth), tiếp tục từ bước 6."],
        ["Ngoại lệ", "4a. Dữ liệu không hợp lệ: báo lỗi dưới từng trường, quay lại bước 3. 5a. Email đã tồn tại: báo “Email này đã được đăng ký”, gợi ý đăng nhập."]]),
    spec("uc_a2", "UC-AUTH-02: Đăng nhập", [
        ["Tác nhân", "Khách vãng lai có tài khoản (chính); Supabase Auth (phụ)"],
        ["Truy vết", "BR-AUTH-02 · FR-AUTH-02, 04 · US-AUTH-02"],
        ["Tiền điều kiện", "Có tài khoản hợp lệ; chưa đăng nhập"],
        ["Hậu điều kiện", "Có phiên đăng nhập; dữ liệu lưu tạm (thiết kế, giỏ) đã chuyển vào tài khoản; khách ở lại tác vụ đang dở"],
        ["Luồng chính", "1. Khách bấm Đăng nhập, hoặc một chức năng cần tài khoản. 2. Hệ thống hiện biểu mẫu. 3. Khách nhập email, mật khẩu. "
                        "4. Hệ thống xác thực qua Supabase Auth. 5. Hệ thống chuyển dữ liệu lưu tạm vào tài khoản. 6. Hệ thống quay lại màn hình trước đó."],
        ["Ngoại lệ", "4a. Sai thông tin: báo lỗi chung “Email hoặc mật khẩu không chính xác”, không tiết lộ email có tồn tại. 4b. Mất kết nối: báo lỗi, giữ nguyên dữ liệu đã nhập."]]),
    spec("uc_sh3", "UC-SH-03: Thêm vào giỏ hàng", [
        ["Tác nhân", "Khách hàng"],
        ["Truy vết", "BR-SH-03, BR-SH-04 · FR-SH-03, 04 · US-SH-02"],
        ["Tiền điều kiện", "Khách đang ở trang chi tiết sản phẩm còn hàng"],
        ["Hậu điều kiện", "Giỏ hàng chung có thêm dòng hàng (hoặc tăng số lượng); số món trên header cập nhật"],
        ["Luồng chính", "1. Khách chọn dòng máy, chất liệu, số lượng. 2. Khách bấm Thêm vào giỏ. 3. Hệ thống kiểm tra đăng nhập (include UC-AUTH-02). "
                        "4. Hệ thống kiểm tra số lượng không vượt tồn khả dụng. 5. Hệ thống thêm dòng vào giỏ, mở ngăn giỏ hàng."],
        ["Ngoại lệ", "4a. Vượt tồn: báo số lượng còn lại, giữ nguyên giỏ. 1a. Hết hàng: nút Thêm giỏ bị vô hiệu."]]),
    spec("uc_d2", "UC-DES-02: Thiết kế ốp cá nhân hóa", [
        ["Tác nhân", "Khách vãng lai, Khách hàng"],
        ["Truy vết", "BR-DES-01, 05, 06, 07, 13 · FR-DES-01, 11–17, 26 · US-DES-01, 02"],
        ["Tiền điều kiện", "Đã chọn dòng máy (include Chọn dòng máy) và một điểm bắt đầu (mẫu hoặc phôi trắng)"],
        ["Hậu điều kiện", "Thiết kế hợp lệ trên canvas, sẵn sàng lưu (UC-DES-03) hoặc đặt mua (UC-DES-04)"],
        ["Luồng chính", "1. Hệ thống nạp khung ốp và vùng in của dòng máy. 2. Khách thêm ảnh, chữ, sticker, đổi nền; kéo thả, xoay, thu phóng. "
                        "3. Hệ thống kiểm tra tự động vùng in, định dạng và dung lượng ảnh, từ khóa cấm. 4. Khách xem trước 2D/3D (include Xem trước)."],
        ["Luồng thay thế", "2a. Khách tải ảnh lên: hệ thống hiện chính sách nội dung và ô xác nhận trước khi nhận ảnh."],
        ["Ngoại lệ", "3a. Vi phạm vùng in, ảnh sai định dạng hoặc quá 10 MB, chứa từ cấm: báo lỗi cụ thể, yêu cầu sửa. 4a. Không tải được mô hình 3D: quay về 2D."]]),
    spec("uc_d4", "UC-DES-04: Đặt mua thiết kế (thêm giỏ)", [
        ["Tác nhân", "Khách hàng"],
        ["Truy vết", "BR-DES-09, 10 · FR-DES-19, 20, 21"],
        ["Tiền điều kiện", "Có thiết kế hợp lệ (UC-DES-02) hoặc chọn “Mua ngay” một mẫu có sẵn"],
        ["Hậu điều kiện", "Giỏ có dòng hàng thiết kế, kèm snapshot (mã thiết kế, ảnh xem trước, dòng máy, giá, cờ có ảnh tải lên)"],
        ["Luồng chính", "1. Khách bấm Thêm vào giỏ. 2. Hệ thống lưu thiết kế và tạo snapshot. 3. Hệ thống thêm dòng hàng thiết kế (số lượng 1) vào giỏ chung, thông báo kèm lối sang Thanh toán."],
        ["Luồng thay thế", "1a. Khách chưa đăng nhập: hệ thống lưu tạm trên trình duyệt, mở cửa sổ đăng nhập (UC-AUTH-02); sau khi đăng nhập thì tiếp tục từ bước 2."]]),
    spec("uc_p1", "UC-P-01: Thanh toán đơn hàng", [
        ["Tác nhân", "Khách hàng (chính); Cổng thanh toán (phụ, mô phỏng)"],
        ["Truy vết", "BR-P-01 – 05 · FR-P-01 – 09 · US-P-01, 02"],
        ["Tiền điều kiện", "Đã đăng nhập; giỏ hàng có ít nhất một dòng"],
        ["Hậu điều kiện", "Có đơn trong orders (COD: Pending_Confirmation; trả trước có hàng thiết kế: Pending_Review), kèm policy_consents; giỏ được xóa"],
        ["Luồng chính", "1. Hệ thống nạp giỏ, xác định loại hàng. 2. Khách chọn địa chỉ, gói giao (include). 3. Hệ thống tính phí và ngày giao dự kiến; khóa COD, Hỏa tốc nếu có hàng thiết kế. "
                        "4. Khách chọn phương thức trả trước, tick đồng ý chính sách (include). 5. Hệ thống chuyển cổng thanh toán (extend UC-P-03). "
                        "6. Thanh toán thành công: hệ thống tạo đơn qua RPC place_order, lưu đồng ý chính sách, xóa giỏ. 7. Hệ thống hiện màn thành công với nút Theo dõi đơn."],
        ["Luồng thay thế", "2a. Khách áp mã giảm giá (extend UC-P-02). 4a. Đơn toàn hàng có sẵn, khách chọn COD (extend UC-P-05): tạo đơn ngay ở bước 6, không qua cổng."],
        ["Ngoại lệ", "4b. Chưa tick đồng ý: không cho đặt. 5a. Thanh toán thất bại hoặc gián đoạn: màn thử lại hoặc đổi phương thức, giữ mã đơn (extend UC-P-04)."]]),
    spec("uc_o1", "UC-OT-01: Xem tiến độ đơn hàng", [
        ["Tác nhân", "Khách hàng"],
        ["Truy vết", "BR-OT-01 · FR-OT-01 – 04, 13, 18, 20 · US-OT-01"],
        ["Tiền điều kiện", "Đã đăng nhập; có ít nhất một đơn"],
        ["Hậu điều kiện", "Danh sách đơn và chi tiết hiển thị đúng trạng thái hiện tại; khách không thấy đồng hồ đếm ngược thời gian đổi ý"],
        ["Luồng chính", "1. Khách mở Lịch sử đơn hàng (từ My Profile, header hoặc mã đơn trong ô tìm kiếm). 2. Hệ thống liệt kê đơn mới nhất trước. 3. Khách lọc hoặc tìm theo mã đơn. "
                        "4. Khách chọn một đơn. 5. Hệ thống hiển thị timeline, khoảng ngày giao dự kiến, sản phẩm, lịch sử trạng thái, tiến độ yêu cầu hủy hoặc hoàn tiền nếu có, và các nút được phép."],
        ["Ngoại lệ", "2a. Lỗi tải dữ liệu: báo “Không thể tải dữ liệu đơn hàng”, có nút thử lại. 4a. Đơn không thuộc khách: RLS không trả dữ liệu, hệ thống báo không tìm thấy."]]),
    spec("uc_o11", "UC-OT-11: Duyệt bản thiết kế", [
        ["Tác nhân", "Operator (Admin cũng làm được)"],
        ["Truy vết", "BR-OT-02, BR-OT-06 · FR-OT-15, FR-DES-27 – 29 · US-OT-04"],
        ["Tiền điều kiện", "Đơn có hàng thiết kế ở Pending_Review; nhân viên đã đăng nhập với vai trò phù hợp"],
        ["Hậu điều kiện", "Có bản ghi design_reviews; đơn chuyển Pending_Confirmation (duyệt) hoặc Action_Required (từ chối); khách được thông báo"],
        ["Luồng chính", "1. Operator mở hàng chờ duyệt. 2. Hệ thống hiện bản thiết kế final, cờ có ảnh tải lên. 3. Operator chọn Duyệt. 4. Hệ thống ghi lượt duyệt, chuyển trạng thái, ghi lịch sử, gửi thông báo."],
        ["Luồng thay thế", "3a. Operator chọn Từ chối, chọn nhóm vi phạm và lý do: đơn về Action_Required, khách có 7 ngày để sửa (extend UC-DES-05)."],
        ["Ngoại lệ", "4a. Đơn đã bị người khác thay đổi (version lệch): hệ thống báo “Đơn vừa được cập nhật”, tải lại dữ liệu."]]),
    spec("uc_o12", "UC-OT-12: Yêu cầu hủy đơn đã thanh toán", [
        ["Tác nhân", "Khách hàng (chính); CSKH (xử lý)"],
        ["Truy vết", "BR-OT-02, 05 · FR-OT-19, 20, 13 · US-OT-03"],
        ["Tiền điều kiện", "Đơn trả trước ở Pending_Review hoặc Pending_Confirmation; chưa có yêu cầu hủy đang chờ"],
        ["Hậu điều kiện", "Có cancel_requests (pending, hạn 1 ngày làm việc); đơn bị giữ, không vào mẻ in"],
        ["Luồng chính", "1. Khách bấm Yêu cầu hủy đơn. 2. Hệ thống hiện lý do (phí giao cao, đổi ý, sai dòng máy, sai địa chỉ, khác) và ô ghi chú. 3. Khách gửi. "
                        "4. Hệ thống tạo yêu cầu, giữ đơn, hiển thị khối “Yêu cầu hủy đơn” trên trang chi tiết. 5. CSKH chấp nhận: đơn Cancelled, trả tồn, tạo yêu cầu hoàn 100% (S1)."],
        ["Luồng thay thế", "3a. Khách rút lại yêu cầu trước khi có kết quả: yêu cầu là withdrawn, đơn tiếp tục. 5a. CSKH từ chối kèm lý do: đơn tiếp tục xử lý."]]),
    spec("uc_o4", "UC-OT-04: Báo sự cố / khiếu nại", [
        ["Tác nhân", "Khách hàng (chính); CSKH (xử lý)"],
        ["Truy vết", "BR-OT-05, BR-CS-04 · FR-OT-11, 16, FR-CS-05, 06"],
        ["Tiền điều kiện", "Đơn đã giao trong vòng 7 ngày (kể cả đã hoàn tất), hoặc đang giao thất bại trong thời hạn lưu kho; chưa có phiếu đang mở"],
        ["Hậu điều kiện", "Có phiếu (orders.ticket_id); đơn chuyển Return_Requested, lưu trạng thái trước; đồng hồ tự hoàn tất tạm dừng"],
        ["Luồng chính", "1. Khách bấm Báo sự cố trong chi tiết đơn. 2. Khách chọn lý do, mô tả, đính kèm minh chứng. 3. Hệ thống gọi RPC report_issue, tạo phiếu, đóng băng đếm giờ. "
                        "4. CSKH xử lý và chọn kết quả. 5. Hệ thống cập nhật đơn: in lại → In_Production; gửi lại hàng sẵn → Ready_for_Pickup; voucher hoặc từ chối → trạng thái trước; hoàn tiền → yêu cầu hoàn (S4)."]]),
    spec("uc_c3", "UC-CS-03: Gửi khiếu nại", [
        ["Tác nhân", "Khách hàng"],
        ["Truy vết", "BR-CS-02 · FR-CS-02, 03 · US-CS-02"],
        ["Tiền điều kiện", "Đang ở tab Khiếu nại của trang Hỗ trợ"],
        ["Hậu điều kiện", "Nội dung khiếu nại được ghi nhận (hiện là bản xem thử); khách được hướng dẫn tạo phiếu chính thức trong chi tiết đơn (UC-OT-04)"],
        ["Luồng chính", "1. Hệ thống kiểm tra đăng nhập (include UC-AUTH-02). 2. Khách nhập mã đơn, chọn lý do (sai màu, in lệch, hư hỏng, sai dòng máy), mô tả, minh chứng. 3. Khách gửi. 4. Hệ thống xác nhận đã ghi nhận."],
        ["Ngoại lệ", "1a. Chưa đăng nhập: hiện thông báo yêu cầu đăng nhập bằng tài khoản đặt hàng. 2a. Thiếu mã đơn hoặc mô tả: báo lỗi trường bắt buộc."]]),
    spec("uc_r2", "UC-SR-02: Gợi ý ốp theo mô tả", [
        ["Tác nhân", "Khách vãng lai, Khách hàng"],
        ["Truy vết", "BR-SR-02, 04, BR-DES-03 · FR-SR-06, FR-DES-05, 06 · US-SR-02"],
        ["Tiền điều kiện", "Lớp phủ tìm kiếm đang mở ở chế độ “Gợi ý theo mô tả”"],
        ["Hậu điều kiện", "Hiển thị các khái niệm đã hiểu và tối đa 12 gợi ý kèm lý do; nhật ký từ khóa được ghi"],
        ["Luồng chính", "1. Khách gõ mô tả (từ 3 ký tự). 2. Hệ thống chuẩn hóa tiếng Việt, nhận các khái niệm màu, phong cách, chủ đề, dịp, chất liệu. "
                        "3. Hệ thống chấm điểm từng mẫu theo nhóm khái niệm và độ gần màu của ảnh. 4. Hệ thống hiện “Mình hiểu bạn muốn: …” và các thẻ kèm “Vì hợp với: …”. 5. Khách chọn một thẻ để xem chi tiết."],
        ["Luồng thay thế", "4a. Không có gợi ý phù hợp: hệ thống đề nghị thêm màu, phong cách hoặc chủ đề và hiện nút “Tự thiết kế với ý tưởng này” (extend UC-SR-06), mở Studio kèm ý tưởng."]]),

    ("h3", "3.4.3. Biểu đồ lớp"),
    ("p", "Biểu đồ lớp được vẽ ở mức phân tích: thể hiện lớp miền, thuộc tính chính, phương thức nghiệp vụ và quan hệ, bám theo model trong mã nguồn và các bảng dữ liệu. "
          "Các lớp kỹ thuật của Angular (component, module) không được vẽ. Lớp gắn «service» là dịch vụ điều phối; lớp gắn tên phân hệ khác (ví dụ «OT») được vẽ lại để thể hiện điểm nối."),
    ("fig", "cd_auth", "CD-AUTH_xac-thuc", "CD-AUTH: Biểu đồ lớp phân hệ Xác thực", "p", 15),
    ("p", "AuthService điều phối đăng ký, đăng nhập, khôi phục mật khẩu qua AuthUser của Supabase Auth. Mỗi AuthUser có đúng một Profile, nơi giữ thông tin cá nhân hóa, "
          "trạng thái onboarding và vai trò. StaffSession đọc vai trò từ Profile để quyết định quyền vào trang vận hành."),
    ("fig", "cd_pm", "CD-PM_trang-chu-ho-so", "CD-PM: Biểu đồ lớp phân hệ Trang chủ và hồ sơ cá nhân", "p", 15),
    ("p", "Profile sở hữu (composition) các Address. Design và OrderSummary là dữ liệu của phân hệ DES và OT, được hiển thị trong My Profile qua cổng CustomerOrderFeed, "
          "nên PM không phụ thuộc trực tiếp vào mã của OT."),
    ("fig", "cd_sh", "CD-SH_cua-hang", "CD-SH: Biểu đồ lớp phân hệ Cửa hàng", "p", 15),
    ("p", "Một Product có nhiều ProductVariant (theo dòng máy hoặc chất liệu); mỗi biến thể trừ tồn trên một InventoryItem. "
          "Cart (CartState) là giỏ duy nhất của website, gồm các CartItem thuộc một trong hai loại IN_STOCK hoặc CUSTOM."),
    ("fig", "cd_des", "CD-DES_design-studio", "CD-DES: Biểu đồ lớp phân hệ Studio thiết kế", "p", 15),
    ("p", "Design có thể dựa trên một Template và luôn gắn với một PhoneModel. Nội dung canvas là tập CanvasLayer trừu tượng, cụ thể hóa thành TextElement, ImageElement, StickerElement; "
          "trong cơ sở dữ liệu, toàn bộ canvas được lưu ở cột designs.canvas_json. Mỗi lần duyệt bản thiết kế sinh một DesignReview."),
    ("fig", "cd_p", "CD-P_thanh-toan", "CD-P: Biểu đồ lớp phân hệ Thanh toán", "p", 15),
    ("p", "CheckoutService tạo CheckoutOrder và giữ một mã đơn duy nhất suốt các lần thử thanh toán; mỗi lần thử là một PaymentTransaction. "
          "Đơn kèm đúng một PolicyConsent. Khi thanh toán xong, đơn được chuyển qua giao diện OrderIntake mà phân hệ OT cài đặt."),
    ("fig", "cd_ot", "CD-OT_quan-ly-don-hang", "CD-OT: Biểu đồ lớp phân hệ Quản lý đơn hàng", "p", 15.5),
    ("p", "Order là lớp trung tâm, sở hữu các dòng đơn, lịch sử trạng thái, vận đơn (mỗi vận đơn có nhiều lần giao), yêu cầu hủy, yêu cầu hoàn tiền và voucher. "
          "Phương thức canCustomerCancel(), transition() và refundAmount() hiện thực các quy tắc ở 3.2.6. Notification được phát ra mỗi khi trạng thái thay đổi."),
    ("fig", "cd_cs", "CD-CS_ho-tro-khach-hang", "CD-CS: Biểu đồ lớp phân hệ Hỗ trợ khách hàng", "p", 15),
    ("p", "SupportChat gồm các ChatMessage và có tối đa một ConversationSummary (chế độ ai hoặc local). Complaint luôn gắn với một Order; lý do khiếu nại là kiểu liệt kê."),
    ("fig", "cd_sr", "CD-SR_tim-kiem", "CD-SR: Biểu đồ lớp phân hệ Tìm kiếm và gợi ý", "p", 15.5),
    ("p", "SearchService gom tài liệu từ nhiều SearchSource. Mỗi phân hệ tự cài đặt nguồn của mình (Shop, Design Studio, trang hỗ trợ) và đăng ký qua token SEARCH_SOURCES, "
          "nên lõi tìm kiếm không phụ thuộc mã phân hệ. ColorIndex gán bảng màu (Swatch) đọc từ ảnh thật cho từng SearchDoc. Concept là từ điển khái niệm dùng chung cho tìm từ khóa và gợi ý."),
]
