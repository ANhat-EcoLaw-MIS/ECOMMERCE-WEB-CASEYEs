"""Use case diagrams: UC-00 overview + one decomposed diagram per function."""
from dg import Diagram

UW, UH = 170, 46


def uc_diagram(name, title, system, w, h, left, right, ucs, links, rels=(), bx0=150, bx1=None, arc=(), gens=()):
    """left/right: [(id, label, y)]; ucs: [(id, text, cx, cy, w?)]; links: [(actor, uc)];
    rels: [(kind, from, to, label?)] with kind in include/extend/gen_uc."""
    d = Diagram(name, w, h, title)
    bx1 = bx1 or w - 150
    d.add("SYS", "boundary", bx0, 10, bx1 - bx0, h - 20, system, font=11)
    for id, label, y in left:
        d.add(id, "actor", 50, y, 30, 46, label, font=10)
    for id, label, y in right:
        d.add(id, "actor", w - 80, y, 30, 46, label, font=10)
    for u in ucs:
        id, text, cx, cy = u[:4]
        uw = u[4] if len(u) > 4 else UW
        d.add(id, "usecase", cx - uw / 2, cy - UH / 2, uw, UH, text, font=9.5)
    for actor, base, k in arc:
        ay = d.nodes[actor].y + 38
        for a, u in links:
            if a == actor:
                n = d.nodes[u]
                cx = base + k * abs(n.cy - ay)
                n.x = cx - n.w / 2
    for a, u in links:
        d.edge(a, u, kind="assoc_uc")
    for g in gens:  # actor generalization routed outside the actor column
        child, parent = g[:2]
        off = g[2] if len(g) > 2 else 38
        c, p = d.nodes[child], d.nodes[parent]
        side = 1 if c.x > w / 2 else -1
        x = c.cx + side * off
        d.edge(child, parent, "", "gen_uc", pts=[(x, c.y + 23), (x, p.y + 23)])
    for r in rels:
        kind, a, b = r[:3]
        lab = r[3] if len(r) > 3 else ""
        d.edge(a, b, lab, kind, label_at=0.5)
    return d


def uc00():
    A, B = 330, 545
    return uc_diagram(
        "UC-00_tong-quat", "UC-00: Use case tổng quát hệ thống CasEYE's", "Hệ thống CasEYE's", 860, 720,
        left=[("ag", "Khách vãng lai", 160), ("ac", "Khách hàng", 490)],
        right=[("ast", "Nhân viên", 20), ("aop", "Operator", 140), ("acs", "CSKH", 260), ("aad", "Admin", 385), ("apay", "Cổng thanh toán", 520), ("aship", "Đơn vị vận chuyển", 610)],
        ucs=[("u1", "Xem trang chủ, quản lý hồ sơ (PM)", A, 60), ("u2", "Đăng ký, đăng nhập (AUTH)", A, 130),
             ("u3", "Tìm kiếm, gợi ý ốp (SR)", A, 200), ("u4", "Mua ốp có sẵn (SH)", A, 270),
             ("u5", "Thiết kế ốp cá nhân hóa (DES)", A, 340), ("u6", "Thanh toán đơn hàng (P)", A, 450),
             ("u7", "Theo dõi, hủy đơn, báo sự cố (OT)", A, 530), ("u8", "Liên hệ hỗ trợ, khiếu nại (CS)", A, 610),
             ("s1", "Đăng nhập nhân viên theo vai trò (AUTH)", B, 60, 180), ("s2", "Duyệt thiết kế, sản xuất, đóng gói (OT)", B, 160, 180),
             ("s3", "Xử lý yêu cầu hủy, khiếu nại (OT, CS)", B, 270, 180), ("s4", "Duyệt, ghi nhận hoàn tiền (OT)", B, 380, 180),
             ("s5", "Cập nhật trạng thái giao (OT)", B, 600, 180), ("s6", "Xác nhận thanh toán (P)", B, 500, 180)],
        links=[("ag", "u1"), ("ag", "u2"), ("ag", "u3"), ("ag", "u4"), ("ag", "u5"),
               ("ac", "u6"), ("ac", "u7"), ("ac", "u8"),
               ("ast", "s1"), ("aop", "s2"), ("acs", "s3"), ("aad", "s4"),
               ("apay", "s6"), ("aship", "s5")],
        rels=[("include", "u6", "s6")], gens=[("ac", "ag"), ("aop", "ast", 34), ("acs", "ast", 34), ("aad", "aop", 52), ("aad", "acs", 52)],
        arc=[("ag", 300, 0.25), ("ac", 300, 0.3)], bx0=160, bx1=700)


