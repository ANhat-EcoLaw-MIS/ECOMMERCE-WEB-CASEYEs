"""Class diagrams (analysis level, one per function) - CD-xx."""
from dg import Diagram, class_height


def C(d, id, x, y, name, attrs, ops=(), stereo="", w=200):
    h = class_height(len(attrs), len(ops), bool(stereo))
    return d.add(id, "class", x, y, w, h, header=name, attrs=list(attrs), ops=list(ops), stereotype=stereo, font=10)


def E(d, id, x, y, name, values, w=150):
    h = class_height(len(values), 0, True)
    return d.add(id, "class", x, y, w, h, header=name, attrs=list(values), stereotype="enumeration", font=10)


def cd_auth():
    d = Diagram("CD-AUTH_xac-thuc", 880, 470, "CD-AUTH: Biểu đồ lớp Xác thực")
    C(d, "svc", 20, 20, "AuthService", [], ["+signUp(email, password)", "+signIn(email, password)", "+resetPassword(email)", "+signOut()", "+currentUser(): AuthUser"], "service", 210)
    C(d, "usr", 320, 20, "AuthUser", ["-id: uuid", "-email: string", "-emailConfirmedAt: datetime", "-createdAt: datetime"], [], "Supabase Auth", 200)
    C(d, "ses", 640, 20, "Session", ["-accessToken: string", "-refreshToken: string", "-expiresAt: datetime"], ["+isExpired(): boolean"], "", 210)
    C(d, "pro", 320, 210, "Profile", ["-id: uuid", "-displayName: string", "-avatarUrl: string", "-deviceType: string", "-preferences: string[]", "-onboardingStatus: OnboardingStatus", "-role: Role"],
      ["+completeOnboarding(device, prefs)", "+skipOnboarding()", "+isStaff(): boolean"], "", 230)
    C(d, "stf", 20, 250, "StaffSession", ["-role: Role", "-viewAs: Role"], ["+signIn(email, password)", "+canAccess(route): boolean"], "service", 210)
    E(d, "role", 640, 200, "Role", ["customer", "operator", "cskh", "admin"])
    E(d, "onb", 640, 330, "OnboardingStatus", ["pending", "completed", "skipped"])
    d.edge("svc", "usr", "", "dep")
    d.edge("usr", "ses", "", "assoc", card_a="1", card_b="0..*")
    d.edge("usr", "pro", "", "assoc", card_a="1", card_b="1", sa="b", ta="t")
    d.edge("stf", "pro", "đọc vai trò", "dep", sa="r", ta="l", tt=0.6)
    d.edge("pro", "role", "", "dep", sa="r", ta="l", st=0.35)
    d.edge("pro", "onb", "", "dep", sa="r", ta="l", st=0.75)
    return d


def cd_pm():
    d = Diagram("CD-PM_trang-chu-ho-so", 860, 380, "CD-PM: Biểu đồ lớp Trang chủ và hồ sơ")
    C(d, "st", 20, 20, "AccountState", [], ["+loadProfile()", "+updateProfile(data)", "+addAddress(a)", "+setDefaultAddress(id)", "+changePassword()"], "service", 210)
    C(d, "pro", 320, 20, "Profile", ["-id: uuid", "-displayName: string", "-avatarUrl: string", "-deviceType: string", "-preferences: string[]"], ["+update(data)"], "", 220)
    C(d, "adr", 620, 20, "Address", ["-id: uuid", "-recipient: string", "-phone: string", "-line: string", "-ward: string", "-district: string", "-city: string", "-isDefault: boolean"], ["+setDefault()"], "", 220)
    C(d, "des", 320, 250, "Design", ["-id: uuid", "-name: string", "-previewUrl: string", "-updatedAt: datetime"], [], "xem ở DES", 220)
    C(d, "ord", 20, 250, "OrderSummary", ["-orderCode: string", "-statusDetail: string", "-total: number", "-createdAt: datetime"], [], "CustomerOrderFeed", 220)
    d.edge("st", "pro", "", "dep")
    d.edge("pro", "adr", "", "comp", card_a="1", card_b="0..*", st=0.4, tt=0.3)
    d.edge("pro", "des", "", "assoc", card_a="1", card_b="0..*", sa="b", ta="t", st=0.6, tt=0.6)
    d.edge("pro", "ord", "", "assoc", card_a="1", card_b="0..*", sa="b", ta="t", st=0.2)
    return d


