"""3.3 Đặc tả yêu cầu hệ thống (SRD)."""

H = ["Mã", "Yêu cầu chức năng", "BR", "Ưu tiên", "Trạng thái"]
WD = [2.7, 8.1, 1.8, 1.4, 1.9]


def fr(key, fn, rows):
    return ("table", key, f"Yêu cầu chức năng phân hệ {fn}", H, rows, WD, 10.5)


B = [
    ("h2", "3.3. Đặc tả yêu cầu hệ thống"),
    ("p", "Mục này cụ thể hóa các yêu cầu nghiệp vụ ở 3.2 thành yêu cầu chức năng (FR) có thể kiểm thử, cùng các yêu cầu phi chức năng (NFR) áp dụng toàn hệ thống. "
          "Mức ưu tiên theo MoSCoW: M (Must, bắt buộc), S (Should, nên có), C (Could, có thì tốt), W (Won't, chưa làm ở giai đoạn này). "
          "Cột Trạng thái ghi mức độ triển khai thực tế: Đã làm, Một phần, Mô phỏng, hoặc Chưa làm."),
    ("h3", "3.3.1. Yêu cầu chức năng"),
    fr("fr_auth", "Xác thực", [
        ["FR-AUTH-01", "Đăng ký bằng email và mật khẩu; kiểm tra định dạng email, độ mạnh mật khẩu, xác nhận mật khẩu; báo lỗi theo từng trường", "01", "M", "Đã làm"],
        ["FR-AUTH-02", "Đăng nhập bằng email và mật khẩu; khi sai chỉ báo lỗi chung, không tiết lộ email có tồn tại hay không", "02", "M", "Đã làm"],
        ["FR-AUTH-03", "Đăng nhập, đăng ký bằng Google", "01, 02", "S", "Mô phỏng"],
        ["FR-AUTH-04", "Sau khi đăng nhập, đưa khách về tác vụ đang dở và chuyển dữ liệu lưu tạm (thiết kế, giỏ) vào tài khoản", "02", "M", "Đã làm"],
        ["FR-AUTH-05", "Quên mật khẩu: gửi liên kết đặt lại qua email; đặt mật khẩu mới rồi đăng xuất phiên hiện tại", "03", "M", "Đã làm"],
        ["FR-AUTH-06", "Onboarding: chọn dòng máy và sở thích, hoặc bỏ qua; ở Checkout phải hỏi khách trước khi chuyển sang onboarding", "04", "S", "Đã làm"],
        ["FR-AUTH-07", "Đăng nhập nhân viên: xác thực, đọc profiles.role, chặn route /admin theo vai trò, cho Admin xem dưới vai trò khác", "05", "M", "Đã làm"],
        ["FR-AUTH-08", "Đăng xuất, thông báo kết quả", "02", "M", "Đã làm"]]),
    fr("fr_pm", "Trang chủ và hồ sơ", [
        ["FR-PM-01", "Trang chủ có banner, bộ sưu tập nổi bật và lối vào Cửa hàng, Studio, Tìm kiếm", "01", "M", "Đã làm"],
        ["FR-PM-02", "Tab Hồ sơ: xem, sửa tên hiển thị, ảnh đại diện, dòng máy, sở thích", "02", "M", "Đã làm"],
        ["FR-PM-03", "Tab Lịch sử đơn hàng: liệt kê đơn của khách và dẫn sang trang chi tiết của OT", "04", "M", "Đã làm"],
        ["FR-PM-04", "Sổ địa chỉ: thêm, sửa, đặt địa chỉ mặc định", "03", "M", "Đã làm"],
        ["FR-PM-05", "Tab Thiết kế: xem và mở lại thiết kế đã lưu", "04", "S", "Đã làm"],
        ["FR-PM-06", "Bảo mật: đổi mật khẩu; yêu cầu xóa tài khoản có lý do và mã OTP", "05", "C", "Một phần"]]),
    fr("fr_sh", "Cửa hàng", [
        ["FR-SH-01", "Danh mục ốp có sẵn; lọc theo phong cách, giá tối đa, dòng máy; sắp xếp", "01", "M", "Đã làm"],
        ["FR-SH-02", "Trang chi tiết: thư viện ảnh, xem 3D, chọn dòng máy, chất liệu, số lượng", "02", "M", "Đã làm"],
        ["FR-SH-03", "Hiển thị tình trạng tồn kho; vô hiệu nút Thêm giỏ khi hết hàng", "02, 04", "M", "Đã làm"],
        ["FR-SH-04", "Thêm vào giỏ (yêu cầu đăng nhập), mở ngăn giỏ hàng", "03", "M", "Đã làm"],
        ["FR-SH-05", "Trang giỏ hàng: sửa số lượng, xóa dòng, tạm tính, chuyển sang Thanh toán", "03", "M", "Đã làm"],
        ["FR-SH-06", "Danh sách yêu thích lưu trên trình duyệt", "01", "C", "Đã làm"],
        ["FR-SH-07", "Bán kèm phụ kiện (MagSafe, dây đeo)", "01", "C", "Đã làm"]]),
    ("p", "Yêu cầu chức năng của Studio thiết kế giữ nguyên mã của tài liệu BRD/SRD gốc; một số FR liền nhau được gộp thành một dòng để gọn."),
    fr("fr_des", "Studio thiết kế", [
        ["FR-DES-01, 02", "Chọn hãng và dòng máy; nạp khung ốp tương ứng; cảnh báo khi đổi dòng máy lúc canvas đã có nội dung", "01", "M", "Đã làm"],
        ["FR-DES-05, 06", "Gợi ý mẫu theo mô tả tự nhiên; không có kết quả thì gợi ý cách diễn đạt và lối sang tự thiết kế (dùng chung lõi của SR)", "03", "S", "Đã làm"],
        ["FR-DES-07, 08, 09", "Kho mẫu lọc theo phong cách, hashtag; chọn mẫu thì có hai hành động “Mua ngay” và “Thiết kế mẫu này”", "02, 04", "M", "Đã làm"],
        ["FR-DES-11, 12", "Canvas: thêm ảnh, chữ, sticker, màu nền; kéo thả, xoay, thu phóng; bảng thuộc tính, lớp, hoàn tác", "05", "M", "Đã làm"],
        ["FR-DES-13, 14", "Phủ vùng in an toàn theo dòng máy; kiểm tra ảnh tải lên (PNG/JPG, tối đa 10 MB)", "07", "M", "Đã làm"],
        ["FR-DES-16, 17", "Xem trước 2D theo thời gian thực; xem 3D xoay được, không tải được thì quay về 2D", "06", "M", "Đã làm"],
        ["FR-DES-18, 22", "Lưu thiết kế (JSON + ảnh xem trước) vào My Designs; tự lưu nháp và khôi phục khi tải lại trang", "08", "M", "Đã làm"],
        ["FR-DES-19, 20", "Khách vãng lai: lưu tạm trên trình duyệt, mở cửa sổ đăng nhập, chuyển dữ liệu vào tài khoản sau khi đăng nhập", "09", "M", "Đã làm"],
        ["FR-DES-21", "Thêm vào giỏ kèm mã thiết kế, ảnh xem trước, dòng máy, giá", "10", "M", "Đã làm"],
        ["FR-DES-24, 25", "Chính sách nội dung và ô xác nhận khi tải ảnh; lưu bản ghi cam kết (ContentPolicyConsent)", "13, 14", "M", "Một phần"],
        ["FR-DES-26", "Lọc chữ theo danh sách từ khóa cấm", "13", "S", "Đã làm"],
        ["FR-DES-28, 29", "Báo lý do khi thiết kế bị từ chối; chặn đặt lại cho tới khi sửa (phối hợp FR-OT-15)", "15", "S", "Đã làm"],
        ["FR-DES-30, 31", "Nhận diện nội dung cấm trong ảnh (CV, OCR); đối chiếu kho ảnh bản quyền", "13, 14", "W", "Chưa làm"]]),
    fr("fr_p", "Thanh toán", [
        ["FR-P-01", "Nạp giỏ hàng, hiển thị tóm tắt đơn và các bước Giỏ hàng → Thanh toán → Hoàn tất", "01", "M", "Đã làm"],
        ["FR-P-02", "Chọn hoặc nhập địa chỉ nhận hàng", "01", "M", "Đã làm"],
        ["FR-P-03", "Chọn gói giao, tính phí và ngày giao dự kiến; khóa Hỏa tốc khi giỏ có hàng thiết kế", "02, 03", "M", "Đã làm"],
        ["FR-P-04", "Áp và gỡ mã giảm giá", "01", "S", "Đã làm"],
        ["FR-P-05", "Chọn phương thức thanh toán; khóa COD kèm lý do khi giỏ có hàng thiết kế", "02", "M", "Đã làm"],
        ["FR-P-06", "Ô đồng ý chính sách bắt buộc, không tick sẵn; lưu phiên bản và thời điểm đồng ý", "04", "M", "Đã làm"],
        ["FR-P-07", "Màn đối soát và cổng thanh toán VietQR, ví điện tử, thẻ", "01", "M", "Mô phỏng"],
        ["FR-P-08", "Màn gián đoạn: thử lại hoặc đổi phương thức, giữ nguyên mã đơn và giỏ", "05", "M", "Đã làm"],
        ["FR-P-09", "Tạo đơn qua cổng OrderIntake (RPC place_order), xóa giỏ, hiện nút “Theo dõi đơn hàng”", "01", "M", "Đã làm"]]),
    ("p", "Yêu cầu chức năng của Quản lý đơn hàng giữ nguyên mã của tài liệu BRD/SRD v8. Các trường hợp biên (FR-OT-EX) đã được phản ánh trong quy tắc nghiệp vụ ở 3.2.6."),
    fr("fr_ot", "Quản lý đơn hàng", [
        ["FR-OT-01, 02", "Timeline 5 mốc (Xác nhận → Đang in → Đóng gói → Đang giao → Hoàn thành); ẩn mốc Đang in với đơn toàn hàng có sẵn; trạng thái ngoại lệ hiện bằng nhãn riêng", "01", "M", "Đã làm"],
        ["FR-OT-03", "Trang Lịch sử đơn hàng: lọc theo trạng thái, tìm theo mã đơn", "01", "M", "Đã làm"],
        ["FR-OT-04", "Hiển thị khoảng ngày giao dự kiến tính theo mẻ 16:00, thời gian xử lý và vận chuyển", "01", "M", "Đã làm"],
        ["FR-OT-05", "Hủy đơn COD trong thời gian đổi ý; hủy đơn khi thiết kế bị từ chối", "02, 05", "M", "Đã làm"],
        ["FR-OT-06", "Trang nhân viên: danh sách đơn, lọc theo loại và trạng thái, thao tác theo vai trò, ghi lịch sử trạng thái", "03", "M", "Đã làm"],
        ["FR-OT-07", "Trang mô phỏng: tạo đơn mẫu, giả lập webhook vận chuyển, tua thời gian, chạy tác vụ", "03", "M", "Mô phỏng"],
        ["FR-OT-08", "Nút “Đã nhận được hàng”; tự hoàn tất sau 72 giờ", "04", "M", "Đã làm"],
        ["FR-OT-09, 10", "Xử lý giao thất bại theo bên chịu lỗi; lưu kho 14 ngày, giao lại 1 lần, hủy khi quá hạn", "05, 06", "M", "Đã làm"],
        ["FR-OT-11, 16", "Báo sự cố trong 7 ngày; nhận kết quả khiếu nại (in lại, voucher, hoàn tiền, từ chối) và cập nhật đơn", "05", "M", "Đã làm"],
        ["FR-OT-12", "Gửi sự kiện sang Loyalty khi đơn hoàn tất", "04", "S", "Chưa làm"],
        ["FR-OT-13, 20", "Hoàn tiền có kiểm soát; hiển thị tiến độ yêu cầu hủy và hoàn tiền trên trang chi tiết", "02, 05", "M", "Đã làm"],
        ["FR-OT-14", "Ghi nhận lý do hủy, nhóm vi phạm, nguyên nhân giao thất bại, dữ liệu đối soát", "06", "S", "Đã làm"],
        ["FR-OT-15", "Operator duyệt bản thiết kế final: duyệt về Đã xác nhận, từ chối về Cần sửa thiết kế kèm nhóm vi phạm", "02, 06", "S", "Đã làm"],
        ["FR-OT-17", "Trang Chính sách đơn hàng và bằng chứng đồng ý (PolicyConsent)", "02, 05", "M", "Đã làm"],
        ["FR-OT-18", "Tự cấp voucher khi giao trễ so với ngày giao dự kiến muộn nhất", "01", "S", "Đã làm"],
        ["FR-OT-19", "Yêu cầu hủy đơn đã thanh toán; CSKH chấp nhận hoặc từ chối trong 1 ngày làm việc", "02, 05", "M", "Đã làm"]]),
    fr("fr_cs", "Hỗ trợ khách hàng", [
        ["FR-CS-01", "Nút chat nổi trên mọi trang: câu trả lời nhanh, số tin chưa đọc, đánh dấu đã giải quyết", "01", "M", "Đã làm"],
        ["FR-CS-02", "Trang Hỗ trợ: hướng dẫn 4 bước; tab Khiếu nại, Hỏi đáp, Chính sách", "01", "M", "Đã làm"],
        ["FR-CS-03", "Biểu mẫu khiếu nại: mã đơn, lý do, mô tả, minh chứng; yêu cầu đăng nhập", "02", "M", "Mô phỏng"],
        ["FR-CS-04", "Tóm tắt hội thoại bằng AI, có dự phòng theo quy tắc", "03", "S", "Một phần"],
        ["FR-CS-05", "Tạo phiếu khiếu nại gắn với đơn, tạm dừng đồng hồ tự hoàn tất", "04", "M", "Đã làm"],
        ["FR-CS-06", "CSKH xử lý phiếu và yêu cầu hủy trên trang nhân viên, trả kết quả về đơn", "04", "M", "Đã làm"]]),
    fr("fr_sr", "Tìm kiếm và gợi ý", [
        ["FR-SR-01", "Mở tìm kiếm từ ô ở header, phím Ctrl K hoặc nút Gợi ý; mỗi lần mở là ô trống, khóa cuộn trang nền", "01", "M", "Đã làm"],
        ["FR-SR-02", "Trước khi gõ: tìm gần đây, từ khóa phổ biến, dòng máy, mẫu đang hot", "01", "S", "Đã làm"],
        ["FR-SR-03", "Kết quả theo nhóm (mẫu thiết kế, ốp có sẵn, hỗ trợ) sau 150 ms; điều hướng bằng phím mũi tên", "01", "M", "Đã làm"],
        ["FR-SR-04", "Hiểu tiếng Việt: không dấu, sai một chữ, từ đồng nghĩa, nhận diện dòng máy", "01", "M", "Đã làm"],
        ["FR-SR-05", "Lối tắt mã đơn dạng CC-xxxxxx-xxxx mở trang theo dõi đơn", "01", "S", "Đã làm"],
        ["FR-SR-06", "Gợi ý theo mô tả: hiện “Mình hiểu bạn muốn…”, tối đa 12 thẻ kèm lý do", "02", "M", "Đã làm"],
        ["FR-SR-07", "Tìm bằng ảnh: bảng màu, tên tông, mẫu cùng tông; không có thì hiện mẫu gần nhất", "03", "S", "Đã làm"],
        ["FR-SR-08", "Trang /tim-kiem: tab theo loại, lọc phong cách, sắp xếp theo giá; nút “Tự thiết kế với ý tưởng này”", "01, 04", "M", "Đã làm"],
        ["FR-SR-09", "Ghi nhật ký từ khóa không có dữ liệu cá nhân; gỡ các ô tìm trùng ở Cửa hàng và Studio", "05", "S", "Đã làm"]]),

    ("h3", "3.3.2. Yêu cầu phi chức năng"),
    ("table", "nfr", "Yêu cầu phi chức năng", ["Mã", "Nhóm", "Yêu cầu", "Cách đáp ứng"],
     [["NFR-01", "Bảo mật dữ liệu", "Khách chỉ truy cập dữ liệu của mình; thao tác nghiệp vụ không thể bị giả mạo từ trình duyệt", "RLS trên mọi bảng; thay đổi trạng thái đơn chỉ qua RPC security definer có kiểm tra vai trò; trình duyệt chỉ giữ khóa publishable"],
      ["NFR-02", "Xác thực, phân quyền", "Tách quyền khách và 3 vai trò nhân viên", "Supabase Auth + profiles.role; route guard bất đồng bộ cho /admin"],
      ["NFR-03", "Toàn vẹn", "Không mất cập nhật khi nhiều người thao tác cùng một đơn; không có trạng thái hay số tiền sai", "Khóa lạc quan orders.version; ràng buộc CHECK cho status_detail và tiền không âm; webhook idempotent theo event_id"],
      ["NFR-04", "Hiệu năng", "Trang tải nhanh trên di động; tìm kiếm phản hồi tức thì", "Nạp lười theo route và kho mẫu; ảnh lazy; tìm kiếm dưới 50 ms trên trình duyệt; mục tiêu LCP dưới 2,5 giây"],
      ["NFR-05", "Khả dụng, tiếp cận", "Dùng tốt trên di động và máy tính; đạt WCAG 2.1 mức AA", "Thiết kế responsive; tương phản màu; dùng được bằng bàn phím; nhãn aria; không dùng đồng hồ đếm ngược gây áp lực"],
      ["NFR-06", "Bản địa hóa", "Phù hợp người dùng Việt Nam", "Giao diện tiếng Việt; tiền VND; múi giờ Asia/Ho_Chi_Minh; ngày làm việc Thứ 2–Thứ 6"],
      ["NFR-07", "Bảo trì", "Các phân hệ do nhiều thành viên phát triển mà không phụ thuộc chéo", "Angular standalone, OnPush, signals; core không import features (cổng OrderIntake, SEARCH_SOURCES); migration có rollback"],
      ["NFR-08", "Riêng tư", "Không thu thập quá mức dữ liệu cá nhân", "Ảnh tìm kiếm xử lý tại trình duyệt; nhật ký tìm kiếm ẩn danh; minh chứng khiếu nại chỉ CSKH xem"],
      ["NFR-09", "Tin cậy tác vụ nền", "Mốc thời gian (chốt mẻ, tự hoàn tất, tự hủy) không bị bỏ sót", "pg_cron chạy mỗi phút, có cơ chế bắt kịp cho đơn lỡ mốc"],
      ["NFR-10", "Kiểm chứng", "Logic nghiệp vụ có kiểm thử tự động", "Unit test lõi miền (Vitest); kiểm thử migration trên PGlite"]],
     [1.6, 2.6, 5.3, 6.4], 10.5),
]