def uc_auth():
    return uc_diagram(
        "UC-AUTH_xac-thuc", "UC-AUTH: Xác thực", "Xác thực (AUTH)", 820, 440,
        left=[("ag", "Khách vãng lai", 60), ("ac", "Khách hàng", 270)],
        right=[("asa", "Supabase Auth", 120), ("ast", "Nhân viên", 300)],
        ucs=[("a1", "UC-AUTH-01 Đăng ký tài khoản", 330, 60), ("a6", "UC-AUTH-06 Thiết lập ban đầu (onboarding)", 560, 60, 190),
             ("a2", "UC-AUTH-02 Đăng nhập", 330, 160), ("a3", "UC-AUTH-03 Khôi phục mật khẩu", 330, 260),
             ("a4", "UC-AUTH-04 Đăng xuất", 330, 360), ("a5", "UC-AUTH-05 Đăng nhập nhân viên theo vai trò", 560, 300, 190)],
        links=[("ag", "a1"), ("ag", "a2"), ("ag", "a3"), ("ac", "a4"), ("asa", "a2"), ("asa", "a5"), ("ast", "a5")],
        gens=[("ac", "ag")], rels=[("extend", "a6", "a1", ""), ("extend", "a6", "a2", "")])


def uc_pm():
    return uc_diagram(
        "UC-PM_trang-chu-ho-so", "UC-PM: Trang chủ và hồ sơ cá nhân", "Trang chủ và hồ sơ (PM)", 820, 450,
        left=[("ag", "Khách vãng lai", 50), ("ac", "Khách hàng", 270)], right=[],
        ucs=[("p1", "UC-PM-01 Xem trang chủ", 340, 60), ("p2", "UC-PM-02 Cập nhật hồ sơ cá nhân", 340, 150),
             ("p3", "UC-PM-03 Quản lý sổ địa chỉ", 340, 230), ("p4", "UC-PM-04 Xem thiết kế đã lưu", 340, 310),
             ("p5", "UC-PM-05 Xem lịch sử đơn hàng", 340, 390), ("p6", "UC-PM-06 Đổi mật khẩu, bảo mật", 580, 150, 180),
             ("p7", "Mở chi tiết đơn (UC-OT-01)", 580, 390, 180)],
        links=[("ag", "p1"), ("ac", "p2"), ("ac", "p3"), ("ac", "p4"), ("ac", "p5"), ("ac", "p6")],
        gens=[("ac", "ag")], rels=[("extend", "p7", "p5")], bx1=700)


def uc_sh():
    return uc_diagram(
        "UC-SH_cua-hang", "UC-SH: Cửa hàng", "Cửa hàng (SH)", 820, 420,
        left=[("ag", "Khách vãng lai", 50), ("ac", "Khách hàng", 250)], right=[],
        ucs=[("s1", "UC-SH-01 Xem danh mục, lọc sản phẩm", 340, 60), ("s2", "UC-SH-02 Xem chi tiết sản phẩm (ảnh, 3D)", 340, 150, 190),
             ("s5", "UC-SH-05 Lưu sản phẩm yêu thích", 340, 240), ("s3", "UC-SH-03 Thêm vào giỏ hàng", 340, 320),
             ("s4", "UC-SH-04 Quản lý giỏ hàng", 340, 390), ("s6", "Đăng nhập (UC-AUTH-02)", 580, 320, 170)],
        links=[("ag", "s1"), ("ag", "s2"), ("ag", "s5"), ("ac", "s3"), ("ac", "s4")],
        gens=[("ac", "ag")], rels=[("include", "s3", "s6")], bx1=700)


