"""3.1 Tổng quan phân tích hệ thống."""

B = [
    ("h1", "CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG"),
    ("p", "Chương 3 chuyển các khoảng trống thị trường đã nhận diện ở Chương 1 thành yêu cầu cho hệ thống CasEYE's. Trình tự phân tích đi từ nhu cầu đến dữ liệu: "
          "(1) xác định nhu cầu và quy trình hiện tại (AS-IS); (2) đề xuất giải pháp và quy trình nghiệp vụ mới (TO-BE) cho từng phân hệ; (3) đặc tả yêu cầu chức năng, phi chức năng; "
          "(4) mô hình hóa bằng user story, use case, biểu đồ lớp; (5) thiết kế dữ liệu. Mọi mô tả bám theo mã nguồn và cơ sở dữ liệu đã triển khai trên Supabase của nhóm. "
          "Phần nào là mô phỏng hoặc chưa làm đều được ghi rõ. Các sơ đồ được vẽ theo chuẩn BPMN 2.0, UML 2.5 và ký pháp Crow's foot, kèm tệp .drawio để chỉnh sửa."),

    ("h2", "3.1. Tổng quan phân tích hệ thống"),
    ("h3", "3.1.1. Quy ước đặt tên"),
    ("p", "Nhằm tiếp cận phân tích một cách tường minh, đồ án dùng bộ quy ước đặt tên sau: BR (Business Requirement, yêu cầu nghiệp vụ), FR (Functional Requirement, yêu cầu chức năng), "
          "NFR (Non-functional Requirement, yêu cầu phi chức năng), UC (Use case), US (User story), BPMN (Business Process Model and Notation) và CD (Class Diagram). "
          "Mỗi mã gồm tiền tố, mã phân hệ và số thứ tự hai chữ số, ví dụ BR-OT-03 là yêu cầu nghiệp vụ thứ ba của phân hệ Quản lý đơn hàng."),
    ("table", "naming", "Quy ước đặt tên mô hình hóa", ["Phân hệ (function)", "Mã", "Quy ước đặt tên", "Phạm vi trong hệ thống"],
     [["Xác thực", "AUTH", "BR-AUTH, FR-AUTH, UC-AUTH, US-AUTH, BPMN-AUTH, CD-AUTH", "Đăng ký, đăng nhập, khôi phục mật khẩu, onboarding, đăng nhập nhân viên"],
      ["Trang chủ và hồ sơ cá nhân", "PM", "BR-PM, FR-PM, UC-PM, US-PM, BPMN-PM, CD-PM", "Trang chủ, My Profile (hồ sơ, sổ địa chỉ, thiết kế đã lưu, lịch sử đơn, bảo mật)"],
      ["Cửa hàng", "SH", "BR-SH, FR-SH, UC-SH, US-SH, BPMN-SH, CD-SH", "Danh mục ốp có sẵn, chi tiết sản phẩm, giỏ hàng chung"],
      ["Studio thiết kế", "DES", "BR-DES, FR-DES, UC-DES, US-DES, BPMN-DES, CD-DES", "Chọn dòng máy, kho mẫu, canvas, xem trước 2D/3D, lưu thiết kế"],
      ["Thanh toán", "P", "BR-P, FR-P, UC-P, US-P, BPMN-P, CD-P", "Checkout, phí giao, voucher, phương thức thanh toán, tạo đơn"],
      ["Quản lý đơn hàng", "OT", "BR-OT, FR-OT, UC-OT, US-OT, BPMN-OT, CD-OT", "Vòng đời đơn, duyệt thiết kế, giao vận, hủy, hoàn tiền, trang nhân viên"],
      ["Hỗ trợ khách hàng", "CS", "BR-CS, FR-CS, UC-CS, US-CS, BPMN-CS, CD-CS", "Chat hỗ trợ, câu hỏi thường gặp, chính sách, khiếu nại"],
      ["Tìm kiếm và gợi ý", "SR", "BR-SR, FR-SR, UC-SR, US-SR, BPMN-SR, CD-SR", "Tìm toàn site, gợi ý theo mô tả, tìm bằng ảnh, trang kết quả"]],
     [3.3, 1.6, 5.6, 5.4]),
    ("p", "So với bản quy ước ban đầu, nhóm bổ sung phân hệ Tìm kiếm và gợi ý (SR) vì đây là phân hệ độc lập, phục vụ toàn bộ website. "
          "Ngoài ra còn bổ sung tiền tố NFR, ký hiệu ST cho sơ đồ trạng thái, CDM cho mô hình dữ liệu khái niệm và ERD cho sơ đồ quan hệ thực thể."),

    ("h3", "3.1.2. Tác nhân của hệ thống"),
    ("p", "Hệ thống có bốn nhóm tác nhân người và bốn tác nhân hệ thống. Vai trò nhân viên được lưu trong cột profiles.role, nên nhân viên và khách hàng dùng chung cơ chế tài khoản "
          "nhưng được phân quyền khác nhau. Quản trị viên kế thừa toàn bộ quyền của Operator và CSKH."),
    ("table", "actors", "Danh sách tác nhân", ["Tác nhân", "Loại", "Mô tả", "Phân hệ chính"],
     [["Khách vãng lai", "Người", "Chưa đăng nhập; xem trang chủ, tìm kiếm, xem sản phẩm, dùng thử Studio", "PM, SR, SH, DES"],
      ["Khách hàng", "Người", "Đã đăng nhập; kế thừa quyền khách vãng lai, được thêm giỏ, thanh toán, theo dõi đơn, khiếu nại", "Tất cả phân hệ khách"],
      ["Operator (vận hành)", "Người", "Duyệt bản thiết kế final, chốt mẻ in, kiểm định QC, đóng gói, in lại", "OT"],
      ["CSKH", "Người", "Xử lý yêu cầu hủy đơn đã thanh toán, khiếu nại, đối soát giao thất bại", "OT, CS"],
      ["Quản trị viên (Admin)", "Người", "Duy nhất được duyệt và ghi nhận chuyển khoản hoàn tiền; làm được mọi việc của Operator, CSKH", "OT"],
      ["Supabase Auth", "Hệ thống", "Dịch vụ xác thực: đăng ký, đăng nhập, phiên, đặt lại mật khẩu", "AUTH"],
      ["Cổng thanh toán", "Hệ thống (mô phỏng)", "Nhận yêu cầu thanh toán VietQR, ví điện tử, thẻ và trả kết quả", "P"],
      ["Đơn vị vận chuyển", "Hệ thống (mô phỏng)", "Gửi sự kiện giao hàng qua webhook: đang giao, đã giao, thất bại", "OT"],
      ["Bộ lập lịch (pg_cron)", "Hệ thống", "Chạy tác vụ theo thời hạn mỗi phút: chốt mẻ 16:00, tự hoàn tất, tự hủy, nhắc hạn", "OT"]],
     [3.4, 2.6, 7.6, 2.3]),

    ("h3", "3.1.3. Nhu cầu và quy trình hiện tại (AS-IS)"),
    ("p", "Chương 1 đã chỉ ra rằng thị trường ốp cá nhân hóa tăng trưởng cùng thương mại điện tử Việt Nam (quy mô 38,5 tỷ USD năm 2025, tăng 21% theo VECOM). "
          "Tuy vậy, cách mua ốp in theo yêu cầu phổ biến vẫn là bán thủ công. Đại diện nội địa HATO Case cho khách tải ảnh lên website, rồi chuyển sang Zalo để nhân viên cắt ghép "
          "và gửi bản mẫu. Thời gian chờ là 1–2 giờ, có thể lặp nhiều vòng. Đại diện quốc tế CASETiFY có công cụ tự thiết kế liền mạch, nhưng giá 1.200.000–2.000.000 đồng, "
          "cao hơn nhiều so với mức chi phổ biến 100.000–500.000 đồng mỗi đơn của Gen Z. Bản xem trước ở cả hai nơi đều là ảnh 2D phẳng, không thể hiện độ bo cạnh hay vị trí camera. "
          "{F:asis} mô hình hóa quy trình truyền thống này; các điểm nghẽn được đánh dấu P1–P4 và tổng hợp ở {T:pain}."),
    ("fig", "asis", "BPMN-ASIS-01_dat-op-ca-nhan-hoa-truyen-thong", "BPMN-ASIS-01: Đặt ốp cá nhân hóa qua kênh truyền thống", "l", 24.5),
    ("table", "pain", "Điểm nghẽn (pain point) và khoảng trống của quy trình hiện tại",
     ["Mã", "Điểm nghẽn", "Bằng chứng (Chương 1)", "Hệ quả"],
     [["P1", "Khách không tự xem trước sản phẩm thật", "Bản xem trước 2D phẳng của HATO Case và CASETiFY, không thấy bo cạnh và cụm camera", "Tâm lý e ngại “ảnh một đằng, hàng một nẻo”; ngại trả trước"],
      ["P2", "Duyệt mẫu thủ công qua ứng dụng nhắn tin", "HATO Case chuyển sang Zalo, chờ 1–2 giờ mỗi vòng", "Đứt mạch mua sắm, giảm tỷ lệ chuyển đổi; tốn nhân lực thiết kế"],
      ["P3", "Khách thiếu ý tưởng, không biết gọi tên mẫu", "Cả hai đối thủ đều yêu cầu khách có sẵn ảnh hoặc ý tưởng (khoảng trống “rủi ro sáng tạo”)", "Bỏ cuộc trước không gian thiết kế trống"],
      ["P4", "Thanh toán, đối soát và ghi đơn thủ công", "Chuyển khoản, gửi ảnh biên lai, nhân viên ghi sổ", "Sai sót, xác nhận đơn chậm, không có bằng chứng giao dịch thống nhất"],
      ["P5", "Trạng thái đơn và hậu mãi không minh bạch", "Khách phải nhắn tin hỏi tiến độ; hủy, hoàn tiền, khiếu nại xử lý qua chat, không có quy tắc công bố", "Mất niềm tin, tranh chấp khó quy trách nhiệm"]],
     [1.1, 4.0, 5.6, 5.2]),

    ("h3", "3.1.4. Giải pháp TO-BE"),
    ("p", "Giải pháp TO-BE đưa toàn bộ hành trình về một website tự phục vụ: ý tưởng, thiết kế, xem trước, thanh toán, theo dõi và hậu mãi. Mỗi điểm nghẽn được giải quyết bằng "
          "một nhóm tính năng thuộc phân hệ cụ thể ({T:solution}). Phần duyệt thủ công không bị bỏ hẳn vì in UV là hàng độc bản, không bán lại được. "
          "Thay vào đó, duyệt được chuyển vào sau thanh toán, có quy tắc, thời hạn và lý do rõ ràng, nên không còn chặn khách ở bước đặt hàng."),
    ("table", "solution", "Ánh xạ điểm nghẽn sang tính năng của CasEYE's", ["Điểm nghẽn", "Giải pháp trong hệ thống", "Phân hệ"],
     [["P1", "Canvas kéo thả theo khung ốp của từng dòng máy, vùng in an toàn, xem trước 2D theo thời gian thực và 3D xoay 360°", "DES"],
      ["P2", "Kiểm tra tự động ngay khi thiết kế (vùng in, định dạng ảnh, từ khóa cấm); Operator duyệt bản final trong hệ thống sau thanh toán, có nhóm vi phạm và hạn sửa 7 ngày", "DES, OT"],
      ["P3", "Kho mẫu thiết kế; tìm kiếm toàn site; gợi ý ốp theo mô tả bằng ngôn ngữ tự nhiên; tìm bằng ảnh theo tông màu; nút “Tự thiết kế với ý tưởng này”", "SR, DES"],
      ["P4", "Checkout tính phí giao và ngày giao dự kiến, áp voucher, chọn phương thức; tạo đơn tự động kèm bằng chứng đồng ý chính sách", "P"],
      ["P5", "Theo dõi đơn theo 12 trạng thái chi tiết, timeline, thông báo; hủy, hoàn tiền, báo sự cố theo quy tắc công bố; trang nhân viên phân quyền", "OT, CS"],
      ["Nền tảng", "Tài khoản, phân quyền, hồ sơ, sổ địa chỉ, giỏ hàng chung cho hàng có sẵn và hàng thiết kế", "AUTH, PM, SH"]],
     [2.0, 11.2, 2.7]),
    ("p", "{F:uc00} là use case tổng quát của hệ thống. Bên trái là phía khách hàng, gồm tám nhóm chức năng ứng với tám phân hệ. Bên phải là phía vận hành, gồm đăng nhập nhân viên, "
          "duyệt thiết kế và sản xuất, xử lý hủy và khiếu nại, duyệt hoàn tiền, cùng các tác nhân hệ thống. Khách hàng kế thừa khách vãng lai. Operator và CSKH kế thừa tác nhân trừu tượng Nhân viên. "
          "Admin kế thừa cả hai."),
    ("fig", "uc00", "UC-00_tong-quat", "UC-00: Use case tổng quát hệ thống CasEYE's", "p", 15.5),
    ("p", "{F:bpmn00} mô tả kiến trúc nghiệp vụ ở mức cao. Khách tìm hoặc thiết kế ốp, thêm vào giỏ và thanh toán. Website tạo đơn và định tuyến theo loại hàng. "
          "Đơn có hàng thiết kế đi qua bước duyệt, còn đơn chỉ có hàng có sẵn đi thẳng vào sản xuất và đóng gói theo mẻ. Kiện hàng được bàn giao cho đơn vị vận chuyển; "
          "trạng thái giao quay về website qua webhook. Đơn kết thúc khi khách xác nhận nhận hàng; nếu có sự cố thì chuyển sang luồng CSKH và hoàn tiền. "
          "Các quy trình chi tiết của từng phân hệ được trình bày ở mục 3.2."),
    ("fig", "bpmn00", "BPMN-00_tong-the-to-be", "BPMN-00: Quy trình nghiệp vụ tổng thể TO-BE", "l", 24.5),

    ("h3", "3.1.5. Phạm vi hệ thống"),
    ("p", "Để bảo đảm tính khả thi trong thời gian thực hiện, nhóm phân định rõ phần triển khai thật, phần mô phỏng và phần ngoài phạm vi. "
          "Phần mô phỏng vẫn có đầy đủ giao diện và dữ liệu ở mọi trạng thái (đang xử lý, thành công, thất bại)."),
    ("table", "scope", "Phạm vi triển khai", ["Mức độ", "Nội dung"],
     [["Triển khai thật", "Xác thực bằng Supabase Auth và phân quyền theo profiles.role; hồ sơ, sổ địa chỉ; danh mục, chi tiết sản phẩm, giỏ hàng; Studio thiết kế và lưu thiết kế; "
                          "Checkout và tạo đơn; vòng đời đơn trên PostgreSQL (RPC, RLS, tác vụ pg_cron); thông báo trong hệ thống; trang nhân viên; tìm kiếm, gợi ý theo mô tả, tìm bằng ảnh"],
      ["Mô phỏng", "Cổng thanh toán (VietQR, ví điện tử, thẻ); đơn vị vận chuyển (webhook từ trang mô phỏng); đăng nhập Google (tài khoản demo cố định); "
                   "tóm tắt hội thoại bằng AI (dự phòng theo quy tắc khi chưa có máy chủ AI); biểu mẫu khiếu nại ở trang Hỗ trợ (bản xem thử, phiếu thật tạo qua nút “Báo sự cố” trong đơn); email"],
      ["Ngoài phạm vi", "Chương trình điểm thưởng (Loyalty); đánh giá sản phẩm; AI sinh ảnh; thử ốp bằng AR; in ấn và giao hàng vật lý; ứng dụng di động; lưu tranh chấp (dispute) trong cơ sở dữ liệu"]],
     [3.2, 12.7]),
]
