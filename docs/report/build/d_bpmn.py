"""All BPMN diagrams of Chapter 3 (AS-IS, high-level TO-BE, one per function)."""
from bp import BP


def msg(b: BP, a, ext, text="", back=False, dx=0):
    """Vertical message flow between a task and a collapsed external pool."""
    n, e = b.d.nodes[a], b.d.nodes[ext]
    x = n.cx + dx
    t_ext = (x - e.x) / e.w
    t_n = (x - n.x) / n.w
    below = e.y > n.y
    if not back:
        return b.d.edge(a, ext, text, "msg", sa="b" if below else "t", ta="t" if below else "b", st=t_n, tt=t_ext, label_at=0.5)
    return b.d.edge(ext, a, text, "msg", sa="t" if below else "b", ta="b" if below else "t", st=t_ext, tt=t_n, label_at=0.5)


# ------------------------------------------------------------------ AS-IS
def asis():
    b = BP("BPMN-ASIS-01_dat-op-ca-nhan-hoa-truyen-thong", "AS-IS: Đặt ốp cá nhân hóa qua kênh truyền thống",
           [("KH", "Khách hàng", 160), ("NV", "Nhân viên shop", 160)], cols=7, colw=150,
           pool="Shop ốp in theo yêu cầu (website + Zalo)")
    b.ev("s", "event_start", "KH", 0, "Có nhu cầu ốp riêng")
    b.task("k1", "KH", 1, "Tải ảnh / mô tả ý tưởng, nhắn tin cho shop")
    b.task("n1", "NV", 1, "Tiếp nhận qua Zalo, hỏi lại dòng máy, ý tưởng")
    b.task("n2", "NV", 2, "Cắt ghép, gửi bản mẫu 2D (chờ 1–2 giờ)")
    b.task("k2", "KH", 2, "Xem bản mẫu phẳng trong khung chat")
    b.gw("g1", "KH", 3, "Ưng ý?")
    b.task("k3", "KH", 4, "Chuyển khoản thủ công, gửi ảnh biên lai")
    b.task("n3", "NV", 4, "Đối soát tay, ghi đơn vào sổ / Excel")
    b.task("n4", "NV", 5, "In, đóng gói, gửi vận chuyển")
    b.task("k4", "KH", 5, "Nhắn hỏi tình trạng đơn, chờ phản hồi")
    b.ev("e", "event_end", "KH", 6, "Nhận hàng")
    b.f("s", "k1"); b.m("k1", "n1", sa="b", ta="t")
    b.f("n1", "n2"); b.m("n2", "k2", sa="t", ta="b"); b.f("k2", "g1")
    b.f("g1", "k3", "Có")
    n2 = b.d.nodes["n2"]
    b.d.edge("g1", "n2", "Không, nhắn sửa", "msg", sa="b", ta="r", pts=[(b.d.nodes["g1"].cx, n2.cy)], label_at=0.3)
    b.m("k3", "n3", sa="b", ta="t"); b.f("n3", "n4"); b.m("n4", "k4", sa="t", ta="b"); b.f("k4", "e")
    b.note("p1", "KH", 2, "P1: không tự xem trước được", dy=-55, w=140, h=28)
    b.note("p2", "NV", 2, "P2: duyệt mẫu thủ công, lặp nhiều vòng", dy=52, w=150, h=34)
    b.note("p3", "NV", 4, "P3: đối soát tay, dễ sai sót", dy=52, w=140, h=28)
    b.note("p4", "KH", 5, "P4: trạng thái đơn mù mờ", dy=-55, w=140, h=28)
    return b.d