def uc_des():
    return uc_diagram(
        "UC-DES_design-studio", "UC-DES: Studio thiết kế", "Studio thiết kế (DES)", 860, 480,
        left=[("ag", "Khách vãng lai", 60), ("ac", "Khách hàng", 290)], right=[("aop", "Operator", 330)],
        ucs=[("d1", "UC-DES-01 Khám phá, chọn mẫu thiết kế", 330, 60, 190), ("d7", "Gợi ý mẫu theo mô tả (UC-SR-02)", 570, 60, 180),
             ("d2", "UC-DES-02 Thiết kế ốp cá nhân hóa", 330, 150, 190), ("d8", "Chọn dòng máy", 570, 130, 150), ("d9", "Xem trước 2D/3D", 570, 195, 150),
             ("d3", "UC-DES-03 Lưu, quản lý bản thiết kế", 330, 250, 190), ("d4", "UC-DES-04 Đặt mua thiết kế (thêm giỏ)", 330, 340, 190),
             ("d5", "UC-DES-05 Xử lý thiết kế bị từ chối", 330, 430, 190), ("d6", "Duyệt bản thiết kế (UC-OT-11)", 570, 400, 180)],
        links=[("ag", "d1"), ("ag", "d2"), ("ac", "d3"), ("ac", "d4"), ("ac", "d5"), ("aop", "d6")],
        gens=[("ac", "ag")], rels=[("extend", "d7", "d1"), ("include", "d2", "d8"), ("include", "d2", "d9"), ("extend", "d5", "d6")],
        bx0=160, bx1=700)


def uc_p():
    return uc_diagram(
        "UC-P_thanh-toan", "UC-P: Thanh toán", "Thanh toán (P)", 820, 420,
        left=[("ac", "Khách hàng", 170)], right=[("apay", "Cổng thanh toán", 170)],
        ucs=[("p1", "UC-P-01 Thanh toán đơn hàng", 330, 200), ("p2", "Chọn địa chỉ, gói giao", 560, 60, 170),
             ("p3", "Đồng ý chính sách đơn hàng", 560, 140, 170), ("p4", "UC-P-02 Áp mã giảm giá", 330, 70, 170),
             ("p5", "UC-P-03 Thanh toán trực tuyến (mô phỏng)", 560, 250, 180), ("p6", "UC-P-04 Thử lại / đổi phương thức", 560, 360, 180),
             ("p7", "UC-P-05 Đặt hàng COD", 330, 340, 170)],
        links=[("ac", "p1"), ("apay", "p5")],
        rels=[("include", "p1", "p2"), ("include", "p1", "p3"), ("extend", "p4", "p1"), ("extend", "p5", "p1"), ("extend", "p7", "p1"), ("extend", "p6", "p5")],
        bx0=160, bx1=660)


