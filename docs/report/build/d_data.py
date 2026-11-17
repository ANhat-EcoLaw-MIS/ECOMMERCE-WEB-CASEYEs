"""Order state machine, conceptual data model (CDM) and ERD."""
import json
import os

from dg import Diagram, class_height

HERE = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------ state machine
def st_order():
    d = Diagram("ST-OT_trang-thai-don-hang", 1130, 600, "Máy trạng thái đơn hàng (12 trạng thái chi tiết)")
    W, H = 150, 46

    def S(id, x, y, code, vi):
        return d.add(id, "state", x, y, W, H, f"{code}\n{vi}", font=9.5)

    d.add("start", "state_start", 134, 22, 22, 22)
    S("PR", 70, 90, "Pending_Review", "Chờ duyệt thiết kế")
    S("PC", 290, 90, "Pending_Confirmation", "Đã xác nhận")
    S("IP", 510, 90, "In_Production", "Đang in")
    S("RP", 730, 90, "Ready_for_Pickup", "Đã đóng gói")
    S("IT", 950, 90, "In_Transit", "Đang giao")
    S("AR", 70, 230, "Action_Required", "Cần sửa thiết kế")
    S("DL", 730, 230, "Delivered", "Đã giao")
    S("CP", 510, 300, "Completed", "Hoàn tất")
    S("CA", 290, 330, "Cancelled", "Đã hủy")
    S("DF", 950, 330, "Delivery_Failed", "Giao thất bại")
    S("RR", 730, 450, "Return_Requested", "Đang xử lý khiếu nại")
    S("RF", 950, 450, "Refunded", "Đã hoàn tiền")
    d.add("end1", "state_end", 353, 420, 24, 24)
    d.add("end2", "state_end", 1013, 540, 24, 24)

    def T(a, b, t="", **k):
        d.edge(a, b, t, "trans", **k)

    T("start", "PR", "có hàng thiết kế", sa="b", ta="t", label_at=0.45, label_dx=-48)
    T("start", "PC", "chỉ hàng có sẵn", sa="r", ta="t", label_at=0.35)
    T("PR", "PC", "duyệt đạt")
    T("PR", "AR", "từ chối", sa="b", ta="t", st=0.3, tt=0.3, label_dx=-22)
    T("AR", "PR", "gửi lại", sa="t", ta="b", st=0.75, tt=0.75, label_dx=22)
    T("PR", "CA", "hủy được chấp nhận", sa="r", ta="l", st=0.85, tt=0.3, pts=[(252, 90 + 0.85 * H), (252, 330 + 0.3 * H)], label_at=0.45, label_dx=8)
    T("AR", "CA", "khách hủy / quá 7 ngày", sa="b", ta="l", tt=0.75, label_at=0.6)
    T("PC", "CA", "hủy COD / hủy được chấp nhận", sa="b", ta="t", label_at=0.35)
    T("PC", "IP", "chốt mẻ 16:00")
    T("PC", "RP", "hàng có sẵn: đóng gói", sa="t", ta="t", st=0.75, tt=0.25, pts=[(290 + 0.75 * W, 66), (730 + 0.25 * W, 66)], label_at=0.5)
    T("IP", "RP", "QC đạt")
    T("RP", "IT", "bàn giao")
    T("IT", "DL", "đã giao", sa="b", ta="t", st=0.2, tt=0.7, label_at=0.3)
    T("IT", "DF", "giao thất bại", sa="b", ta="t", st=0.75, tt=0.75, label_at=0.3)
    T("DF", "RP", "giao lại (1 lần)", sa="l", ta="b", st=0.25, tt=0.85, pts=[(905, 330 + 0.25 * H), (905, 160), (730 + 0.85 * W, 160)], label_at=0.6)
    T("DF", "CA", "hủy / quá hạn lưu kho", sa="l", ta="r", st=0.8, tt=0.8, label_at=0.25)
    T("DL", "CP", "xác nhận / sau 72 giờ", sa="l", ta="t", label_at=0.35)
    T("DL", "RR", "báo sự cố", sa="b", ta="t", st=0.6, tt=0.6, label_at=0.3)
    T("RR", "DL", "về trạng thái trước", sa="t", ta="b", st=0.2, tt=0.2, label_at=0.75, label_dx=-50)
    T("CP", "RR", "báo sự cố (≤7 ngày)", sa="b", ta="l", tt=0.15, label_at=0.7)
    T("RR", "IP", "in lại", sa="l", ta="b", st=0.85, tt=0.33, pts=[(470, 450 + 0.85 * H), (470, 160), (510 + 0.33 * W, 160)], label_at=0.6)
    T("RR", "RP", "gửi lại hàng sẵn", sa="l", ta="b", st=0.55, tt=0.1, pts=[(482, 450 + 0.55 * H), (482, 172), (730 + 0.1 * W, 172)], label_at=0.8)
    T("RR", "RF", "hoàn tiền")
    T("CA", "end1", sa="b", ta="t")
    T("RF", "end2", sa="b", ta="t")
    return d