# ------------------------------------------------------------------ high level TO-BE
def tobe_overview():
    b = BP("BPMN-00_tong-the-to-be", "TO-BE: Quy trình nghiệp vụ tổng thể CasEYE's",
           [("KH", "Khách hàng", 150), ("WEB", "Website CasEYE's", 150), ("NV", "Nhân viên (Vận hành, CSKH, Admin)", 150)],
           cols=11, colw=128, ext_top=[("PAY", "Cổng thanh toán (mô phỏng)")], ext_bottom=[("SHIP", "Đơn vị vận chuyển (mô phỏng)")])
    b.ev("s", "event_start", "KH", 0, "Có nhu cầu ốp")
    b.task("k1", "KH", 1, "Tìm kiếm / gợi ý mẫu theo mô tả, ảnh")
    b.gw("g1", "KH", 2, "Hình thức?")
    b.task("k2", "KH", 3, "Chọn ốp có sẵn (Cửa hàng)", dy=-38, h=46)
    b.task("k3", "KH", 3, "Thiết kế trên Studio, xem trước 3D", dy=38, h=46)
    b.gw("g2", "KH", 4)
    b.task("k4", "KH", 5, "Thêm vào giỏ, thanh toán")
    b.task("w1", "WEB", 5, "Tạo đơn, định tuyến theo loại đơn")
    b.gw("g3", "WEB", 6, "Có hàng thiết kế?")
    b.task("n1", "NV", 6, "Duyệt bản thiết kế final", dy=0)
    b.task("n2", "NV", 7, "Sản xuất theo mẻ 16:00, QC, đóng gói")
    b.task("w2", "WEB", 8, "Cập nhật trạng thái, thông báo khách")
    b.task("k5", "KH", 8, "Nhận hàng, xác nhận / báo sự cố")
    b.gw("g4", "KH", 9, "Có sự cố?")
    b.task("n3", "NV", 9, "CSKH xử lý, Admin hoàn tiền nếu đủ điều kiện", h=58)
    b.ev("e1", "event_end", "KH", 10, "Đơn hoàn tất")
    b.f("s", "k1"); b.f("k1", "g1")
    b.f("g1", "k2", "Mua sẵn", sa="t", ta="l", label_at=0.7)
    b.f("g1", "k3", "Thiết kế", sa="b", ta="l", label_at=0.7)
    b.f("k2", "g2", sa="r", ta="t"); b.f("k3", "g2", sa="r", ta="b")
    b.f("g2", "k4"); b.f("k4", "w1", sa="b", ta="t")
    msg(b, "k4", "PAY", "Thanh toán trả trước", dx=-20)
    b.f("w1", "g3"); b.f("g3", "n1", "Có", sa="b", ta="t", label_at=0.4)
    b.f("n1", "n2")
    b.d.edge("g3", "n2", "Không", "seq", sa="r", ta="t", pts=[(b.d.nodes["n2"].cx, b.d.nodes["g3"].cy)], label_at=0.25)
    msg(b, "n2", "SHIP", "Bàn giao kiện")
    msg(b, "w2", "SHIP", "Webhook trạng thái giao", back=True, dx=35)
    b.f("n2", "w2", sa="r", ta="b", st=0.3, tt=0.25)
    b.f("w2", "k5", sa="t", ta="b"); b.f("k5", "g4")
    b.f("g4", "e1", "Không", label_at=0.4)
    b.f("g4", "n3", "Có", sa="b", ta="t", label_at=0.12)
    return b.d


# ------------------------------------------------------------------ AUTH
def auth():
    b = BP("BPMN-AUTH-01_dang-ky-dang-nhap", "BPMN-AUTH-01: Đăng ký, đăng nhập và onboarding",
           [("KH", "Khách hàng", 170), ("WEB", "Website CasEYE's", 140)], cols=10, colw=126,
           ext_bottom=[("SA", "Supabase Auth (dịch vụ xác thực)")])
    b.ev("s", "event_start", "KH", 0, "Cần đăng nhập (lưu, giỏ, hồ sơ)")
    b.gw("gm", "KH", 0.8)
    b.gw("g1", "KH", 1.6, "Đã có tài khoản?")
    b.task("k1", "KH", 2.8, "Đăng nhập: nhập email, mật khẩu", dy=-42, h=44)
    b.task("k2", "KH", 2.8, "Đăng ký: email, mật khẩu, xác nhận", dy=42, h=44)
    b.task("w2", "WEB", 3.9, "Kiểm tra định dạng, gửi yêu cầu xác thực")
    b.gw("g2", "WEB", 5, "Hợp lệ?")
    b.task("w4", "WEB", 6.1, "Tạo phiên; hồ sơ tự tạo (chờ onboarding)")
    b.gw("g3", "WEB", 7.2, "Đã onboarding?")
    b.task("k3", "KH", 7.2, "Chọn dòng máy, sở thích hoặc Bỏ qua")
    b.task("w5", "WEB", 8.3, "Lưu trạng thái, quay lại màn hình đang dở")
    b.ev("e", "event_end", "WEB", 9.3, "Đã đăng nhập")
    b.f("s", "gm"); b.f("gm", "g1")
    b.f("g1", "k1", "Có", sa="t", ta="l", label_at=0.55); b.f("g1", "k2", "Chưa", sa="b", ta="l", label_at=0.55)
    b.f("k1", "w2", sa="r", ta="t", tt=0.7); b.f("k2", "w2", sa="r", ta="t", tt=0.3, pts=[(b.d.nodes["w2"].x + 35, b.d.nodes["k2"].cy)])
    msg(b, "w2", "SA", "Yêu cầu đăng nhập / đăng ký")
    msg(b, "g2", "SA", "Kết quả", back=True)
    b.f("w2", "g2"); b.f("g2", "w4", "Có", label_at=0.4)
    top = b.lane["KH"][0] + 10
    b.f("g2", "gm", "Không: báo lỗi theo trường, nhập lại", sa="t", ta="t", pts=[(b.d.nodes["g2"].cx, top), (b.d.nodes["gm"].cx, top)], label_at=0.55)
    b.f("w4", "g3")
    b.f("g3", "k3", "Chưa", sa="t", ta="b", label_at=0.4)
    b.f("k3", "w5", sa="r", ta="t")
    b.f("g3", "w5", "Rồi", label_at=0.4)
    b.f("w5", "e")
    return b.d