def cd_sh():
    d = Diagram("CD-SH_cua-hang", 900, 520, "CD-SH: Biểu đồ lớp Cửa hàng")
    C(d, "prd", 20, 20, "Product", ["-id: uuid", "-slug: string", "-name: string", "-description: string", "-productType: ProductType", "-imageUrl: string", "-galleryUrls: string[]", "-isActive: boolean"], [], "", 210)
    C(d, "var", 330, 20, "ProductVariant", ["-id: uuid", "-name: string", "-price: number", "-isActive: boolean"], ["+isAvailable(): boolean"], "", 210)
    C(d, "pm", 640, 20, "PhoneModel", ["-id: uuid", "-brand: string", "-name: string", "-slug: string", "-customPrice: number", "-isActive: boolean"], [], "", 220)
    C(d, "inv", 640, 230, "InventoryItem", ["-id: uuid", "-kind: InventoryKind", "-name: string", "-quantityOnHand: int"], ["+available(): int"], "", 220)
    C(d, "cart", 20, 300, "Cart", ["-items: CartItem[]"], ["+add(item)", "+updateQty(id, qty)", "+remove(id)", "+subtotal(): number", "+clear()"], "CartState", 210)
    C(d, "ci", 330, 300, "CartItem", ["-productType: IN_STOCK | CUSTOM", "-sku: string", "-name: string", "-device: string", "-unitPrice: number", "-qty: int", "-designId: uuid [0..1]", "-previewUrl: string"], [], "", 230)
    d.edge("prd", "var", "", "comp", card_a="1", card_b="1..*")
    d.edge("var", "pm", "dành cho", "assoc", card_a="0..*", card_b="0..1")
    d.edge("var", "inv", "trừ tồn", "assoc", card_a="0..*", card_b="1", sa="b", ta="l", st=0.85, label_at=0.7)
    d.edge("cart", "ci", "", "comp", card_a="1", card_b="0..*")
    d.edge("ci", "var", "tham chiếu", "dep", sa="t", ta="b", st=0.35, tt=0.35)
    return d


def cd_des():
    d = Diagram("CD-DES_design-studio", 900, 560, "CD-DES: Biểu đồ lớp Studio thiết kế")
    C(d, "tpl", 20, 20, "Template", ["-id: string", "-name: string", "-styleLabel: string", "-hashtags: string[]", "-isEditable: boolean", "-isTrending: boolean", "-gradient: string"], [], "", 210)
    C(d, "des", 330, 20, "Design", ["-id: uuid", "-name: string", "-canvasJson: json", "-previewUrl: string", "-updatedAt: datetime"], ["+save()", "+toCartItem(): CartItem", "+validate(): Violation[]"], "", 220)
    C(d, "pm", 650, 20, "PhoneModel", ["-id: uuid", "-name: string", "-maskImageUrl: string", "-isActive: boolean"], ["+safeZone(): Mask"], "", 220)
    C(d, "lay", 330, 250, "CanvasLayer", ["-id: string", "-x, y: number", "-rotation: number", "-scale: number", "-zIndex: int"], ["+move()", "+rotate()"], "abstract", 220)
    C(d, "txt", 120, 440, "TextElement", ["-text: string", "-font: string", "-color: string"], [], "", 180)
    C(d, "img", 360, 440, "ImageElement", ["-src: string", "-uploaded: boolean"], [], "", 170)
    C(d, "stk", 580, 440, "StickerElement", ["-stickerId: string"], [], "", 170)
    C(d, "rev", 650, 250, "DesignReview", ["-round: int", "-decision: approved | rejected", "-violationGroup: string", "-reason: string"], [], "duyệt ở OT", 220)
    d.edge("tpl", "des", "dựa trên", "assoc", card_a="0..1", card_b="0..*")
    d.edge("des", "pm", "", "assoc", card_a="0..*", card_b="1")
    d.edge("des", "lay", "", "comp", card_a="1", card_b="1..*", sa="b", ta="t")
    d.edge("txt", "lay", "", "gen", sa="t", ta="b", tt=0.2)
    d.edge("img", "lay", "", "gen", sa="t", ta="b", tt=0.5)
    d.edge("stk", "lay", "", "gen", sa="t", ta="b", tt=0.8)
    d.edge("des", "rev", "", "assoc", card_a="1", card_b="0..*", sa="r", ta="t", st=0.85)
    return d