# ------------------------------------------------------------------ CDM
def cdm():
    d = Diagram("CDM_mo-hinh-du-lieu-khai-niem", 1180, 540, "Mô hình dữ liệu khái niệm")
    W, H = 140, 42

    def B(id, x, y, t):
        return d.add(id, "cdm", x, y, W, H, t, font=10, fill="#F4F1FB")

    B("adr", 30, 40, "ĐỊA CHỈ"); B("pm", 300, 40, "DÒNG MÁY"); B("prd", 570, 40, "SẢN PHẨM"); B("inv", 840, 40, "TỒN KHO (phôi, vật tư)")
    B("des", 300, 170, "THIẾT KẾ"); B("var", 570, 170, "BIẾN THỂ SẢN PHẨM"); B("itm", 840, 170, "DÒNG ĐƠN HÀNG")
    B("usr", 30, 300, "NGƯỜI DÙNG (hồ sơ)"); B("rev", 300, 300, "LƯỢT DUYỆT THIẾT KẾ"); B("ord", 570, 300, "ĐƠN HÀNG")
    B("shp", 840, 300, "VẬN ĐƠN"); B("att", 1020, 300, "LẦN GIAO")
    B("noti", 30, 470, "THÔNG BÁO"); B("pc", 250, 470, "ĐỒNG Ý CHÍNH SÁCH"); B("can", 420, 470, "YÊU CẦU HỦY")
    B("his", 590, 470, "LỊCH SỬ TRẠNG THÁI"); B("vou", 760, 470, "VOUCHER ĐƠN"); B("ref", 930, 470, "YÊU CẦU HOÀN TIỀN")

    def R(a, b, ca, cb, t="", **k):
        d.edge(a, b, t, "er", card_a=ca, card_b=cb, **k)

    R("usr", "adr", "one", "zero_many", "có", sa="t", ta="b")
    R("usr", "noti", "one", "zero_many", "nhận", sa="b", ta="t")
    R("usr", "des", "one", "zero_many", "tạo", sa="t", ta="l", st=0.8, label_at=0.7)
    R("usr", "ord", "one", "zero_many", "đặt", sa="r", ta="t", st=0.2, tt=0.2, pts=[(200, 308.4), (200, 256), (598, 256)], label_at=0.5)
    R("usr", "pc", "one", "zero_many", "chấp thuận", sa="r", ta="l", st=0.9, pts=[(220, 337.8), (220, 491)], label_at=0.5)
    R("pm", "des", "one", "zero_many", "dành cho", sa="b", ta="t")
    R("pm", "var", "zero_one", "zero_many", "", sa="r", ta="l", tt=0.25, pts=[(470, 61), (470, 180.5)])
    R("prd", "var", "one", "one_many", "gồm", sa="b", ta="t")
    R("var", "inv", "zero_many", "one", "lấy từ", sa="t", ta="b", st=0.85, pts=[(689, 120), (910, 120)], label_at=0.6)
    R("pm", "inv", "zero_one", "zero_many", "phôi của", sa="t", ta="t", pts=[(370, 20), (910, 20)], label_at=0.5)
    R("ord", "itm", "one", "one_many", "gồm", sa="r", ta="l", st=0.2, pts=[(760, 308.4), (760, 191)], label_at=0.5)
    R("itm", "var", "zero_many", "zero_one", "là", sa="l", ta="r", st=0.3, tt=0.3)
    R("itm", "des", "zero_many", "zero_one", "in theo", sa="t", ta="t", st=0.3, tt=0.85, pts=[(882, 150), (419, 150)], label_at=0.3)
    R("des", "rev", "one", "zero_many", "được duyệt", sa="b", ta="t", label_at=0.75)
    R("ord", "rev", "one", "zero_many", "", sa="l", ta="r", st=0.3, tt=0.3)
    R("ord", "shp", "one", "zero_one", "giao bằng", sa="r", ta="l", st=0.7, tt=0.7)
    R("shp", "att", "one", "one_many", "", sa="r", ta="l")
    for tgt, st, yb, cards, lab in (("pc", 0.1, 430, ("one", "one"), "kèm"), ("can", 0.3, 410, ("one", "zero_many"), ""),
                                    ("his", 0.5, 390, ("one", "one_many"), "ghi vết"), ("vou", 0.7, 410, ("one", "zero_many"), "cấp"),
                                    ("ref", 0.9, 430, ("one", "zero_many"), "")):
        sx = 570 + st * W
        tx = d.nodes[tgt].cx
        R("ord", tgt, cards[0], cards[1], lab, sa="b", ta="t", st=st, pts=[(sx, yb), (tx, yb)], label_at=0.85)
    return d