# ------------------------------------------------------------------ PM
def pm():
    b = BP("BPMN-PM-01_trang-chu-ho-so", "BPMN-PM-01: Trang chủ và quản lý hồ sơ cá nhân",
           [("KH", "Khách hàng", 150), ("WEB", "Website CasEYE's", 150)], cols=9, colw=132)
    b.ev("s", "event_start", "KH", 0, "Truy cập CasEYE's")
    b.task("w1", "WEB", 1, "Hiển thị trang chủ: banner, bộ sưu tập, lối vào")
    b.gw("g1", "KH", 2, "Nhu cầu?")
    b.ev("e1", "event_end", "KH", 3, "Sang Cửa hàng / Studio / Tìm kiếm", dy=-48)
    b.gw("g2", "WEB", 3, "Đã đăng nhập?")
    b.task("w2", "WEB", 4, "Đăng nhập (BPMN-AUTH-01)", dy=48, h=40, w=112)
    b.task("w3", "WEB", 5, "Hiển thị My Profile")
    b.task("k1", "KH", 6, "Chọn tab: hồ sơ, địa chỉ, thiết kế, đơn hàng")
    b.gw("g3", "KH", 7, "Cần cập nhật?")
    b.task("w4", "WEB", 7, "Kiểm tra, lưu hồ sơ / địa chỉ")
    b.ev("e2", "event_end", "WEB", 8.3, "Xong")
    b.f("s", "w1", sa="b", ta="l"); b.f("w1", "g1", sa="t", ta="b")
    b.f("g1", "e1", "Khám phá", sa="t", ta="l", label_at=0.4)
    b.f("g1", "g2", "Hồ sơ", sa="r", ta="t", label_at=0.25)
    b.f("g2", "w3", "Có", label_at=0.2)
    b.f("g2", "w2", "Chưa", sa="b", ta="l", label_at=0.4); b.f("w2", "w3", sa="r", ta="b")
    b.f("w3", "k1", sa="t", ta="b"); b.f("k1", "g3")
    b.f("g3", "w4", "Có", sa="b", ta="t", label_at=0.3)
    b.f("g3", "e2", "Không", sa="r", ta="t", label_at=0.25)
    b.f("w4", "e2")
    return b.d