def cd_p():
    d = Diagram("CD-P_thanh-toan", 900, 520, "CD-P: Biểu đồ lớp Thanh toán")
    C(d, "svc", 20, 20, "CheckoutService", ["-items: CartItem[]", "-address: Address"], ["+selectShipping(id)", "+applyVoucher(code): boolean", "+selectPayment(type)", "+placeOrder(): CheckoutOrder", "+retry()"], "service", 220)
    C(d, "co", 330, 20, "CheckoutOrder", ["-orderCode: string", "-subtotal: number", "-shippingFee: number", "-discount: number", "-total: number", "-paymentStatus: PaymentStatus", "-consentAcceptedAt: datetime"], ["+toHandoff(): OrderHandoff"], "", 230)
    C(d, "sm", 660, 20, "ShippingMethod", ["-id: standard | express", "-price: number", "-transitMin: int", "-transitMax: int"], ["+allowedFor(items): boolean"], "", 220)
    C(d, "vc", 660, 200, "Voucher", ["-code: string", "-discountAmount: number", "-isApplied: boolean"], [], "", 220)
    C(d, "pmt", 20, 260, "PaymentMethod", ["-type: vietqr | e_wallet | card | cod", "-enabled: boolean", "-lockReason: string"], [], "", 230)
    C(d, "tx", 330, 290, "PaymentTransaction", ["-transactionId: string", "-channel: string", "-status: pending | paid | failed"], [], "mô phỏng", 230)
    C(d, "pc", 660, 340, "PolicyConsent", ["-policyVersion: string", "-acceptedAt: datetime"], [], "", 220)
    C(d, "oi", 330, 430, "OrderIntake", [], ["+placeOrder(handoff): Order"], "interface", 230)
    d.edge("svc", "co", "tạo", "dep")
    d.edge("co", "sm", "", "assoc", card_a="0..*", card_b="1")
    d.edge("co", "vc", "", "assoc", card_a="0..*", card_b="0..1", sa="r", ta="l", st=0.7)
    d.edge("co", "pmt", "", "assoc", card_a="0..*", card_b="1", sa="b", ta="t", st=0.15, pts=None)
    d.edge("co", "tx", "", "comp", card_a="1", card_b="0..*", sa="b", ta="t", st=0.55, tt=0.55)
    co = d.nodes["co"]; y0 = co.y + 0.95 * co.h
    d.edge("co", "pc", "", "comp", card_a="1", card_b="1", sa="r", ta="l", st=0.95, pts=[(632, y0), (632, d.nodes["pc"].cy)])
    d.edge("tx", "oi", "chuyển đơn", "dep", sa="b", ta="t")
    return d