# ------------------------------------------------------------------ ERD
SHOW_ORDERS = ["PK id: uuid", "FK user_id: uuid", "order_code: text (UQ)", "status: order_status", "status_detail: text", "payment_method: text",
               "payment_channel: text", "payment_status: text", "shipping_tier: text", "goods_total, shipping_fee", "discount, total: numeric",
               "recipient, phone, address_line", "ward, district, city", "earliest_edd, latest_edd: date", "confirm_due_at, auto_complete_at",
               "ticket_id: text", "version: int", "… (đủ 47 cột ở Bảng mô tả)"]


def _cols(t, schema):
    fks = {c for c, _ in schema[t]["fks"]}
    sqlt = json.load(open(os.path.join(HERE, "sqltypes.json"), encoding="utf-8")).get(t, {})
    out = []
    for c, ty in schema[t]["cols"]:
        ty = sqlt.get(c, "text") + ("?" if "| null" in ty else "")
        key = "PK " if c == "id" or (t == "webhook_events" and c == "event_id") else "FK " if c in fks else ""
        out.append((0 if key == "PK " else 1 if key == "FK " else 2, f"{key}{c}: {ty}"))
    return [s for _, s in sorted(out, key=lambda x: x[0])]


def erd():
    schema = json.load(open(os.path.join(HERE, "schema.json"), encoding="utf-8"))
    d = Diagram("ERD_so-do-quan-he-thuc-the", 1400, 960, "ERD CasEYE's (Supabase / PostgreSQL)")
    cols = {
        20: ["profiles", "addresses", "notifications"],
        290: ["designs", "design_reviews", "policy_consents", "cancel_requests"],
        570: ["orders", "refund_requests", "webhook_events"],
        880: ["order_items", "order_status_history", "order_vouchers", "shipments", "delivery_attempts"],
        1160: ["phone_models", "products", "product_variants", "inventory_items"],
    }
    widths = {20: 230, 290: 240, 570: 270, 880: 240, 1160: 220}
    for x, tables in cols.items():
        y = 50
        for t in tables:
            attrs = SHOW_ORDERS if t == "orders" else _cols(t, schema)
            h = class_height(len(attrs))
            d.add(t, "entity", x, y, widths[x], h, header=t, attrs=attrs, font=9)
            y += h + 26
    N = d.nodes

    def Y(t, f):
        return N[t].y + f * N[t].h

    def X(t, f):
        return N[t].x + f * N[t].w

    def R(a, b, ca="one", cb="zero_many", **k):
        d.edge(a, b, "", "er", card_a=ca, card_b=cb, **k)

    R("profiles", "addresses", sa="b", ta="t")
    R("profiles", "notifications", sa="l", ta="l", st=0.8, tt=0.2, pts=[(8, Y("profiles", 0.8)), (8, Y("notifications", 0.2))])
    R("profiles", "designs", sa="r", ta="l", st=0.15, tt=0.15)
    R("profiles", "policy_consents", sa="r", ta="l", st=0.5, pts=[(262, Y("profiles", 0.5)), (262, Y("policy_consents", 0.5))])
    R("profiles", "orders", sa="t", ta="t", st=0.85, tt=0.07, pts=[(X("profiles", 0.85), 14), (X("orders", 0.07), 14)])
    R("phone_models", "designs", sa="t", ta="t", st=0.2, tt=0.85, pts=[(X("phone_models", 0.2), 26), (X("designs", 0.85), 26)])
    R("order_items", "designs", "zero_many", "zero_one", sa="t", ta="t", st=0.2, tt=0.7, pts=[(X("order_items", 0.2), 38), (X("designs", 0.7), 38)])
    R("designs", "design_reviews", sa="b", ta="t")
    R("orders", "design_reviews", sa="l", ta="r", st=0.45, tt=0.4, pts=[(556, Y("orders", 0.45)), (556, Y("design_reviews", 0.4))])
    R("orders", "policy_consents", "one", "zero_one", sa="l", ta="r", st=0.7, pts=[(548, Y("orders", 0.7)), (548, Y("policy_consents", 0.5))])
    R("orders", "cancel_requests", sa="l", ta="r", st=0.92, pts=[(540, Y("orders", 0.92)), (540, Y("cancel_requests", 0.5))])
    R("orders", "refund_requests", sa="b", ta="t")
    R("orders", "webhook_events", "zero_one", "zero_many", sa="r", ta="r", st=0.97, pts=[(852, Y("orders", 0.97)), (852, Y("webhook_events", 0.5))])
    for tgt, st, x in (("order_items", 0.05, 874), ("order_status_history", 0.35, 868), ("order_vouchers", 0.6, 862), ("shipments", 0.85, 856)):
        many = "one_many" if tgt in ("order_items", "order_status_history") else "zero_one" if tgt == "shipments" else "zero_many"
        R("orders", tgt, "one", many, sa="r", ta="l", st=st, tt=0.3, pts=[(x, Y("orders", st)), (x, Y(tgt, 0.3))])
    R("shipments", "delivery_attempts", "one", "one_many", sa="b", ta="t")
    R("products", "product_variants", "one", "one_many", sa="b", ta="t")
    R("product_variants", "inventory_items", "zero_many", "one", sa="b", ta="t")
    R("phone_models", "product_variants", "zero_one", "zero_many", sa="l", ta="l", st=0.8, tt=0.2, pts=[(1150, Y("phone_models", 0.8)), (1150, Y("product_variants", 0.2))])
    R("phone_models", "inventory_items", "zero_one", "zero_many", sa="r", ta="r", st=0.5, tt=0.5, pts=[(1392, Y("phone_models", 0.5)), (1392, Y("inventory_items", 0.5))])
    R("order_items", "product_variants", "zero_many", "zero_one", sa="r", ta="l", st=0.4, tt=0.5, pts=[(1142, Y("order_items", 0.4)), (1142, Y("product_variants", 0.5))])
    R("order_items", "inventory_items", "zero_many", "one", sa="r", ta="l", st=0.7, tt=0.5, pts=[(1134, Y("order_items", 0.7)), (1134, Y("inventory_items", 0.5))])
    return d


ALL = [st_order, cdm, erd]