# ------------------------------------------------------------------ SH
def sh():
    b = BP("BPMN-SH-01_mua-op-co-san", "BPMN-SH-01: Mua ốp có sẵn",
           [("KH", "Khách hàng", 175), ("WEB", "Website CasEYE's", 150)], cols=9, colw=132)
    b.ev("s", "event_start", "KH", 0, "Muốn mua ốp có sẵn")
    b.task("k1", "KH", 1, "Xem danh mục, lọc phong cách, giá, dòng máy")
    b.task("k2", "KH", 2, "Xem chi tiết: ảnh, 3D, giá, tồn kho")
    b.gw("g1", "KH", 3, "Còn hàng?")
    b.ev("e1", "event_end", "KH", 3, "Chọn mẫu khác", dy=50)
    b.task("k3", "KH", 4, "Chọn dòng máy, bấm Thêm vào giỏ")
    b.gw("g2", "WEB", 4.6, "Đã đăng nhập?")
    b.task("w1", "WEB", 4.6, "Yêu cầu đăng nhập", dy=52, h=34, w=110)
    b.task("w2", "WEB", 5.9, "Thêm vào giỏ chung của site (CartState)")
    b.task("w3", "WEB", 7, "Mở ngăn giỏ hàng, cập nhật số lượng")
    b.gw("g3", "KH", 7.6, "Tiếp tục?")
    b.ev("e2", "event_end", "KH", 8.6, "Sang Thanh toán")
    b.f("s", "k1"); b.f("k1", "k2"); b.f("k2", "g1")
    b.f("g1", "e1", "Hết", sa="b", ta="t", label_at=0.45); b.f("g1", "k3", "Còn", label_at=0.4)
    b.f("k3", "g2", sa="b", ta="t"); b.f("g2", "w2", "Có", label_at=0.3)
    b.f("g2", "w1", "Chưa", sa="b", ta="t", label_at=0.4)
    b.d.edge("w1", "k3", "", "seq", sa="l", ta="b", st=0.5, tt=0.25, pts=[(b.d.nodes["k3"].x + 29.5, b.d.nodes["w1"].cy)])
    b.f("w2", "w3"); b.f("w3", "g3", sa="t", ta="b")
    b.f("g3", "e2", "Thanh toán", label_at=0.4)
    b.d.edge("g3", "k1", "Mua tiếp", "seq", sa="t", ta="t", pts=[(b.d.nodes["g3"].cx, b.d.nodes["k1"].y - 22), (b.d.nodes["k1"].cx, b.d.nodes["k1"].y - 22)], label_at=0.5)
    return b.d


# ------------------------------------------------------------------ DES
def des():
    b = BP("BPMN-DES-01_thiet-ke-op", "BPMN-DES-01: Thiết kế ốp cá nhân hóa",
           [("KH", "Khách hàng", 160), ("WEB", "Website CasEYE's", 150)], cols=11, colw=122)
    b.ev("s", "event_start", "KH", 0, "Muốn ốp riêng")
    b.task("k1", "KH", 1, "Chọn hãng, dòng máy (còn phôi)")
    b.task("k2", "KH", 2, "Chọn mẫu có sẵn / phôi trắng (có gợi ý theo mô tả)", h=60)
    b.gw("g1", "KH", 3, "Mua ngay mẫu?")
    b.task("k3", "KH", 4, "Chỉnh trên canvas: ảnh, chữ, sticker, nền")
    b.task("w1", "WEB", 5, "Kiểm tra tự động: vùng in, ảnh ≤10 MB, từ khóa cấm", h=60)
    b.gw("g2", "WEB", 6, "Đạt?")
    b.task("k4", "KH", 6.5, "Xem trước 2D / 3D")
    b.gw("g3", "KH", 7.6, "Hành động?")
    b.task("w2", "WEB", 8.4, "Lưu vào My Designs (bảng designs)", dy=-25, h=44)
    b.ev("e1", "event_end", "WEB", 8.4, "Đã lưu", dy=40)
    b.task("w3", "WEB", 9.5, "Đưa snapshot thiết kế vào giỏ", dy=-25, h=44)
    b.ev("e2", "event_end", "WEB", 10.5, "Sang Thanh toán", dy=-25)
    b.f("s", "k1"); b.f("k1", "k2"); b.f("k2", "g1")
    b.d.edge("g1", "k4", "Có", "seq", sa="t", ta="t", pts=[(b.d.nodes["g1"].cx, b.d.nodes["k4"].y - 22), (b.d.nodes["k4"].cx, b.d.nodes["k4"].y - 22)], label_at=0.15)
    b.f("g1", "k3", "Không", label_at=0.4)
    b.f("k3", "w1", sa="b", ta="t"); b.f("w1", "g2")
    b.f("g2", "k4", "Có", sa="t", ta="b", label_at=0.4)
    b.d.edge("g2", "k3", "Không, báo lỗi", "seq", sa="b", ta="b", pts=[(b.d.nodes["g2"].cx, b.d.nodes["g2"].y + 62), (b.d.nodes["k3"].cx - 30, b.d.nodes["g2"].y + 62), (b.d.nodes["k3"].cx - 30, b.d.nodes["k3"].y + b.d.nodes["k3"].h + 0.0)], tt=0.25, label_at=0.3)
    b.f("k4", "g3")
    b.f("g3", "w2", "Lưu", sa="b", ta="l", st=0.5, label_at=0.3)
    b.f("g3", "w3", "Thêm giỏ", sa="r", ta="t", label_at=0.25)
    b.f("w2", "e1", sa="b", ta="t"); b.f("w3", "e2", sa="r", ta="l")
    return b.d