def uc_ot():
    return uc_diagram(
        "UC-OT_quan-ly-don-hang", "UC-OT: Quản lý đơn hàng và giao vận", "Quản lý đơn hàng và giao vận (OT)", 900, 700,
        left=[("ac", "Khách hàng", 220)], right=[("aop", "Operator", 70), ("acs", "CSKH", 260), ("aad", "Admin", 400), ("aship", "Đơn vị vận chuyển", 500), ("ajob", "Bộ lập lịch", 600)],
        ucs=[("o1", "UC-OT-01 Xem tiến độ đơn hàng", 300, 50, 180), ("o2", "UC-OT-02 Hủy đơn COD / hủy khi thiết kế bị từ chối", 300, 120, 200),
             ("o12", "UC-OT-12 Yêu cầu hủy đơn đã thanh toán", 300, 195, 190), ("o3", "UC-OT-03 Xác nhận đã nhận hàng", 300, 265, 180),
             ("o4", "UC-OT-04 Báo sự cố / khiếu nại", 300, 335, 180), ("o5", "UC-OT-05 Giao lại đơn thất bại", 300, 405, 180),
             ("o11", "UC-OT-11 Duyệt bản thiết kế", 560, 50, 180), ("o6", "UC-OT-06 Chuyển trạng thái (sản xuất, đóng gói)", 560, 125, 200),
             ("o8", "UC-OT-08 Xử lý yêu cầu hủy, khiếu nại", 560, 225, 190), ("o13", "UC-OT-13 Duyệt, ghi nhận hoàn tiền", 560, 330, 190),
             ("o7", "UC-OT-07 Nhận sự kiện vận chuyển (webhook)", 560, 470, 200), ("o9", "UC-OT-09 Tự động hoàn tất đơn", 560, 560, 180),
             ("o10", "UC-OT-10 Tự động hủy, nhắc quá hạn", 560, 640, 180)],
        links=[("ac", "o1"), ("ac", "o2"), ("ac", "o12"), ("ac", "o3"), ("ac", "o4"), ("ac", "o5"),
               ("aop", "o11"), ("aop", "o6"), ("acs", "o8"), ("aad", "o13"), ("aship", "o7"), ("ajob", "o9"), ("ajob", "o10")],
        gens=[("aad", "aop"), ("aad", "acs")], arc=[("ac", 290, 0.3)], bx0=170, bx1=700)


def uc_cs():
    return uc_diagram(
        "UC-CS_ho-tro-khach-hang", "UC-CS: Hỗ trợ khách hàng", "Hỗ trợ khách hàng (CS)", 820, 420,
        left=[("ag", "Khách vãng lai", 50), ("ac", "Khách hàng", 250)], right=[("acs", "CSKH", 220)],
        ucs=[("c1", "UC-CS-01 Chat hỗ trợ nhanh", 330, 60), ("c2", "UC-CS-02 Xem câu hỏi thường gặp, chính sách", 330, 145, 190),
             ("c3", "UC-CS-03 Gửi khiếu nại", 330, 280), ("c4", "UC-CS-04 Tóm tắt hội thoại", 560, 100, 170),
             ("c5", "UC-CS-05 Tiếp nhận, xử lý yêu cầu hỗ trợ", 560, 250, 180), ("c6", "Đăng nhập (UC-AUTH-02)", 330, 370, 170)],
        links=[("ag", "c1"), ("ag", "c2"), ("ac", "c3"), ("acs", "c5"), ("acs", "c4")],
        gens=[("ac", "ag")], rels=[("extend", "c4", "c1"), ("include", "c3", "c6")], bx1=670)


def uc_sr():
    return uc_diagram(
        "UC-SR_tim-kiem", "UC-SR: Tìm kiếm và gợi ý", "Tìm kiếm và gợi ý (SR)", 730, 440,
        left=[("ag", "Khách vãng lai", 60), ("ac", "Khách hàng", 280)], right=[],
        ucs=[("r1", "UC-SR-01 Tìm theo từ khóa", 330, 60), ("r5", "UC-SR-05 Mở đơn bằng mã", 570, 40, 170),
             ("r2", "UC-SR-02 Gợi ý ốp theo mô tả", 330, 150), ("r3", "UC-SR-03 Tìm bằng ảnh", 330, 240),
             ("r4", "UC-SR-04 Xem trang kết quả, lọc, sắp xếp", 330, 330, 190), ("r6", "UC-SR-06 Tự thiết kế với ý tưởng", 570, 200, 180),
             ("r7", "Xem tiến độ đơn (UC-OT-01)", 570, 110, 170)],
        links=[("ag", "r1"), ("ag", "r2"), ("ag", "r3"), ("ag", "r4")],
        gens=[("ac", "ag")], rels=[("extend", "r5", "r1"), ("include", "r5", "r7"), ("extend", "r6", "r2"), ("extend", "r6", "r3")], bx1=690)


ALL = [uc00, uc_auth, uc_pm, uc_sh, uc_des, uc_p, uc_ot, uc_cs, uc_sr]
