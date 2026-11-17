"""3.2 Quy trình nghiệp vụ TO-BE và yêu cầu nghiệp vụ."""

W = [2.5, 13.4]  # BR table widths


def br(key, fn, rows):
    return ("table", key, f"Yêu cầu nghiệp vụ phân hệ {fn}", ["Mã", "Yêu cầu nghiệp vụ"], rows, W)


B = [
    ("h2", "3.2. Quy trình nghiệp vụ TO-BE và yêu cầu nghiệp vụ"),
    ("p", "Mỗi phân hệ được trình bày theo cùng một khung: (a) mục đích, tức phân hệ giải quyết điểm nghẽn nào; (b) yêu cầu nghiệp vụ BR; "
          "(c) quy trình TO-BE bằng BPMN; (d) quy tắc nghiệp vụ chính mà hệ thống phải tuân theo. Quy tắc nghiệp vụ được đặt ngay dưới quy trình của phân hệ "
          "để người đọc theo dõi liền mạch. Quy tắc nào đã được cài đặt ở tầng cơ sở dữ liệu hoặc RPC thì có ghi chú tên đối tượng tương ứng."),

    # ---------------------------------------------------------------- AUTH
    ("h3", "3.2.1. Phân hệ Xác thực (AUTH)"),
    ("h4", "a) Mục đích"),
    ("p", "Xác thực là cổng vào cho mọi thao tác có lưu dữ liệu: lưu thiết kế, giỏ hàng, đặt và theo dõi đơn. Phân hệ còn tách khách hàng với nhân viên trên cùng một hệ thống tài khoản, "
          "làm nền cho phân quyền ở trang vận hành. Điểm khác biệt so với website thông thường là khách được dùng thử Studio trước khi đăng ký. "
          "Khi cần lưu, khách đăng nhập rồi quay lại đúng màn hình đang dở, không mất công sức đã bỏ ra."),
    ("h4", "b) Yêu cầu nghiệp vụ"),
    br("br_auth", "Xác thực", [
        ["BR-AUTH-01", "Khách vãng lai cần tạo tài khoản nhanh bằng email và mật khẩu để lưu thiết kế, giỏ hàng và đơn hàng."],
        ["BR-AUTH-02", "Khách cần đăng nhập lại và tiếp tục đúng tác vụ đang dở (lưu thiết kế, thêm giỏ, thanh toán)."],
        ["BR-AUTH-03", "Khách cần lấy lại quyền truy cập an toàn khi quên mật khẩu."],
        ["BR-AUTH-04", "Doanh nghiệp cần thu thập dòng máy và sở thích ngay sau đăng ký để cá nhân hóa gợi ý, nhưng không ép khách."],
        ["BR-AUTH-05", "Doanh nghiệp cần phân quyền nhân viên (Operator, CSKH, Admin) trên cùng hệ thống tài khoản, tách biệt với giao diện khách."]]),
    ("h4", "c) Quy trình nghiệp vụ"),
    ("p", "{F:bp_auth} mô tả luồng đăng ký, đăng nhập và onboarding. Khi khách bấm một chức năng cần tài khoản, website mở cửa sổ đăng nhập hoặc đăng ký. "
          "Dữ liệu được kiểm tra định dạng rồi gửi tới Supabase Auth. Nếu không hợp lệ, website báo lỗi theo từng trường và khách nhập lại. "
          "Nếu hợp lệ, phiên đăng nhập được tạo và một trigger tự tạo hồ sơ ở trạng thái chờ onboarding. Khách chưa onboarding được mời chọn dòng máy và sở thích, hoặc bỏ qua. "
          "Cuối cùng website đưa khách về màn hình đang dở. Luồng khôi phục mật khẩu gửi liên kết đặt lại qua email; khi đặt lại xong, phiên cũ bị đăng xuất."),
    ("fig", "bp_auth", "BPMN-AUTH-01_dang-ky-dang-nhap", "BPMN-AUTH-01: Đăng ký, đăng nhập và onboarding", "l", 24.5),
    ("h4", "d) Quy tắc nghiệp vụ"),
    ("bul", [
        "Email là định danh duy nhất. Mật khẩu tối thiểu 8 ký tự, có cả chữ và số; xác nhận mật khẩu phải khớp.",
        "Hồ sơ (profiles) được tạo tự động khi tài khoản được tạo, với onboarding_status = pending và role = customer.",
        "Onboarding chỉ hỏi một lần: hoàn tất thì lưu completed, bỏ qua thì lưu skipped. Ở Checkout, hệ thống hỏi khách trước khi chuyển sang onboarding.",
        "Trang /admin chỉ mở cho tài khoản có role thuộc {operator, cskh, admin}. Mỗi vai trò chỉ thấy thao tác của mình; admin làm được mọi vai trò.",
        "Đăng nhập Google hiện dùng một tài khoản demo cố định (mô phỏng OAuth).",
    ]),

    # ---------------------------------------------------------------- PM
    ("h3", "3.2.2. Phân hệ Trang chủ và hồ sơ cá nhân (PM)"),
    ("h4", "a) Mục đích"),
    ("p", "Trang chủ dẫn khách vào hai luồng mua chính (mua ốp có sẵn và tự thiết kế) cùng ô tìm kiếm. My Profile là nơi khách tự quản lý thông tin, sổ địa chỉ, thiết kế đã lưu "
          "và lịch sử đơn hàng, thay cho việc hỏi lại nhân viên qua tin nhắn (P5)."),
    ("h4", "b) Yêu cầu nghiệp vụ"),
    br("br_pm", "Trang chủ và hồ sơ", [
        ["BR-PM-01", "Doanh nghiệp cần trang chủ giới thiệu bộ sưu tập và dẫn nhanh tới Cửa hàng, Studio thiết kế, Tìm kiếm."],
        ["BR-PM-02", "Khách cần xem và cập nhật thông tin cá nhân (tên hiển thị, ảnh đại diện, dòng máy, sở thích)."],
        ["BR-PM-03", "Khách cần lưu nhiều địa chỉ nhận hàng và chọn một địa chỉ mặc định để thanh toán nhanh."],
        ["BR-PM-04", "Khách cần xem lại thiết kế đã lưu và lịch sử đơn hàng tại một chỗ; chi tiết đơn do phân hệ OT hiển thị."],
        ["BR-PM-05", "Khách cần đổi mật khẩu và yêu cầu xóa tài khoản có xác minh."]]),
    ("h4", "c) Quy trình nghiệp vụ"),
    ("p", "Theo {F:bp_pm}, khi khách truy cập, website hiển thị trang chủ gồm banner, bộ sưu tập và các lối vào. Khách có nhu cầu khám phá được chuyển sang Cửa hàng, Studio hoặc Tìm kiếm. "
          "Khách muốn quản lý hồ sơ phải đăng nhập trước (BPMN-AUTH-01). Sau đó khách chọn tab hồ sơ, địa chỉ, thiết kế hoặc đơn hàng; dữ liệu cập nhật được kiểm tra rồi mới lưu."),
    ("fig", "bp_pm", "BPMN-PM-01_trang-chu-ho-so", "BPMN-PM-01: Trang chủ và quản lý hồ sơ cá nhân", "l", 24.5),
    ("h4", "d) Quy tắc nghiệp vụ"),
    ("bul", [
        "Mỗi khách chỉ có một địa chỉ mặc định. Địa chỉ bắt buộc có người nhận, số điện thoại, địa chỉ chi tiết, phường/xã và tỉnh/thành.",
        "Chính sách RLS (Row Level Security) chỉ cho khách đọc và sửa hồ sơ, địa chỉ, thiết kế, đơn của chính mình.",
        "Tab Đơn hàng chỉ liệt kê đơn và dẫn sang trang chi tiết của OT, không xử lý nghiệp vụ đơn tại đây.",
        "Yêu cầu xóa tài khoản cần chọn lý do và nhập mã OTP 4–6 chữ số.",
    ]),

    # ---------------------------------------------------------------- SH
    ("h3", "3.2.3. Phân hệ Cửa hàng (SH)"),
    ("h4", "a) Mục đích"),
    ("p", "Cửa hàng phục vụ khách muốn mua nhanh ốp có sẵn với giá dễ tiếp cận. Đây cũng là nơi quản lý giỏ hàng chung của toàn website, "
          "để một đơn có thể gồm cả hàng có sẵn lẫn hàng thiết kế."),
    ("h4", "b) Yêu cầu nghiệp vụ"),
    br("br_sh", "Cửa hàng", [
        ["BR-SH-01", "Khách cần duyệt và lọc ốp có sẵn theo phong cách, khoảng giá và dòng máy."],
        ["BR-SH-02", "Khách cần xem chi tiết sản phẩm (ảnh, xem 3D, chất liệu, giá, tình trạng tồn kho) trước khi mua."],
        ["BR-SH-03", "Khách cần một giỏ hàng duy nhất cho cả hàng có sẵn và hàng thiết kế, sửa được số lượng trước khi thanh toán."],
        ["BR-SH-04", "Doanh nghiệp cần ngăn bán vượt tồn kho và trả lại tồn khi đơn bị hủy."]]),
    ("h4", "c) Quy trình nghiệp vụ"),
    ("p", "{F:bp_sh} mô tả luồng mua ốp có sẵn. Khách xem danh mục, lọc, rồi mở chi tiết. Hết hàng thì khách chọn mẫu khác; còn hàng thì khách chọn dòng máy và thêm vào giỏ. "
          "Nếu chưa đăng nhập, website yêu cầu đăng nhập. Sản phẩm được thêm vào giỏ chung và ngăn giỏ hàng mở ra; khách mua tiếp hoặc sang Thanh toán."),
    ("fig", "bp_sh", "BPMN-SH-01_mua-op-co-san", "BPMN-SH-01: Mua ốp có sẵn", "l", 24.5),
    ("h4", "d) Quy tắc nghiệp vụ"),
    ("bul", [
        "Số lượng thêm giỏ không vượt quá tồn khả dụng (view stock_availability = tồn thực trừ phần đã giữ cho đơn đang mở).",
        "Thêm vào giỏ yêu cầu đăng nhập. Danh sách yêu thích được lưu trên trình duyệt.",
        "Giỏ hàng là duy nhất (CartState). Dòng hàng thiết kế có số lượng 1 cho mỗi thiết kế và mang theo snapshot thiết kế.",
        "Giá sản phẩm lấy theo biến thể (product_variants.price). Giá hàng thiết kế lấy theo dòng máy (phone_models.custom_price).",
    ]),

    # ---------------------------------------------------------------- DES
    ("h3", "3.2.4. Phân hệ Studio thiết kế (DES)"),
    ("h4", "a) Mục đích"),
    ("p", "Studio là điểm khác biệt chính của CasEYE's, giải quyết P1 và P3. Khách không cần kỹ năng đồ họa vẫn tạo được ốp độc bản: bắt đầu từ mẫu có sẵn hoặc phôi trắng, "
          "chỉnh trên canvas theo đúng khung ốp và xem trước 2D/3D. Kiểm tra tự động ngay lúc thiết kế giúp giảm số thiết kế bị từ chối ở khâu duyệt in (P2)."),
    ("h4", "b) Yêu cầu nghiệp vụ"),
    ("p", "Bảng dưới trích các yêu cầu nghiệp vụ chính từ tài liệu BRD/SRD Studio thiết kế của nhóm, giữ nguyên mã gốc để truy vết."),
    br("br_des", "Studio thiết kế", [
        ["BR-DES-01", "Khách cần chọn đúng dòng máy trước khi thiết kế để ốp vừa khít và in được."],
        ["BR-DES-02", "Khách cần chọn điểm bắt đầu phù hợp: khám phá mẫu có sẵn hoặc tự thiết kế từ đầu."],
        ["BR-DES-03", "Khách cần mô tả mong muốn bằng ngôn ngữ tự nhiên và nhận lại các mẫu phù hợp."],
        ["BR-DES-05", "Khách cần công cụ chỉnh sửa trực quan (ảnh, chữ, sticker, nền) và thấy kết quả ngay."],
        ["BR-DES-06", "Khách cần xem trước thiết kế trên hình dạng ốp thật (2D/3D) trước khi trả tiền."],
        ["BR-DES-07", "Khách cần được báo trước vùng in và giới hạn tệp tải lên để thiết kế không lỗi khi sản xuất."],
        ["BR-DES-08", "Khách cần lưu thiết kế dang dở để tiếp tục hoặc đặt mua sau."],
        ["BR-DES-09", "Khách vãng lai cần dùng thử Studio mà không bị buộc đăng ký trước, và không mất công sức khi đăng ký sau."],
        ["BR-DES-10", "Khách cần đưa đúng bản thiết kế đã xem trước vào giỏ hàng."],
        ["BR-DES-13", "Doanh nghiệp cần ngăn sản xuất thiết kế chứa nội dung bị pháp luật cấm."],
        ["BR-DES-14", "Doanh nghiệp cần bảo đảm ảnh và chữ không xâm phạm quyền sở hữu trí tuệ, quyền hình ảnh của bên thứ ba."],
        ["BR-DES-15", "Khách cần biết trước quy định nội dung và được giải thích rõ nếu thiết kế bị từ chối."]]),
    ("h4", "c) Quy trình nghiệp vụ"),
    ("p", "Theo {F:bp_des}, khách chọn hãng và dòng máy (chỉ các dòng còn phôi), rồi chọn mẫu có sẵn hoặc phôi trắng; có thể dùng gợi ý theo mô tả. "
          "Khách mua ngay mẫu thì đi thẳng tới bước xem trước. Ngược lại, khách chỉnh trên canvas và website kiểm tra tự động vùng in, định dạng ảnh và từ khóa cấm. "
          "Không đạt thì website báo lỗi để khách sửa; đạt thì khách xem trước 2D/3D rồi chọn lưu vào My Designs hoặc thêm vào giỏ. "
          "Thêm vào giỏ sẽ đóng gói snapshot thiết kế (ảnh xem trước, cấu hình, cờ có ảnh tải lên) để sang Thanh toán."),
    ("fig", "bp_des", "BPMN-DES-01_thiet-ke-op", "BPMN-DES-01: Thiết kế ốp cá nhân hóa", "l", 24.5),
    ("h4", "d) Quy tắc nghiệp vụ"),
    ("bul", [
        "Chỉ mở các dòng máy còn phôi (phone_models.is_active và tồn phôi trong inventory_items).",
        "Nội dung không được đặt ngoài vùng in an toàn (safe zone) của dòng máy. Ảnh tải lên chỉ nhận PNG/JPG, tối đa 10 MB.",
        "Chữ khách nhập được lọc theo danh sách từ khóa cấm. Kiểm tra tự động chỉ là bước sơ bộ; bản final vẫn do Operator duyệt sau thanh toán (UC-OT-11).",
        "Khách vãng lai bấm Lưu hoặc Thêm giỏ: dữ liệu được ghi tạm trên trình duyệt, rồi chuyển vào tài khoản sau khi đăng nhập.",
        "Thiết kế bị từ chối được đánh dấu và không đặt mua lại được cho tới khi khách sửa.",
    ]),

    # ---------------------------------------------------------------- P
    ("h3", "3.2.5. Phân hệ Thanh toán (P)"),
    ("h4", "a) Mục đích"),
    ("p", "Thanh toán thay chuỗi chuyển khoản thủ công và gửi biên lai (P4) bằng một luồng tự động. Hệ thống tính đúng tiền hàng, phí giao, giảm giá và ngày giao dự kiến, "
          "áp ràng buộc theo loại hàng, thu tiền qua cổng thanh toán (mô phỏng) và tạo đơn chuyển sang phân hệ OT."),
    ("h4", "b) Yêu cầu nghiệp vụ"),
    br("br_p", "Thanh toán", [
        ["BR-P-01", "Khách cần hoàn tất đặt hàng ngay trên website và thấy rõ cấu thành tổng tiền (hàng, phí giao, giảm giá)."],
        ["BR-P-02", "Doanh nghiệp cần thu trước 100% cho đơn có hàng thiết kế (in độc bản); COD chỉ áp dụng cho đơn toàn hàng có sẵn."],
        ["BR-P-03", "Khách cần chọn gói giao và biết ngày giao dự kiến trước khi đặt."],
        ["BR-P-04", "Doanh nghiệp cần bằng chứng khách đã đồng ý chính sách đơn hàng tại thời điểm đặt."],
        ["BR-P-05", "Khi thanh toán gián đoạn, khách cần thử lại hoặc đổi phương thức mà không mất đơn."]]),
    ("h4", "c) Quy trình nghiệp vụ"),
    ("p", "{F:bp_p} mô tả luồng thanh toán. Website nạp giỏ và xác định loại hàng. Khách chọn địa chỉ và gói giao; website tính phí, ngày giao dự kiến, "
          "đồng thời khóa COD và Hỏa tốc nếu giỏ có hàng thiết kế. Khách áp voucher, chọn phương thức và tự tick ô đồng ý chính sách. "
          "Với COD, đơn được tạo ngay ở trạng thái Chờ xác nhận. Với trả trước, website chuyển sang cổng thanh toán; thành công thì tạo đơn và lưu PolicyConsent, "
          "thất bại thì khách thử lại hoặc đổi phương thức, vẫn giữ nguyên mã đơn. Màn thành công có nút “Theo dõi đơn hàng”."),
    ("fig", "bp_p", "BPMN-P-01_thanh-toan", "BPMN-P-01: Thanh toán và tạo đơn", "l", 24.5),
    ("h4", "d) Quy tắc nghiệp vụ"),
    ("bul", [
        "Gói giao: Tiêu chuẩn 25.000 đ (1–2 ngày vận chuyển); Hỏa tốc 45.000 đ, giao trong ngày nếu xác nhận trước 14:00, chỉ cho đơn toàn hàng có sẵn.",
        "Phương thức trả trước (VietQR, ví MoMo/ZaloPay/ShopeePay, thẻ) đều quy về QR_Transfer khi sang OT; kênh cụ thể lưu ở orders.payment_channel.",
        "Ô đồng ý chính sách không được tick sẵn. Thời điểm và phiên bản chính sách được lưu vào policy_consents.",
        "Tổng tiền = tiền hàng + phí giao + phụ phí Hỏa tốc − giảm giá (không âm, ràng buộc orders_money_check).",
        "Voucher CASEFIRST (50.000 đ) và VIP30 (30.000 đ) hiện là dữ liệu mẫu ở Checkout.",
    ]),

    # ---------------------------------------------------------------- OT
    ("h3", "3.2.6. Phân hệ Quản lý đơn hàng (OT)"),
    ("h4", "a) Mục đích"),
    ("p", "OT giải quyết P5 và phần còn lại của P2. Khách thấy tiến độ thật và ngày giao dự kiến; hủy, hoàn tiền, khiếu nại theo quy tắc công bố. "
          "Doanh nghiệp có luồng xử lý tuần tự, có lưu vết và phân quyền. Mọi thay đổi trạng thái đi qua RPC trên PostgreSQL với khóa lạc quan (orders.version), "
          "nên khách và nhân viên không ghi đè lẫn nhau."),
    ("h4", "b) Yêu cầu nghiệp vụ"),
    br("br_ot", "Quản lý đơn hàng", [
        ["BR-OT-01", "Khách cần theo dõi tiến độ kiểm tra thiết kế, sản xuất, giao nhận và có khoảng ngày giao dự kiến được cam kết bằng ưu đãi nếu giao trễ."],
        ["BR-OT-02", "Doanh nghiệp cần định tuyến đơn: đơn toàn hàng có sẵn đi thẳng vào đóng gói; đơn có hàng thiết kế phải được duyệt bản final trước khi vào mẻ in. Khách được tự hủy đơn COD trong thời gian đổi ý ngắn."],
        ["BR-OT-03", "Doanh nghiệp cần cập nhật sản xuất, QC, đóng gói, vận chuyển theo luồng tuần tự có lưu vết để quy trách nhiệm khi có sự cố."],
        ["BR-OT-04", "Cần một mốc đóng đơn chính thức: khách xác nhận, hoặc hệ thống tự đóng sau 72 giờ kể từ khi giao (tạm dừng khi có khiếu nại)."],
        ["BR-OT-05", "Khách cần kênh báo sự cố từ chi tiết đơn; doanh nghiệp cần quy tắc minh bạch cho giao thất bại và hoàn tiền có kiểm soát (chỉ 4 nhóm tình huống, Admin xác nhận chuyển khoản)."],
        ["BR-OT-06", "Doanh nghiệp cần ghi nhận dữ liệu sau mua (lý do hủy, nhóm vi phạm thiết kế, nguyên nhân giao thất bại, lý do khiếu nại) để phân tích và tối ưu vận hành."]]),
    ("h4", "c) Quy trình nghiệp vụ"),
    ("p", "Quy trình chính ({F:bp_ot1}) bắt đầu khi website nhận đơn từ Thanh toán. Đơn có hàng thiết kế chờ Operator duyệt bản final. "
          "Không đạt thì đơn chuyển Cần sửa thiết kế; khách sửa và gửi lại trong 7 ngày. Đơn đạt và đơn toàn hàng có sẵn chờ mẻ; riêng đơn COD còn trong thời gian đổi ý 30 phút. "
          "Đúng 16:00, bộ lập lịch chốt mẻ: hàng thiết kế được in UV và kiểm định QC, rồi cùng hàng có sẵn được đóng gói và bàn giao vận chuyển. "
          "Webhook của đơn vị vận chuyển cập nhật trạng thái và website thông báo cho khách. Giao được thì đơn chờ khách xác nhận, hoặc tự hoàn tất sau 72 giờ; "
          "giao thất bại thì chuyển sang luồng ngoại lệ."),
    ("fig", "bp_ot1", "BPMN-OT-01_xu-ly-giao-don", "BPMN-OT-01: Xử lý, sản xuất và giao đơn", "l", 24.5),
    ("p", "Luồng ngoại lệ ({F:bp_ot2}) gom ba tình huống. Thứ nhất, hủy đơn COD trong thời gian đổi ý: website kiểm tra nguyên tử, hủy đơn và trả tồn kho, không phát sinh tiền. "
          "Thứ hai, hủy đơn đã thanh toán: website giữ đơn và tạo yêu cầu hủy với hạn phản hồi 1 ngày làm việc để CSKH xem xét. "
          "Thứ ba, báo sự cố sau khi nhận hàng (trong 7 ngày): hệ thống tạo phiếu và tạm dừng đồng hồ tự hoàn tất. "
          "Kết quả xử lý là tiếp tục đơn, in lại, cấp voucher, hoặc chấp nhận hủy/hoàn tiền. Với hoàn tiền, khách cung cấp tài khoản nhận; "
          "Admin duyệt, chuyển khoản và ghi mã đối soát; đơn chuyển Đã hoàn tiền."),
    ("fig", "bp_ot2", "BPMN-OT-02_huy-su-co-hoan-tien", "BPMN-OT-02: Hủy đơn, báo sự cố và hoàn tiền", "l", 24.5),
    ("p", "Đơn hàng có 12 trạng thái chi tiết (orders.status_detail), ánh xạ về 5 trạng thái lớn (enum order_status) mà các phân hệ khác dùng. "
          "Các chuyển trạng thái hợp lệ được định nghĩa trong máy trạng thái ({F:st_ot}); mọi bước nhảy không có trong sơ đồ đều bị từ chối."),
    ("fig", "st_ot", "ST-OT_trang-thai-don-hang", "ST-OT: Máy trạng thái đơn hàng", "l", 24),
    ("h4", "d) Quy tắc nghiệp vụ"),
    ("bul", [
        "Ánh xạ trạng thái: pending ← Pending_Review, Pending_Confirmation, Action_Required; confirmed ← In_Production, Ready_for_Pickup; shipping ← In_Transit, Delivery_Failed; "
        "delivered ← Delivered, Completed, Return_Requested; cancelled ← Cancelled, Refunded (hàm order_status_for).",
        "Đơn COD chỉ tự hủy được khi đang Pending_Confirmation và chưa quá thời điểm confirm_due_at (30 phút). Giao diện không hiển thị đồng hồ đếm ngược.",
        "Đơn trả trước muốn hủy phải gửi yêu cầu (lý do: phí giao cao, đổi ý, sai dòng máy, sai địa chỉ, khác). Mỗi đơn chỉ có một yêu cầu đang chờ; khách được rút lại.",
        "Thiết kế bị từ chối: nhắc khách vào ngày thứ 3; quá 7 ngày không sửa thì hủy và hoàn 100% (tình huống S2).",
        "Ngày giao dự kiến = ngày vào mẻ + thời gian xử lý (hàng có sẵn 1–2 ngày làm việc, hàng thiết kế 2–3 ngày) + thời gian vận chuyển do Thanh toán cung cấp. "
        "Xác nhận trước 16:00 thì vào mẻ cùng ngày.",
        "Giao thất bại: lưu kho 14 ngày, giao lại tối đa 1 lần. Lỗi do khách thì khách chịu cước giao lại; hàng thiết kế quá hạn lưu kho sẽ bị tiêu hủy.",
        "Báo sự cố trong 7 ngày kể từ khi giao, mỗi đơn chỉ một yêu cầu đang mở. Khi có phiếu, đồng hồ tự hoàn tất 72 giờ tạm dừng (orders.frozen_at).",
        "Giao trễ so với latest_edd (trừ lỗi do khách hoặc bất khả kháng): tự cấp voucher 10% tiền hàng, tối đa 30.000 đ, hạn 30 ngày.",
        "Sự kiện webhook được xử lý idempotent theo event_id (bảng webhook_events), nên sự kiện trùng hoặc sai thứ tự không làm sai trạng thái.",
    ]),
    ("p", "Hoàn tiền không tự động. Hệ thống chỉ tạo yêu cầu hoàn tiền khi đơn thỏa một trong các tình huống ở {T:refund}; mọi khoản chi đều do Admin xác nhận."),
    ("table", "refund", "Tình huống hoàn tiền (refund_requests.situation)", ["Mã", "Tình huống", "Điều kiện", "Mức hoàn"],
     [["S1", "Khách hủy đơn đã thanh toán khi chưa sản xuất", "CSKH chấp nhận yêu cầu hủy khi đơn còn Pending_Review hoặc Pending_Confirmation", "100%"],
      ["S2", "Thiết kế bị từ chối, khách hủy hoặc quá 7 ngày không sửa", "Đơn Action_Required có lượt duyệt kết quả rejected", "100%"],
      ["S3a", "Giao thất bại không do khách", "Nguyên nhân thuộc đơn vị vận chuyển hoặc shop; khách chọn hủy và hoàn", "100%"],
      ["S3b", "Giao thất bại do khách, đơn toàn hàng có sẵn đã trả trước", "Khách chọn hủy hoặc quá hạn lưu kho", "Tiền hàng trừ cước giao hai chiều"],
      ["S3c", "Giao thất bại do khách, đơn có hàng thiết kế", "Giao lại lần 2 thất bại hoặc quá hạn lưu kho", "Không hoàn"],
      ["S4", "Khiếu nại được chấp nhận", "CSKH quyết định hoàn tiền cho đơn Return_Requested", "100%"]],
     [1.2, 5.2, 6.4, 3.1]),

    # ---------------------------------------------------------------- CS
    ("h3", "3.2.7. Phân hệ Hỗ trợ khách hàng (CS)"),
    ("h4", "a) Mục đích"),
    ("p", "CS cung cấp kênh hỏi nhanh ngay trên mọi trang và kênh khiếu nại có cấu trúc, gắn với đơn hàng, thay cho việc nhắn tin tự do (P5). "
          "Bản tóm tắt hội thoại giúp CSKH nắm vấn đề trước khi xử lý, giảm thời gian hỏi lại."),
    ("h4", "b) Yêu cầu nghiệp vụ"),
    br("br_cs", "Hỗ trợ khách hàng", [
        ["BR-CS-01", "Khách cần hỏi nhanh về đơn hàng, chính sách, sản phẩm ngay trên trang đang xem."],
        ["BR-CS-02", "Khách cần gửi khiếu nại có mã đơn, lý do, mô tả và minh chứng, rồi theo dõi được kết quả."],
        ["BR-CS-03", "CSKH cần bản tóm tắt vấn đề của khách trước khi tiếp nhận."],
        ["BR-CS-04", "Doanh nghiệp cần khiếu nại liên thông với đơn hàng: tạm dừng đếm giờ, trả kết quả in lại, voucher, hoàn tiền hoặc từ chối về đơn."]]),
    ("h4", "c) Quy trình nghiệp vụ"),
    ("p", "Theo {F:bp_cs}, khách mở chat hỗ trợ hoặc trang Hỗ trợ. Với hỏi đáp, website trả lời nhanh theo chủ đề và dẫn tới chính sách. "
          "Nếu đã giải quyết, khách đánh dấu xong và hội thoại được xóa; nếu chưa, website tóm tắt hội thoại để CSKH tiếp nhận, xác minh mã đơn và hướng dẫn. "
          "Với khiếu nại, khách đăng nhập và nhập mã đơn, lý do, mô tả, minh chứng; website tạo phiếu gắn với đơn và chuyển CSKH xử lý theo BPMN-OT-02."),
    ("fig", "bp_cs", "BPMN-CS-01_ho-tro-khach-hang", "BPMN-CS-01: Hỗ trợ khách hàng", "l", 24.5),
    ("h4", "d) Quy tắc nghiệp vụ"),
    ("bul", [
        "Lý do khiếu nại gồm: sai màu, in lệch, hư hỏng, sai dòng máy. Gửi khiếu nại yêu cầu đăng nhập bằng tài khoản đặt hàng.",
        "Tóm tắt hội thoại gọi máy chủ AI qua /api/support/ai-summary (giới hạn 4,5 giây). Khi máy chủ không phản hồi, hệ thống tóm tắt theo quy tắc và ghi rõ là bản tóm tắt tự động. "
        "Không lưu khóa AI ở trình duyệt.",
        "Hội thoại chỉ bị xóa khi khách tự đánh dấu đã giải quyết và xác nhận.",
        "Phiếu khiếu nại thật hiện được tạo qua nút “Báo sự cố” trong chi tiết đơn (RPC report_issue, lưu orders.ticket_id). Biểu mẫu ở trang Hỗ trợ là bản xem thử.",
    ]),

    # ---------------------------------------------------------------- SR
    ("h3", "3.2.8. Phân hệ Tìm kiếm và gợi ý (SR)"),
    ("h4", "a) Mục đích"),
    ("p", "SR giải quyết P3: khách không biết gọi tên mẫu vẫn tìm được ốp hợp ý, bằng từ khóa, bằng mô tả tự nhiên hoặc bằng ảnh tham khảo. "
          "Trước đây website có ba ô tìm rời nhau (header chỉ tìm hàng Shop, Shop có ô lọc riêng, Studio có bộ lọc riêng). SR gộp lại thành một ô tìm duy nhất cho cả site."),
    ("h4", "b) Yêu cầu nghiệp vụ"),
    br("br_sr", "Tìm kiếm và gợi ý", [
        ["BR-SR-01", "Khách cần một ô tìm duy nhất cho ốp có sẵn, mẫu thiết kế và trang hỗ trợ."],
        ["BR-SR-02", "Khách cần mô tả bằng lời (màu, phong cách, chủ đề, dịp tặng) và nhận gợi ý kèm lý do."],
        ["BR-SR-03", "Khách cần tìm mẫu có tông màu gần ảnh tham khảo; ảnh không được gửi ra ngoài trình duyệt."],
        ["BR-SR-04", "Khi không có kết quả, khách vẫn cần đường đi tiếp (gợi ý theo mô tả hoặc tự thiết kế với ý tưởng đó)."],
        ["BR-SR-05", "Doanh nghiệp cần biết khách hay tìm gì và tìm gì mà không ra, nhưng không lưu dữ liệu cá nhân."]]),
    ("h4", "c) Quy trình nghiệp vụ"),
    ("p", "{F:bp_sr} mô tả ba cách tìm. Từ khóa được chuẩn hóa tiếng Việt (bỏ dấu, sửa một lỗi gõ), nhận diện dòng máy và mã đơn, rồi xếp hạng. "
          "Gõ đúng dạng mã đơn thì website mở thẳng trang theo dõi đơn. Mô tả được phân tích thành các khái niệm (màu, phong cách, chủ đề, dịp, chất liệu) và chấm điểm kèm lý do. "
          "Ảnh được kiểm tra định dạng, sau đó hệ thống lấy bảng màu chủ đạo và so độ gần màu (ΔE trong không gian CIELAB) với bảng màu của từng mẫu. "
          "Có kết quả thì hiện theo nhóm; không có thì đề xuất gợi ý theo mô tả hoặc vào Studio cùng ý tưởng."),
    ("fig", "bp_sr", "BPMN-SR-01_tim-kiem-goi-y", "BPMN-SR-01: Tìm kiếm và gợi ý ốp", "l", 24.5),
    ("h4", "d) Quy tắc nghiệp vụ"),
    ("bul", [
        "Ô tìm không liệt kê đơn hàng. Chỉ khi chuỗi gõ đúng dạng CC-xxxxxx-xxxx mới hiện lối tắt “Mở đơn”; quyền xem do trang đơn kiểm tra.",
        "Trang hỗ trợ chỉ hiện khi chính chữ của trang khớp rõ, tối đa 2 mục. Hàng tạm hết vẫn hiện nhưng xếp sau.",
        "Gợi ý theo mô tả phải ghi lý do (ví dụ “Vì hợp với: tím · pastel”). Mô tả không chứa ý muốn nào nhận ra được thì không gợi ý ngẫu nhiên.",
        "Ảnh chỉ nhận JPG, PNG, WebP, tối đa 5 MB, và chỉ xử lý trong trình duyệt. Chỉ hiện mẫu có độ giống từ 0,4; không có thì nói thật và hiện 6 mẫu gần nhất.",
        "Nhật ký tìm kiếm chỉ lưu từ khóa, số kết quả, cách tìm và thời điểm.",
    ]),

    ("h3", "3.2.9. So sánh quy trình AS-IS và TO-BE"),
    ("table", "asis_tobe", "So sánh quy trình AS-IS và TO-BE", ["Khía cạnh", "AS-IS (kênh truyền thống)", "TO-BE (CasEYE's)"],
     [["Lên ý tưởng", "Khách tự tìm ảnh, nhắn mô tả cho shop", "Kho mẫu, tìm kiếm toàn site, gợi ý theo mô tả, tìm bằng ảnh"],
      ["Thiết kế, xem trước", "Nhân viên cắt ghép; bản mẫu 2D gửi qua chat", "Khách tự thiết kế trên canvas; xem trước 2D/3D theo khung ốp thật"],
      ["Duyệt mẫu", "Trước khi chốt đơn, qua Zalo, 1–2 giờ mỗi vòng", "Kiểm tra tự động lúc thiết kế; Operator duyệt bản final sau thanh toán, có lý do và hạn sửa"],
      ["Thanh toán", "Chuyển khoản tay, gửi biên lai, đối soát thủ công", "Checkout tự tính tiền, áp voucher, thanh toán qua cổng, tự tạo đơn"],
      ["Theo dõi đơn", "Nhắn tin hỏi nhân viên", "Timeline 5 mốc, 12 trạng thái chi tiết, ngày giao dự kiến, thông báo"],
      ["Hủy, hoàn tiền, khiếu nại", "Thỏa thuận qua chat, không có quy tắc công bố", "Quy tắc công bố; yêu cầu có SLA; hoàn tiền theo 4 nhóm tình huống, Admin xác nhận"],
      ["Dữ liệu vận hành", "Sổ tay, Excel rời rạc", "Cơ sở dữ liệu tập trung, lịch sử trạng thái, nhật ký tìm kiếm, dữ liệu hành vi sau mua"]],
     [3.3, 5.6, 7.0]),
]