# ------------------------------------------------------------------ P
def pay():
    b = BP("BPMN-P-01_thanh-toan", "BPMN-P-01: Thanh toán và tạo đơn",
           [("KH", "Khách hàng", 150), ("WEB", "Website CasEYE's", 160)], cols=10, colw=128,
           ext_bottom=[("PAY", "Cổng thanh toán (mô phỏng: VietQR, ví điện tử, thẻ)")])
    b.ev("s", "event_start", "KH", 0, "Bấm Thanh toán từ giỏ")
    b.task("w1", "WEB", 1, "Nạp giỏ, xác định loại hàng")
    b.task("k1", "KH", 2, "Chọn địa chỉ nhận, gói giao")
    b.task("w2", "WEB", 3, "Tính phí, ngày giao dự kiến; khóa COD, Hỏa tốc nếu có hàng thiết kế", h=66, w=124)
    b.task("k2", "KH", 4, "Áp voucher, chọn phương thức, tick đồng ý chính sách", h=60)
    b.gw("g1", "WEB", 5, "Phương thức?")
    b.task("w3", "WEB", 6, "Tạo đơn COD (Chờ xác nhận)", dy=-42, h=44)
    b.task("w4", "WEB", 6, "Chuyển cổng thanh toán, chờ đối soát", dy=40, h=46)
    b.gw("g2", "WEB", 7, "Thành công?", dy=40)
    b.task("k3", "KH", 7, "Thử lại / đổi phương thức (giữ mã đơn)", h=50)
    b.task("w5", "WEB", 8, "Tạo đơn trả trước, lưu PolicyConsent", dy=40, h=46)
    b.task("w6", "WEB", 9, "Màn thành công, nút Theo dõi đơn", dy=-42, h=46)
    b.ev("e", "event_end", "KH", 9, "Đơn đã đặt")
    b.f("s", "w1", sa="r", ta="t"); b.f("w1", "k1", sa="t", ta="b", tt=0.3); b.f("k1", "w2", sa="b", ta="t", st=0.7)
    b.f("w2", "k2", sa="t", ta="b", tt=0.3); b.f("k2", "g1", sa="b", ta="l", st=0.7)
    b.f("g1", "w3", "COD", sa="r", ta="l", label_at=0.7); b.f("g1", "w4", "Trả trước", sa="b", ta="l", label_at=0.4)
    msg(b, "w4", "PAY", "Yêu cầu thanh toán"); msg(b, "g2", "PAY", "Kết quả", back=True)
    b.f("w4", "g2"); b.f("g2", "w5", "Có", label_at=0.4)
    b.f("g2", "k3", "Không", sa="t", ta="b", label_at=0.25)
    b.d.edge("k3", "g1", "", "seq", sa="l", ta="t", pts=[(b.d.nodes["g1"].cx, b.d.nodes["k3"].cy)])
    b.f("w3", "w6"); b.f("w5", "w6", sa="t", ta="b"); b.f("w6", "e", sa="t", ta="b")
    return b.d