def cd_ot():
    d = Diagram("CD-OT_quan-ly-don-hang", 940, 650, "CD-OT: Biểu đồ lớp Quản lý đơn hàng")
    o = C(d, "ord", 330, 20, "Order", ["-orderCode: string", "-status: OrderStatus", "-statusDetail: string", "-paymentMethod: COD | QR_Transfer", "-paymentStatus: unpaid | paid", "-shippingTier: standard | express",
                                        "-goodsTotal, shippingFee, discount, total", "-earliestEdd, latestEdd: date", "-confirmDueAt, autoCompleteAt", "-version: int"],
          ["+canCustomerCancel(): boolean", "+transition(to, actor)", "+refundAmount(situation)"], "", 260)
    C(d, "it", 20, 20, "OrderItem", ["-name: string", "-qty: int", "-unitPrice: number", "-isCustom: boolean", "-designVersion: int"], [], "", 210)
    C(d, "his", 20, 180, "OrderStatusHistory", ["-status, statusDetail", "-actorType: string", "-reason, note", "-createdAt"], [], "", 210)
    E(d, "st", 20, 300, "OrderStatus", ["pending", "confirmed", "shipping", "delivered", "cancelled"], w=170)
    C(d, "shp", 680, 20, "Shipment", ["-carrier: string", "-trackingCode: string"], [], "", 220)
    C(d, "att", 680, 150, "DeliveryAttempt", ["-attemptNo: int", "-result: delivered | failed", "-failureCause: string"], [], "", 220)
    C(d, "vou", 680, 300, "OrderVoucher", ["-code: string", "-kind: late_delivery | ...", "-value: number", "-expiresAt: datetime"], [], "", 220)
    C(d, "noti", 680, 470, "Notification", ["-type: order | design | payment | support", "-title, body, link", "-readAt: datetime"], [], "", 240)
    C(d, "cr", 20, 470, "CancelRequest", ["-reason: CancelReason", "-status: pending | accepted | rejected | withdrawn", "-slaDueAt: datetime"], ["+withdraw()"], "", 260)
    C(d, "rr", 380, 470, "RefundRequest", ["-situation: S1 | S2 | S3a | S3b | S3c | S4", "-amount, deductedFee", "-status: RefundStatus", "-bank, accountNo, bankRef"], ["+approve()", "+reject(reason)"], "", 250)
    d.edge("ord", "it", "", "comp", card_a="1", card_b="1..*", sa="l", ta="r", st=0.15)
    d.edge("ord", "his", "", "comp", card_a="1", card_b="1..*", sa="l", ta="r", st=0.55)
    d.edge("ord", "st", "", "dep", sa="l", ta="r", st=0.95)
    d.edge("ord", "shp", "", "comp", card_a="1", card_b="0..1", sa="r", ta="l", st=0.12)
    d.edge("shp", "att", "", "comp", card_a="1", card_b="1..*", sa="b", ta="t")
    d.edge("ord", "cr", "", "comp", card_a="1", card_b="0..*", sa="b", ta="r", st=0.1)
    d.edge("ord", "rr", "", "comp", card_a="1", card_b="0..*", sa="b", ta="t", st=0.6, tt=(330 + 0.6 * 260 - 380) / 250)
    d.edge("ord", "vou", "", "comp", card_a="1", card_b="0..*", sa="r", ta="l", st=0.75)
    y0 = o.y + 0.95 * o.h
    d.edge("ord", "noti", "phát", "dep", sa="r", ta="l", st=0.95, pts=[(660, y0), (660, d.nodes["noti"].cy)], label_at=0.6)
    return d


