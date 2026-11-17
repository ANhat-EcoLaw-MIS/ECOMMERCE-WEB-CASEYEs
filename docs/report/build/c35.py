"""3.5 Thiết kế dữ liệu + 3.6 Ma trận truy vết."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA = json.load(open(os.path.join(HERE, "schema.json"), encoding="utf-8"))
SQLT = json.load(open(os.path.join(HERE, "sqltypes.json"), encoding="utf-8"))

# Extra constraints not visible in generated types (from supabase/migrations).
CONS = {
    ("profiles", "id"): "PK, FK → auth.users",
    ("profiles", "role"): "CHECK customer | operator | cskh | admin; mặc định customer",
    ("profiles", "onboarding_status"): "pending | completed | skipped",
    ("phone_models", "slug"): "UNIQUE", ("products", "slug"): "UNIQUE",
    ("product_variants", "product_id"): "FK → products; UNIQUE (product_id, phone_model_id)",
    ("inventory_items", "kind"): "enum inventory_kind: blank | material | trade_good",
    ("products", "product_type"): "enum product_type: case | accessory",
    ("orders", "order_code"): "UNIQUE",
    ("orders", "status"): "enum order_status (5 giá trị); suy ra từ status_detail",
    ("orders", "status_detail"): "CHECK 12 mã trạng thái chi tiết",
    ("orders", "payment_status"): "CHECK unpaid | paid",
    ("orders", "shipping_tier"): "CHECK standard | express",
    ("orders", "total"): "CHECK ≥ 0",
    ("orders", "version"): "mặc định 0",
    ("policy_consents", "order_id"): "FK → orders; UNIQUE",
    ("shipments", "order_id"): "FK → orders; UNIQUE",
    ("shipments", "tracking_code"): "UNIQUE",
    ("delivery_attempts", "attempt_no"): "UNIQUE (shipment_id, attempt_no)",
    ("delivery_attempts", "result"): "CHECK delivered | failed",
    ("design_reviews", "decision"): "CHECK approved | rejected",
    ("cancel_requests", "reason"): "CHECK High_Shipping_Fee | Changed_Mind | Wrong_Phone_Model | Wrong_Address | Other",
    ("cancel_requests", "status"): "CHECK pending | accepted | rejected | withdrawn; tối đa 1 pending mỗi đơn",
    ("refund_requests", "situation"): "CHECK S1 | S2 | S3a | S3b | S3c | S4",
    ("refund_requests", "status"): "CHECK Pending_Approval | Processing | Refunded | Rejected | Refund_Pending_Retry | Refund_Pending_Manual",
    ("refund_requests", "refund_method"): "CHECK bank",
    ("order_vouchers", "kind"): "CHECK late_delivery | express_surcharge | complaint",
    ("notifications", "type"): "CHECK order | design | payment | support",
    ("webhook_events", "event_id"): "PK (khóa tự nhiên, bảo đảm idempotent)",
}

D = {
    "profiles": {"id": "Mã người dùng, trùng với tài khoản Supabase Auth", "display_name": "Tên hiển thị", "avatar_url": "Đường dẫn ảnh đại diện",
                 "device_type": "Dòng máy khách đang dùng (onboarding)", "preferences": "Danh sách sở thích phong cách", "onboarding_status": "Trạng thái onboarding",
                 "role": "Vai trò: khách hàng hoặc nhân viên", "created_at": "Thời điểm tạo", "updated_at": "Thời điểm cập nhật gần nhất"},
    "addresses": {"id": "Mã địa chỉ", "user_id": "Chủ sở hữu địa chỉ", "recipient": "Tên người nhận", "phone": "Số điện thoại người nhận", "line": "Số nhà, tên đường",
                  "ward": "Phường/xã", "district": "Quận/huyện", "city": "Tỉnh/thành phố", "is_default": "Có phải địa chỉ mặc định", "created_at": "Thời điểm tạo"},
    "notifications": {"id": "Mã thông báo", "user_id": "Người nhận", "type": "Nhóm thông báo", "title": "Tiêu đề", "body": "Nội dung", "link": "Liên kết mở khi bấm",
                      "read_at": "Thời điểm đã đọc (rỗng = chưa đọc)", "created_at": "Thời điểm tạo"},
    "policy_consents": {"id": "Mã bản ghi", "order_id": "Đơn hàng được đồng ý", "user_id": "Khách đồng ý", "policy_version": "Phiên bản chính sách đã đồng ý", "accepted_at": "Thời điểm tick đồng ý"},
    "phone_models": {"id": "Mã dòng máy", "brand": "Hãng", "name": "Tên dòng máy", "slug": "Định danh trên URL", "custom_price": "Giá ốp thiết kế cho dòng máy này (VND)",
                     "mask_image_url": "Ảnh khung và vùng in của ốp", "is_active": "Đang mở bán (còn phôi)", "created_at": "Thời điểm tạo"},
    "products": {"id": "Mã sản phẩm", "slug": "Định danh trên URL", "name": "Tên sản phẩm", "description": "Mô tả", "product_type": "Loại: ốp hoặc phụ kiện",
                 "image_url": "Ảnh đại diện", "gallery_urls": "Thư viện ảnh", "is_active": "Đang bán", "created_at": "Thời điểm tạo"},
    "product_variants": {"id": "Mã biến thể", "product_id": "Sản phẩm gốc", "phone_model_id": "Dòng máy áp dụng (rỗng với phụ kiện)", "inventory_item_id": "Mặt hàng tồn kho bị trừ khi bán",
                         "name": "Tên biến thể", "price": "Giá bán (VND)", "is_active": "Đang bán", "created_at": "Thời điểm tạo"},
    "inventory_items": {"id": "Mã mặt hàng tồn kho", "kind": "Loại: phôi trắng, vật tư, hàng thành phẩm", "name": "Tên mặt hàng", "phone_model_id": "Dòng máy của phôi",
                        "quantity_on_hand": "Số lượng thực có", "created_at": "Thời điểm tạo"},
    "designs": {"id": "Mã thiết kế", "user_id": "Chủ thiết kế", "phone_model_id": "Dòng máy", "name": "Tên thiết kế", "canvas_json": "Toàn bộ lớp trên canvas (JSON)",
                "preview_url": "Ảnh xem trước", "created_at": "Thời điểm tạo", "updated_at": "Thời điểm sửa gần nhất"},
    "design_reviews": {"id": "Mã lượt duyệt", "order_id": "Đơn được duyệt", "design_id": "Thiết kế được duyệt", "round": "Vòng duyệt (1, 2, …)", "decision": "Kết quả duyệt",
                       "violation_group": "Nhóm vi phạm khi từ chối", "reason": "Lý do chi tiết", "reviewer_id": "Nhân viên duyệt", "created_at": "Thời điểm duyệt"},
    "orders": {"id": "Mã đơn (khóa kỹ thuật)", "user_id": "Khách đặt hàng", "order_code": "Mã đơn hiển thị dạng CC-yymmdd-nnnn", "status": "Trạng thái lớn dùng chung giữa các phân hệ",
               "status_detail": "Trạng thái chi tiết (12 mã)", "payment_method": "Phương thức: COD hoặc QR_Transfer (trả trước)", "payment_channel": "Kênh trả trước cụ thể (VietQR, MoMo, thẻ…)",
               "payment_status": "Đã thanh toán hay chưa", "payment_txn_ref": "Mã giao dịch thanh toán để đối soát", "shipping_tier": "Gói giao", "standard_fee": "Phí giao tiêu chuẩn theo địa chỉ",
               "express_surcharge": "Phụ phí Hỏa tốc", "shipping_fee": "Phí giao khách trả", "goods_total": "Tiền hàng (ảnh chụp lúc đặt)", "discount": "Số tiền giảm",
               "total": "Tổng thanh toán (dẫn xuất)", "transit_min": "Số ngày vận chuyển tối thiểu", "transit_max": "Số ngày vận chuyển tối đa", "recipient": "Tên người nhận (ảnh chụp lúc đặt)",
               "phone": "Số điện thoại người nhận", "address_line": "Địa chỉ chi tiết", "ward": "Phường/xã", "district": "Quận/huyện", "city": "Tỉnh/thành",
               "earliest_edd": "Ngày giao dự kiến sớm nhất", "latest_edd": "Ngày giao dự kiến muộn nhất", "batch_date": "Ngày vào mẻ sản xuất", "confirm_due_at": "Hết thời gian đổi ý của đơn COD",
               "confirmed_at": "Thời điểm đơn được xác nhận", "review_queued_at": "Thời điểm vào hàng chờ duyệt thiết kế", "rejected_at": "Thời điểm thiết kế bị từ chối",
               "design_fix_reminded_at": "Thời điểm đã nhắc khách sửa thiết kế", "design_resubmit_count": "Số lần khách gửi lại thiết kế", "qc_reprint_count": "Số lần in lại do QC",
               "delivered_at": "Thời điểm giao thành công", "auto_complete_at": "Hạn tự hoàn tất (72 giờ sau giao)", "frozen_at": "Thời điểm tạm dừng đếm giờ do có phiếu",
               "failure_cause": "Nguyên nhân giao thất bại", "fault_override": "Bên chịu lỗi do CSKH điều chỉnh", "redelivery_used": "Đã dùng lượt giao lại",
               "warehouse_hold_until": "Hạn lưu kho sau giao thất bại", "warehouse_disputed": "Khách khiếu nại về lưu kho", "late_voucher_issued": "Đã cấp voucher giao trễ",
               "ticket_id": "Mã phiếu khiếu nại đang mở", "version": "Số phiên bản cho khóa lạc quan", "created_at": "Thời điểm đặt", "updated_at": "Thời điểm cập nhật gần nhất"},
    "order_items": {"id": "Mã dòng đơn", "order_id": "Đơn chứa dòng", "variant_id": "Biến thể sản phẩm (hàng có sẵn)", "design_id": "Thiết kế (hàng thiết kế)",
                    "inventory_item_id": "Mặt hàng tồn kho bị trừ", "name": "Tên hàng (ảnh chụp lúc đặt)", "image_url": "Ảnh hàng / ảnh xem trước thiết kế",
                    "unit_price": "Đơn giá lúc đặt", "qty": "Số lượng", "phone_model": "Tên dòng máy lúc đặt", "design_version": "Phiên bản thiết kế được in", "is_custom": "Là hàng thiết kế"},
    "order_status_history": {"id": "Mã bản ghi", "order_id": "Đơn", "status": "Trạng thái lớn sau thay đổi", "status_detail": "Trạng thái chi tiết sau thay đổi",
                             "actor_type": "Bên thực hiện: customer, operator, cskh, admin, system, carrier", "actor_id": "Người thực hiện (nếu có)", "reason": "Lý do", "note": "Ghi chú", "created_at": "Thời điểm"},
    "order_vouchers": {"id": "Mã bản ghi", "order_id": "Đơn phát sinh voucher", "code": "Mã voucher", "kind": "Loại: giao trễ, hoàn phụ phí Hỏa tốc, khiếu nại", "value": "Giá trị (VND)",
                       "expires_at": "Hạn dùng", "used_at": "Thời điểm đã dùng", "created_at": "Thời điểm cấp"},
    "shipments": {"id": "Mã vận đơn", "order_id": "Đơn được giao", "carrier": "Đơn vị vận chuyển", "tracking_code": "Mã vận đơn của hãng", "created_at": "Thời điểm tạo"},
    "delivery_attempts": {"id": "Mã lần giao", "shipment_id": "Vận đơn", "attempt_no": "Lần giao thứ mấy", "started_at": "Bắt đầu giao", "ended_at": "Kết thúc",
                          "result": "Kết quả", "failure_cause": "Nguyên nhân thất bại"},
    "cancel_requests": {"id": "Mã yêu cầu", "order_id": "Đơn muốn hủy", "reason": "Lý do hủy", "note": "Ghi chú của khách", "status": "Trạng thái yêu cầu",
                        "sla_due_at": "Hạn phản hồi (1 ngày làm việc)", "decided_by": "CSKH quyết định", "decided_at": "Thời điểm quyết định", "decision_reason": "Lý do quyết định", "created_at": "Thời điểm gửi"},
    "refund_requests": {"id": "Mã yêu cầu hoàn", "order_id": "Đơn được hoàn", "situation": "Tình huống hoàn tiền", "amount": "Số tiền hoàn", "deducted_fee": "Khoản khấu trừ (cước)",
                        "status": "Trạng thái hoàn tiền", "refund_method": "Hình thức hoàn", "bank": "Ngân hàng nhận", "account_no": "Số tài khoản nhận", "account_holder": "Chủ tài khoản",
                        "approved_by": "Admin duyệt", "bank_ref": "Mã tham chiếu chuyển khoản", "transfer_attempts": "Số lần chuyển khoản", "reminder_sent_at": "Đã nhắc khách bổ sung tài khoản",
                        "escalated_at": "Chuyển CSKH khi quá hạn", "reject_reason": "Lý do từ chối", "resolved_at": "Thời điểm hoàn tất", "created_at": "Thời điểm tạo"},
    "webhook_events": {"event_id": "Mã sự kiện của hãng vận chuyển", "order_id": "Đơn liên quan", "type": "Loại sự kiện", "payload": "Dữ liệu gốc (JSON)", "received_at": "Thời điểm nhận"},
}

ORDER = ["profiles", "addresses", "notifications", "phone_models", "products", "product_variants", "inventory_items", "designs", "design_reviews",
         "orders", "order_items", "order_status_history", "order_vouchers", "shipments", "delivery_attempts", "cancel_requests", "refund_requests", "policy_consents", "webhook_events"]
TITLE = {"profiles": "hồ sơ người dùng", "addresses": "sổ địa chỉ", "notifications": "thông báo", "phone_models": "dòng máy", "products": "sản phẩm",
         "product_variants": "biến thể sản phẩm", "inventory_items": "tồn kho", "designs": "thiết kế", "design_reviews": "lượt duyệt thiết kế", "orders": "đơn hàng",
         "order_items": "dòng đơn hàng", "order_status_history": "lịch sử trạng thái đơn", "order_vouchers": "voucher của đơn", "shipments": "vận đơn",
         "delivery_attempts": "lần giao hàng", "cancel_requests": "yêu cầu hủy đơn", "refund_requests": "yêu cầu hoàn tiền", "policy_consents": "đồng ý chính sách", "webhook_events": "sự kiện webhook vận chuyển"}


def dict_table(t):
    fks = dict(SCHEMA[t]["fks"])
    rows = []
    cols = SCHEMA[t]["cols"]
    key = lambda c: (0 if c[0] in ("id",) or (t == "webhook_events" and c[0] == "event_id") else 1 if c[0] in fks else 2)
    for c, ty in sorted(cols, key=key):
        null = "| null" in ty
        cons = []
        if c == "id" or (t == "webhook_events" and c == "event_id"):
            cons.append(CONS.get((t, c), "PK"))
        elif (t, c) in CONS:
            cons.append(CONS[(t, c)])
            if c in fks and not CONS[(t, c)].startswith("FK"):
                cons.insert(0, f"FK → {fks[c]}")
        elif c in fks:
            cons.append(f"FK → {fks[c]}")
        if not null and not (c == "id"):
            cons.append("NOT NULL")
        rows.append([c, SQLT.get(t, {}).get(c, "text"), "; ".join(cons), D[t].get(c, "")])
    return ("table", f"dd_{t}", f"Mô tả thực thể {t} ({TITLE[t]})", ["Thuộc tính", "Kiểu", "Ràng buộc", "Mô tả"], rows, [3.6, 2.5, 4.6, 5.2], 10)


B = [
    ("h2", "3.5. Thiết kế dữ liệu"),
    ("p", "Dữ liệu của CasEYE's được lưu trên PostgreSQL do Supabase quản lý. Lược đồ được dựng bằng các tệp migration trong thư mục supabase/migrations, mỗi tệp có tệp rollback tương ứng, "
          "và được kiểm thử tự động trên PGlite trước khi áp dụng. Thiết kế đi theo ba mức: mô hình khái niệm (CDM), sơ đồ quan hệ thực thể ở mức logic (ERD), và mô tả chi tiết từng thực thể."),
    ("h3", "3.5.1. Mô hình dữ liệu khái niệm"),
    ("p", "Mô hình khái niệm ({F:cdm}) chỉ gồm thực thể nghiệp vụ, quan hệ và bản số, chưa có kiểu dữ liệu. 18 thực thể chia thành bốn cụm:"),
    ("bul", [
        "**Người dùng:** NGƯỜI DÙNG có nhiều ĐỊA CHỈ, nhận nhiều THÔNG BÁO, tạo nhiều THIẾT KẾ, đặt nhiều ĐƠN HÀNG.",
        "**Danh mục và kho:** SẢN PHẨM gồm nhiều BIẾN THỂ; mỗi biến thể dành cho tối đa một DÒNG MÁY và lấy hàng từ một mặt hàng TỒN KHO. Phôi trong tồn kho gắn với dòng máy.",
        "**Thiết kế:** THIẾT KẾ thuộc một dòng máy; mỗi lần duyệt sinh một LƯỢT DUYỆT THIẾT KẾ, gắn với cả thiết kế và đơn hàng.",
        "**Đơn hàng:** ĐƠN HÀNG gồm nhiều DÒNG ĐƠN HÀNG. Mỗi dòng là một biến thể (hàng có sẵn) hoặc một thiết kế (hàng thiết kế). Đơn có LỊCH SỬ TRẠNG THÁI, tối đa một VẬN ĐƠN với nhiều LẦN GIAO, "
        "YÊU CẦU HỦY, YÊU CẦU HOÀN TIỀN, VOUCHER và đúng một bản ĐỒNG Ý CHÍNH SÁCH.",
    ]),
    ("fig", "cdm", "CDM_mo-hinh-du-lieu-khai-niem", "Mô hình dữ liệu khái niệm (CDM)", "l", 24.5),
    ("h3", "3.5.2. Sơ đồ quan hệ thực thể"),
    ("p", "ERD ({F:erd}) chuyển mô hình khái niệm thành 19 bảng (bảng test của nhóm và view stock_availability không thuộc thiết kế nghiệp vụ nên không vẽ). "
          "Mỗi bảng có khóa chính là uuid sinh bởi gen_random_uuid(), riêng webhook_events dùng khóa tự nhiên event_id để bảo đảm mỗi sự kiện chỉ được xử lý một lần. "
          "Các khóa ngoại tới profiles của nhân viên (reviewer_id, decided_by, approved_by) không vẽ đường nối để sơ đồ dễ đọc. "
          "Bảng orders chỉ hiện các cột chính; danh sách đủ 47 cột ở {T:dd_orders}."),
    ("fig", "erd", "ERD_so-do-quan-he-thuc-the", "Sơ đồ quan hệ thực thể (ERD)", "l", 21.5),
    ("p", "**Lược đồ được thiết kế theo dạng chuẩn 3 (3NF).** Nhóm kiểm tra lần lượt ba điều kiện:"),
    ("bul", [
        "**1NF:** mọi thuộc tính đều nguyên tố. Các nhóm lặp được tách thành bảng riêng: dòng đơn (order_items), lịch sử trạng thái (order_status_history), lần giao (delivery_attempts). "
        "Ngoại lệ có chủ đích là products.gallery_urls và profiles.preferences (kiểu mảng): đây là danh sách giá trị không có thuộc tính con và không bao giờ được truy vấn riêng lẻ, "
        "nên lưu dạng mảng không gây dị thường cập nhật. designs.canvas_json là tài liệu JSON của trình soạn thảo, được đọc và ghi nguyên khối.",
        "**2NF:** mọi bảng có khóa chính đơn (uuid), nên không có phụ thuộc vào một phần của khóa. Các ràng buộc UNIQUE ghép như (product_id, phone_model_id) hay (shipment_id, attempt_no) "
        "là khóa ứng viên; các thuộc tính khác đều phụ thuộc vào toàn bộ khóa.",
        "**3NF:** thuộc tính không khóa chỉ phụ thuộc trực tiếp vào khóa. Ví dụ: tên và giá sản phẩm nằm ở products và product_variants, không lặp ở mỗi dòng giỏ; "
        "thông tin dòng máy chỉ nằm ở phone_models; yêu cầu hủy và hoàn tiền tách khỏi orders thay vì thêm hàng loạt cột trạng thái phụ.",
    ]),
    ("p", "Có hai nhóm thuộc tính nhìn qua giống dư thừa nhưng là quyết định có chủ đích, được giải thích như sau:"),
    ("num", [
        "**Ảnh chụp tại thời điểm đặt (snapshot):** địa chỉ người nhận trên orders, tên, đơn giá, dòng máy trên order_items. Đây không phải bản sao của addresses hay products "
        "mà là dữ kiện lịch sử thuộc về đơn: khách sửa địa chỉ hay shop đổi giá sau này thì đơn cũ vẫn phải giữ đúng giá trị lúc mua. "
        "Các cột này phụ thuộc trực tiếp vào khóa của đơn, nên không vi phạm 3NF.",
        "**Thuộc tính dẫn xuất được giữ lại có kiểm soát:** orders.status suy ra từ orders.status_detail (hàm order_status_for), "
        "và orders.total = goods_total + shipping_fee + express_surcharge − discount. Về lý thuyết đây là phụ thuộc bắc cầu. Nhóm vẫn giữ lại vì "
        "(a) enum status là hợp đồng chung mà các phân hệ khác và chính sách RLS đang dùng; (b) total cần cho lọc, báo cáo và đối soát thanh toán. "
        "Hai cột chỉ được ghi qua RPC hoặc trigger cùng lúc với cột gốc, nên không phát sinh dị thường cập nhật. Đây là khử chuẩn hóa có kiểm soát, không phải lỗi thiết kế.",
    ]),
    ("h3", "3.5.3. Mô tả thực thể"),
    ("p", "Các bảng dưới mô tả từng thực thể theo thứ tự cụm: người dùng, danh mục và kho, thiết kế, đơn hàng. Kiểu dữ liệu lấy đúng từ migration; "
          "cột Ràng buộc ghi khóa, NOT NULL, CHECK và UNIQUE. Toàn bộ thời điểm dùng kiểu timestamptz (lưu UTC, hiển thị theo múi giờ Việt Nam); số tiền tính bằng đồng (integer)."),
    *[dict_table(t) for t in ORDER],
    ("p", "12 mã trạng thái chi tiết của đơn và cách ánh xạ về trạng thái lớn được tổng hợp ở {T:status_map}."),
    ("table", "status_map", "Trạng thái chi tiết của đơn hàng", ["status_detail", "Tên hiển thị", "status (enum)", "Ý nghĩa"],
     [["Pending_Review", "Chờ duyệt thiết kế", "pending", "Đơn có hàng thiết kế, chờ Operator duyệt"],
      ["Action_Required", "Cần sửa thiết kế", "pending", "Thiết kế bị từ chối, chờ khách sửa (tối đa 7 ngày)"],
      ["Pending_Confirmation", "Đã xác nhận", "pending", "Chờ vào mẻ; với COD là thời gian đổi ý 30 phút"],
      ["In_Production", "Đang in", "confirmed", "Đang in UV và kiểm định QC"],
      ["Ready_for_Pickup", "Đã đóng gói", "confirmed", "Chờ đơn vị vận chuyển lấy hàng"],
      ["In_Transit", "Đang giao", "shipping", "Đơn vị vận chuyển đang giao"],
      ["Delivery_Failed", "Giao thất bại", "shipping", "Giao không thành công, lưu kho 14 ngày"],
      ["Delivered", "Đã giao", "delivered", "Giao thành công, chờ khách xác nhận (72 giờ)"],
      ["Completed", "Hoàn tất", "delivered", "Đơn đóng; vẫn báo sự cố được trong 7 ngày kể từ khi giao"],
      ["Return_Requested", "Đang xử lý khiếu nại", "delivered", "Có phiếu khiếu nại đang mở"],
      ["Cancelled", "Đã hủy", "cancelled", "Đơn bị hủy (có thể kèm yêu cầu hoàn tiền)"],
      ["Refunded", "Đã hoàn tiền", "cancelled", "Đã hoàn tiền sau khiếu nại được chấp nhận"]],
     [3.6, 3.4, 2.4, 6.5], 10.5),

    ("h2", "3.6. Ma trận truy vết yêu cầu"),
    ("p", "Ma trận truy vết ({T:trace}) nối mỗi điểm nghẽn với tính năng, yêu cầu, use case và dữ liệu tương ứng. Nhờ vậy có thể kiểm tra hai chiều: "
          "mọi tính năng đều sinh ra từ một nhu cầu cụ thể, và mọi nhu cầu đều có chức năng, dữ liệu đáp ứng."),
    ("table", "trace", "Ma trận truy vết từ điểm nghẽn đến dữ liệu", ["Điểm nghẽn", "Tính năng", "BR", "FR", "UC", "Bảng dữ liệu"],
     [["P1 Không xem trước", "Canvas theo khung ốp, xem 2D/3D", "BR-DES-01, 05, 06, 07", "FR-DES-01, 11–17", "UC-DES-02", "phone_models, designs"],
      ["P2 Duyệt thủ công", "Kiểm tra tự động; Operator duyệt sau thanh toán", "BR-DES-13, 15; BR-OT-02", "FR-DES-26, 28; FR-OT-15", "UC-DES-05, UC-OT-11", "design_reviews, orders"],
      ["P3 Thiếu ý tưởng", "Kho mẫu, tìm kiếm, gợi ý theo mô tả, tìm bằng ảnh", "BR-DES-02, 03; BR-SR-01–04", "FR-DES-05–09; FR-SR-01–08", "UC-DES-01, UC-SR-01–03", "(dữ liệu catalog); nhật ký tìm kiếm cục bộ"],
      ["P4 Thanh toán thủ công", "Checkout, cổng thanh toán, tạo đơn tự động", "BR-P-01–05", "FR-P-01–09", "UC-P-01", "orders, order_items, policy_consents"],
      ["P5 Đơn không minh bạch", "Timeline, 12 trạng thái, thông báo, hủy, hoàn tiền, khiếu nại", "BR-OT-01, 03–05; BR-CS-02, 04", "FR-OT-01–20; FR-CS-05, 06", "UC-OT-01–13, UC-CS-03",
       "orders, order_status_history, cancel_requests, refund_requests, notifications"],
      ["Nền tảng", "Tài khoản, phân quyền, hồ sơ, địa chỉ, giỏ hàng", "BR-AUTH-01–05; BR-PM-01–05; BR-SH-01–04", "FR-AUTH, FR-PM, FR-SH", "UC-AUTH, UC-PM, UC-SH",
       "profiles, addresses, products, product_variants, inventory_items"]],
     [2.3, 3.0, 2.7, 2.4, 2.3, 3.2], 9.5),
    ("p", "Tóm lại, Chương 3 đã xác định 5 điểm nghẽn của quy trình hiện tại và giải quyết chúng bằng 8 phân hệ. Mỗi phân hệ có yêu cầu nghiệp vụ, quy trình BPMN và quy tắc nghiệp vụ, "
          "được cụ thể hóa thành yêu cầu chức năng, user story, use case, biểu đồ lớp, và hiện thực trên lược đồ dữ liệu 19 bảng đạt 3NF (có hai nhóm ngoại lệ có chủ đích). "
          "Chương 4 sẽ trình bày cách các thiết kế này được triển khai trên Angular và Supabase."),
]