# ------------------------------------------------------------------ OT-01
def ot1():
    b = BP("BPMN-OT-01_xu-ly-giao-don", "BPMN-OT-01: Xử lý, sản xuất và giao đơn",
           [("KH", "Khách hàng", 140), ("WEB", "Website CasEYE's (tác vụ tự động)", 160), ("OP", "Vận hành (Operator)", 140)],
           cols=12, colw=118, ext_bottom=[("SHIP", "Đơn vị vận chuyển (mô phỏng qua webhook)")])
    b.ev("s", "event_start", "WEB", 0, "Nhận đơn từ Thanh toán")
    b.gw("g1", "WEB", 1, "Có hàng thiết kế?")
    b.task("o1", "OP", 1.6, "Duyệt bản thiết kế final")
    b.gw("g2", "OP", 2.7, "Đạt?")
    b.task("w1", "WEB", 2.7, "Chuyển Cần sửa thiết kế, thông báo khách", dy=38, h=50, w=112)
    b.task("k1", "KH", 2.7, "Sửa và gửi lại (trong 7 ngày)", h=46)
    b.task("w2", "WEB", 3.9, "Chờ mẻ (COD: 30 phút đổi ý)", h=48)
    b.ev("t1", "event_timer", "WEB", 5, "Chốt mẻ 16:00")
    b.gw("g3", "WEB", 6, "Có hàng thiết kế?")
    b.task("o2", "OP", 6, "In UV, kiểm định QC")
    b.task("o3", "OP", 7.2, "Đóng gói, bàn giao vận chuyển")
    b.task("w3", "WEB", 8.4, "Cập nhật trạng thái, thông báo khách", h=50)
    b.gw("g4", "WEB", 9.4, "Giao được?")
    b.ev("e2", "event_end", "WEB", 10.5, "Giao thất bại: xử lý theo OT-02")
    b.task("k2", "KH", 9.4, "Xác nhận đã nhận (hoặc tự động sau 72 giờ)", h=54)
    b.ev("e1", "event_end", "KH", 10.5, "Hoàn tất")
    b.f("s", "g1"); b.f("g1", "o1", "Có", sa="b", ta="l", label_at=0.25)
    b.f("g1", "w2", "Không", sa="t", ta="t", pts=[(b.d.nodes["g1"].cx, b.d.nodes["w2"].y - 18), (b.d.nodes["w2"].cx, b.d.nodes["w2"].y - 18)], label_at=0.12)
    b.f("o1", "g2"); b.f("g2", "w2", "Có", sa="r", ta="b", label_at=0.25)
    b.f("g2", "w1", "Không", sa="t", ta="b", label_at=0.35)
    b.f("w1", "k1", sa="t", ta="b")
    b.d.edge("k1", "o1", "", "seq", sa="l", ta="t", pts=[(b.d.nodes["o1"].cx, b.d.nodes["k1"].cy)])
    b.f("w2", "t1"); b.f("t1", "g3")
    b.f("g3", "o2", "Có", sa="b", ta="t", label_at=0.35)
    b.d.edge("g3", "o3", "Không", "seq", sa="r", ta="t", pts=[(b.d.nodes["o3"].cx, b.d.nodes["g3"].cy)], label_at=0.3)
    b.f("o2", "o3")
    msg(b, "o3", "SHIP", "Bàn giao kiện")
    msg(b, "w3", "SHIP", "Webhook trạng thái giao", back=True, dx=32)
    b.f("o3", "w3", sa="r", ta="b", st=0.35, tt=0.2)
    b.f("w3", "g4"); b.f("g4", "k2", "Có", sa="t", ta="b", label_at=0.35)
    b.f("g4", "e2", "Không", label_at=0.4)
    b.f("k2", "e1")
    return b.d


# ------------------------------------------------------------------ OT-02
def ot2():
    b = BP("BPMN-OT-02_huy-su-co-hoan-tien", "BPMN-OT-02: Hủy đơn, báo sự cố và hoàn tiền",
           [("KH", "Khách hàng", 150), ("WEB", "Website CasEYE's", 150), ("CS", "CSKH", 130), ("AD", "Admin", 120)],
           cols=10, colw=126)
    b.ev("s", "event_start", "KH", 0, "Muốn hủy / gặp sự cố")
    b.gw("g1", "KH", 1, "Tình huống?")
    b.task("w1", "WEB", 2, "Kiểm tra (COD, ≤30 phút), hủy, trả tồn kho", h=50, dy=40)
    b.ev("e1", "event_end", "WEB", 3.3, "Đã hủy, không thu tiền", dy=45)
    b.task("k1", "KH", 2, "Gửi yêu cầu hủy kèm lý do", dy=-40, h=44)
    b.task("k2", "KH", 2, "Báo sự cố (ảnh, mô tả, ≤7 ngày)", dy=40, h=44)
    b.task("w2", "WEB", 3.3, "Giữ đơn, tạo yêu cầu (SLA 1 ngày LV) / ticket", h=50, dy=-30)
    b.task("c1", "CS", 4.3, "Xem xét yêu cầu hủy / khiếu nại", h=50)
    b.gw("g2", "CS", 5.4, "Kết quả?")
    b.task("w3", "WEB", 5.4, "Cập nhật đơn: tiếp tục / in lại / voucher", h=50)
    b.ev("e2", "event_end", "WEB", 6.5, "Đơn tiếp tục", dy=-35)
    b.task("w4", "WEB", 6.6, "Tạo yêu cầu hoàn tiền (Chờ duyệt)", dy=44, h=44)
    b.task("k3", "KH", 7.6, "Cung cấp tài khoản nhận hoàn")
    b.task("a1", "AD", 8.2, "Duyệt, chuyển khoản, ghi mã đối soát", h=50)
    b.task("w5", "WEB", 9.2, "Đơn Đã hoàn tiền, thông báo khách", dy=30, h=50)
    b.ev("e3", "event_end", "KH", 9.2, "Đã hoàn tiền")
    b.f("s", "g1")
    b.f("g1", "w1", "Hủy COD", sa="b", ta="l", label_at=0.75)
    b.f("g1", "k1", "Hủy đơn trả trước", sa="t", ta="l", label_at=0.25)
    b.f("g1", "k2", "Sự cố", sa="r", ta="l", label_at=0.3, pts=[(b.d.nodes["g1"].x + 60, b.d.nodes["g1"].cy), (b.d.nodes["g1"].x + 60, b.d.nodes["k2"].cy)])
    b.f("w1", "e1", sa="r", ta="l")
    b.f("k1", "w2", sa="r", ta="t", tt=0.65); b.f("k2", "w2", sa="b", ta="t", tt=0.35)
    b.f("w2", "c1", sa="r", ta="t"); b.f("c1", "g2")
    b.f("g2", "w3", "Từ chối / in lại / voucher", sa="t", ta="b", label_at=0.75)
    b.f("w3", "e2", sa="r", ta="l")
    b.f("g2", "w4", "Chấp nhận hủy / hoàn tiền", sa="r", ta="b", label_at=0.3)
    b.f("w4", "k3", sa="r", ta="b", st=0.5, tt=0.3)
    b.f("k3", "a1", sa="b", ta="t", st=0.7)
    b.f("a1", "w5", sa="r", ta="b"); b.f("w5", "e3", sa="t", ta="b")
    return b.d