def cd_cs():
    d = Diagram("CD-CS_ho-tro-khach-hang", 860, 400, "CD-CS: Biểu đồ lớp Hỗ trợ khách hàng")
    C(d, "chat", 20, 20, "SupportChat", ["-open: boolean", "-unread: int"], ["+send(text)", "+summarize()", "+resolveAndClear()"], "SupportChatState", 210)
    C(d, "msg", 320, 20, "ChatMessage", ["-from: customer | agent", "-text: string", "-time: string"], [], "", 210)
    C(d, "sum", 620, 20, "ConversationSummary", ["-text: string", "-mode: ai | local"], [], "", 210)
    C(d, "cmp", 20, 220, "Complaint", ["-orderCode: string", "-reason: ComplaintReason", "-description: string", "-evidenceUrls: string[]"], ["+submit()"], "", 230)
    C(d, "ord", 330, 220, "Order", ["-orderCode: string", "-ticketId: string", "-frozenAt: datetime"], ["+reportIssue()"], "OT", 210)
    E(d, "rsn", 620, 210, "ComplaintReason", ["Sai màu", "In lệch", "Hư hỏng", "Sai dòng máy"], w=170)
    d.edge("chat", "msg", "", "comp", card_a="1", card_b="1..*")
    d.edge("chat", "sum", "", "assoc", card_a="1", card_b="0..1", sa="r", ta="b", st=0.85)
    d.edge("cmp", "ord", "về đơn", "assoc", card_a="0..*", card_b="1")
    d.edge("cmp", "rsn", "", "dep", sa="b", ta="b", pts=[(135, 380), (705, 380)])
    return d


def cd_sr():
    d = Diagram("CD-SR_tim-kiem", 920, 560, "CD-SR: Biểu đồ lớp Tìm kiếm và gợi ý")
    C(d, "svc", 330, 20, "SearchService", ["-query: string", "-mode: text | suggest", "-recent: string[]"], ["+search(q): GroupedResults", "+suggest(text)", "+searchByImage(file)", "+remember(q)", "+log(q, n, mode)"], "service", 240)
    C(d, "src", 20, 20, "SearchSource", ["+id: string"], ["+docs(): SearchDoc[]"], "interface", 200)
    C(d, "s1", 20, 190, "ShopSearchSource", [], [], "", 180)
    C(d, "s2", 20, 260, "DesignTemplateSearchSource", [], [], "", 200)
    C(d, "s3", 20, 330, "HelpSearchSource", [], [], "", 180)
    C(d, "doc", 330, 270, "SearchDoc", ["-id, type: product | template | help", "-title, subtitle, text", "-image, link, price", "-boost: 0..3", "-palette: Swatch[]"], [], "", 240)
    C(d, "hit", 660, 270, "SearchHit", ["-score: number", "-reasons: string[]"], [], "", 200)
    C(d, "con", 660, 20, "Concept", ["-id: string", "-group: color | style | theme | occasion | material", "-label: string", "-words: string[]"], [], "Lexicon", 240)
    C(d, "ci", 660, 400, "ColorIndex", [], ["+withPalette(doc): SearchDoc", "+ensure(docs)"], "service", 220)
    C(d, "sw", 330, 450, "Swatch", ["-rgb: [r, g, b]", "-w: number"], ["+deltaE(other): number"], "", 220)
    d.edge("svc", "src", "", "aggr", card_a="1", card_b="1..*", sa="l", ta="r", st=0.3)
    for s in ("s1", "s2", "s3"):
        d.edge(s, "src", "", "real", sa="r", ta="b", tt=0.85, pts=[(240, d.nodes[s].cy), (240, d.nodes["src"].y + d.nodes["src"].h)])
    d.edge("svc", "hit", "trả về", "dep", sa="r", ta="t", st=0.8)
    d.edge("hit", "doc", "", "assoc", card_a="0..*", card_b="1", sa="l", ta="r")
    d.edge("svc", "con", "dùng", "dep", sa="r", ta="l", st=0.2)
    d.edge("doc", "sw", "", "comp", card_a="1", card_b="0..4", sa="b", ta="t")
    d.edge("ci", "doc", "gán bảng màu", "dep", sa="l", ta="r", tt=0.85)
    return d


ALL = [cd_auth, cd_pm, cd_sh, cd_des, cd_p, cd_ot, cd_cs, cd_sr]