# ------------------------------------------------------------------ CS
def cs():
    b = BP("BPMN-CS-01_ho-tro-khach-hang", "BPMN-CS-01: Hỗ trợ khách hàng",
           [("KH", "Khách hàng", 170), ("WEB", "Website CasEYE's", 140), ("CS", "CSKH", 130)], cols=10, colw=124)
    b.ev("s", "event_start", "KH", 0, "Cần hỗ trợ")
    b.task("k1", "KH", 1, "Mở chat hỗ trợ / trang Hỗ trợ")
    b.gw("g1", "KH", 2, "Nhu cầu?")
    b.task("w1", "WEB", 3, "Trả lời nhanh theo chủ đề, dẫn tới chính sách", h=56)
    b.gw("g2", "KH", 4, "Đã giải quyết?")
    b.task("k2", "KH", 5, "Đánh dấu đã xong, xóa hội thoại", h=48)
    b.ev("e1", "event_end", "KH", 6, "Kết thúc")
    b.task("w2", "WEB", 5, "Tóm tắt hội thoại (AI hoặc theo quy tắc)", h=52)
    b.task("c1", "CS", 6, "Tiếp nhận, xác minh mã đơn, hướng dẫn", h=52)
    b.ev("e2", "event_end", "CS", 7, "Đã hướng dẫn")
    b.task("k3", "KH", 3, "Đăng nhập, nhập mã đơn, lý do, mô tả, minh chứng", dy=-50, h=50, w=124)
    b.task("w3", "WEB", 7.2, "Tạo ticket gắn với đơn, tạm dừng đếm giờ", h=52)
    b.task("c2", "CS", 8.4, "Xử lý khiếu nại (theo BPMN-OT-02)", h=50)
    b.ev("e3", "event_end", "CS", 9.4, "Có kết quả")
    b.f("s", "k1"); b.f("k1", "g1")
    b.f("g1", "w1", "Hỏi đáp", sa="b", ta="l", label_at=0.35)
    b.f("w1", "g2", sa="r", ta="l")
    b.f("g2", "k2", "Có", label_at=0.4); b.f("k2", "e1")
    b.f("g2", "w2", "Chưa", sa="b", ta="l", label_at=0.35)
    b.f("w2", "c1", sa="b", ta="l"); b.f("c1", "e2")
    b.f("g1", "k3", "Khiếu nại", sa="t", ta="l", label_at=0.35)
    b.f("k3", "w3", sa="r", ta="t")
    b.f("w3", "c2", sa="r", ta="t"); b.f("c2", "e3")
    return b.d


# ------------------------------------------------------------------ SR
def sr():
    b = BP("BPMN-SR-01_tim-kiem-goi-y", "BPMN-SR-01: Tìm kiếm và gợi ý ốp",
           [("KH", "Khách hàng", 190), ("WEB", "Website CasEYE's", 230)], cols=10, colw=126)
    b.ev("s", "event_start", "KH", 0, "Mở tìm kiếm (ô tìm, Ctrl K, nút Gợi ý)")
    b.gw("g1", "KH", 1, "Cách tìm?")
    b.task("ta", "KH", 2, "Gõ từ khóa / dán mã đơn", dy=-55, h=44)
    b.task("tb", "KH", 2, "Mô tả chiếc ốp mong muốn", dy=0, h=44)
    b.task("tc", "KH", 2, "Tải ảnh tham khảo", dy=55, h=44)
    b.task("sa", "WEB", 3, "Chuẩn hóa tiếng Việt, nhận dòng máy, mã đơn, xếp hạng", dy=-62, h=60)
    b.task("sb", "WEB", 3, "Nhận ý muốn (màu, phong cách, chủ đề, dịp), chấm điểm kèm lý do", dy=8, h=64)
    b.gw("gc", "WEB", 2, "Ảnh hợp lệ?", dy=70)
    b.ev("eerr", "event_end", "WEB", 1, "Báo lỗi định dạng ảnh", dy=70)
    b.task("sc", "WEB", 3, "Lấy bảng màu chủ đạo, so màu (ΔE)", dy=78, h=48)
    b.gw("ga", "WEB", 4, "Là mã đơn?", dy=-62)
    b.ev("eord", "event_end", "KH", 4, "Mở trang theo dõi đơn", dy=40)
    b.gw("gm", "WEB", 5, "Có kết quả?", dy=8).stereotype = "below"
    b.task("srs", "WEB", 6, "Hiện kết quả theo nhóm, ghi nhật ký từ khóa", dy=8, h=54)
    b.task("sn", "WEB", 6, "Đề xuất Gợi ý theo mô tả / Tự thiết kế", dy=-70, h=50)
    b.task("kr", "KH", 8, "Chọn mẫu, ốp có sẵn hoặc trang hỗ trợ", dy=45, h=50)
    b.task("kn", "KH", 7, "Vào Design Studio cùng ý tưởng", dy=-45, h=46)
    b.ev("eok", "event_end", "KH", 9, "Xem chi tiết", dy=45)
    b.ev("eds", "event_end", "KH", 8, "Bắt đầu thiết kế", dy=-45)
    b.f("s", "g1")
    b.f("g1", "ta", "Từ khóa", sa="t", ta="l", label_at=0.5); b.f("g1", "tb", "Mô tả", label_at=0.5); b.f("g1", "tc", "Ảnh", sa="b", ta="l", label_at=0.5)
    b.f("ta", "sa", sa="r", ta="t", st=0.5, pts=[(b.d.nodes["sa"].cx - 30, b.d.nodes["ta"].cy)], tt=0.25)
    b.f("tb", "sb", sa="r", ta="l", pts=[(b.d.nodes["sb"].x - 18, b.d.nodes["tb"].cy), (b.d.nodes["sb"].x - 18, b.d.nodes["sb"].cy)])
    b.f("tc", "gc", sa="b", ta="t")
    b.f("gc", "eerr", "Không", sa="l", ta="r", label_at=0.5); b.f("gc", "sc", "Có", sa="r", ta="l", label_at=0.4)
    b.f("sa", "ga"); b.f("ga", "eord", "Có", sa="t", ta="b", label_at=0.3)
    b.f("ga", "gm", "Không", sa="b", ta="t", pts=[(b.d.nodes["ga"].cx, b.d.nodes["gm"].y - 12), (b.d.nodes["gm"].cx, b.d.nodes["gm"].y - 12)], label_at=0.3)
    b.f("sb", "gm"); b.f("sc", "gm", sa="r", ta="b")
    b.f("gm", "srs", "Có", label_at=0.4)
    b.f("gm", "sn", "Không", sa="t", ta="l", pts=[(b.d.nodes["gm"].cx, b.d.nodes["sn"].cy)], label_at=0.3)
    b.f("srs", "kr", sa="r", ta="b"); b.f("sn", "kn", sa="r", ta="b")
    b.f("kr", "eok"); b.f("kn", "eds")
    return b.d


ALL = [asis, tobe_overview, auth, pm, sh, des, pay, ot1, ot2, cs, sr]
