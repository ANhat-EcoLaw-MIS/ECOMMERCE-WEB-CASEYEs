import { DELIVERY_CONFIG } from './delivery-config';

/** Version stored in every PolicyConsent (FR-OT-17). Bump when the text below changes. */
export const POLICY_VERSION = 'CS-DH-2.0 (06/11/2026)';

const cfg = DELIVERY_CONFIG;
const hhmm = (c: { hour: number; minute: number }) => `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;

/** Where Thanh toán publishes shipping fees (this page only links to it, FR-OT-17). */
export const SHIPPING_FEE_LINK = '/cart';

/**
 * Key points for the Checkout pop-up when the cart has custom designs (FR-OT-17), and the
 * "4 điều bạn cần biết" box on the policy page. No number for the COD window (v8).
 */
export const POLICY_HIGHLIGHTS: readonly { id: string; title: string; text: string }[] = [
  {
    id: 'huy-don',
    title: 'Cách hủy đơn',
    text: 'Đơn thanh toán khi nhận hàng được tự hủy trước khi shop xác nhận. Đơn đã thanh toán gửi “Yêu cầu hủy đơn”, CSKH phản hồi trong 1 ngày làm việc.',
  },
  {
    id: 'duyet-thiet-ke',
    title: 'Nhân viên duyệt bản thiết kế',
    text: 'Mọi thiết kế theo yêu cầu được nhân viên kiểm tra trước khi in. Nếu chưa đạt, bạn được chỉnh sửa hoặc hủy và nhận hoàn 100%.',
  },
  {
    id: 'thoi-gian',
    title: 'Thời gian xử lý & giao',
    text: `Hàng có sẵn ${cfg.handlingDays.stock.min}–${cfg.handlingDays.stock.max} ngày làm việc, thiết kế theo yêu cầu ${cfg.handlingDays.custom.min}–${cfg.handlingDays.custom.max} ngày làm việc, cộng thời gian vận chuyển theo địa chỉ của bạn.`,
  },
  {
    id: 'hoan-tien',
    title: 'Hoàn tiền',
    text: 'Tiền chỉ được hoàn trong các tình huống ghi tại trang này; bạn nhận qua tài khoản ngân hàng hoặc voucher, mọi khoản đều được Admin xác nhận.',
  },
];

/** Extra line for the custom-design pop-up (colour tolerance). */
export const POLICY_COLOR_NOTE = 'Màu in thực tế có thể lệch nhẹ so với màn hình do khác biệt hiển thị và chất liệu phôi.';

export interface PolicySection {
  readonly id: string;
  readonly title: string;
  readonly points: readonly string[];
}

/** Full order policy page content (/order-tracking/chinh-sach), v8 wording. */
export const POLICY_SECTIONS: readonly PolicySection[] = [
  {
    id: 'huy-don',
    title: '1. Hủy đơn hàng',
    points: [
      'Đơn thanh toán khi nhận hàng (chỉ gồm hàng có sẵn): bạn tự hủy được trong thời gian ngắn sau khi đặt, trước khi shop xác nhận đơn. Nút “Hủy đơn” chỉ hiện khi còn hủy được; sau khi đơn được xác nhận, bạn vẫn có thể từ chối nhận hàng khi giao.',
      'Đơn đã thanh toán trước: bạn gửi “Yêu cầu hủy đơn” kèm lý do. CSKH phản hồi trong 1 ngày làm việc; trong thời gian này đơn được tạm giữ, không in và không đóng gói. Bạn có thể rút lại yêu cầu khi chưa có kết quả.',
      'Nếu thiết kế của bạn chưa đạt chính sách nội dung, bạn được hủy ngay và nhận hoàn 100%.',
      'Từ khi đơn vào sản xuất (đang in) hoặc đã đóng gói, đơn không hủy được nữa; nếu có vấn đề khi nhận hàng, hãy dùng “Báo sự cố”.',
    ],
  },
  {
    id: 'duyet-thiet-ke',
    title: '2. Nhân viên duyệt bản thiết kế',
    points: [
      'Mọi đơn có hàng thiết kế theo yêu cầu được nhân viên xưởng kiểm tra bản thiết kế final trước khi in.',
      `Nếu thiết kế chưa đạt, bạn nhận email kèm nhóm vi phạm và có ${cfg.designFixDeadlineDays} ngày để chỉnh sửa (gửi lại tối đa ${cfg.maxDesignResubmit} lần) hoặc hủy và nhận hoàn 100%.`,
      `Quá ${cfg.designFixDeadlineDays} ngày không phản hồi, đơn tự hủy và được hoàn 100%.`,
    ],
  },
  {
    id: 'thoi-gian',
    title: '3. Thời gian xử lý và giao hàng',
    points: [
      `Đơn thiết kế theo yêu cầu được gom theo mẻ in hằng ngày; ${hhmm(cfg.batchCutoff)} các ngày Thứ 2 – Thứ 6 là giờ cắt đơn, đơn xác nhận sau giờ này vào mẻ của ngày làm việc kế tiếp.`,
      `Xử lý & in: hàng có sẵn ${cfg.handlingDays.stock.min}–${cfg.handlingDays.stock.max} ngày làm việc; đơn có hàng thiết kế theo yêu cầu (kể cả đơn hỗn hợp, giao chung một kiện) ${cfg.handlingDays.custom.min}–${cfg.handlingDays.custom.max} ngày làm việc.`,
      'Thời gian vận chuyển phụ thuộc địa chỉ nhận và đếm từ Thứ 2 đến Thứ 7. Khoảng ngày giao dự kiến (từ–đến) hiện khi đặt hàng và trong chi tiết đơn.',
      `Hỏa tốc chỉ áp dụng cho đơn chỉ gồm hàng có sẵn, ở khu vực được hỗ trợ: đơn xác nhận trước ${hhmm(cfg.expressCutoff)} ngày làm việc được giao trong ngày, sau giờ này giao trong ngày làm việc kế tiếp.`,
      'Phí vận chuyển và phạm vi Hỏa tốc do bộ phận Thanh toán công bố khi bạn chọn địa chỉ ở bước thanh toán.',
    ],
  },
  {
    id: 'giao-that-bai',
    title: '4. Giao hàng không thành công',
    points: [
      `Hàng giao không thành công được lưu tại kho ${cfg.warehouseHoldDays} ngày. Bạn được yêu cầu giao lại 1 lần.`,
      'Nếu lỗi do bạn (không nghe máy, sai địa chỉ, từ chối nhận): bạn trả cước giao lại. Đơn hàng có sẵn đã trả trước có thể hủy và nhận hoàn tiền hàng trừ cước vận chuyển hai chiều. Hàng thiết kế theo yêu cầu làm riêng không được hoàn.',
      'Nếu lỗi do đơn vị vận chuyển hoặc shop: bạn được giao lại miễn phí hoặc hủy và hoàn 100%, kể cả hàng thiết kế theo yêu cầu.',
      `Quá ${cfg.warehouseHoldDays} ngày không xử lý, đơn tự đóng; hàng thiết kế theo yêu cầu được tiêu hủy có biên bản để bảo mật thông tin của bạn.`,
      'Nếu không đồng ý với nguyên nhân giao thất bại, bạn gửi “Báo sự cố”; hạn lưu kho tạm dừng trong thời gian đối soát.',
    ],
  },
  {
    id: 'su-co',
    title: '5. Báo sự cố, nhận hàng và hoàn tất đơn',
    points: [
      `Bạn có thể báo sự cố trong ${cfg.complaintWindowDays} ngày kể từ khi giao thành công. Ảnh hoặc video bằng chứng là bắt buộc với lỗi in ấn và hư hỏng khi vận chuyển.`,
      `Sau khi nhận hàng, hãy bấm “Đã nhận được hàng”. Nếu bạn không thao tác, đơn tự hoàn tất sau ${cfg.autoCompleteHours} giờ (tạm dừng khi có khiếu nại).`,
      'Kết quả xử lý khiếu nại gồm: in lại hoặc gửi lại miễn phí, voucher đền bù, hoàn tiền 100% hoặc từ chối kèm lý do.',
    ],
  },
  {
    id: 'hoan-tien',
    title: '6. Các tình huống được hoàn tiền',
    points: [
      'Yêu cầu hủy đơn đã thanh toán được CSKH chấp nhận khi đơn chưa vào sản xuất: hoàn 100%.',
      'Thiết kế chưa đạt và bạn hủy, hoặc quá hạn chỉnh sửa: hoàn 100%.',
      'Giao không thành công: lỗi vận chuyển/shop hoàn 100%; lỗi của bạn với đơn hàng có sẵn trả trước hoàn tiền hàng trừ cước hai chiều; hàng thiết kế theo yêu cầu lỗi của bạn không hoàn.',
      'Khiếu nại được chấp nhận hoàn tiền: hoàn 100%.',
      `Cách nhận hoàn: chuyển khoản vào tài khoản đứng tên người thanh toán (nội dung “HOAN <mã đơn>”) hoặc voucher bằng 100% giá trị. Nếu chưa cung cấp tài khoản sau ${cfg.refundAccountDeadlineDays} ngày, bạn được cấp voucher.`,
      'Mọi khoản hoàn đều được Admin đối chiếu và xác nhận, không hoàn tự động. Đơn thanh toán khi nhận hàng không phát sinh hoàn tiền khi hủy.',
    ],
  },
  {
    id: 'mau-in',
    title: '7. Dung sai màu in',
    points: [`${POLICY_COLOR_NOTE} Điều này không được xem là lỗi in ấn.`],
  },
  {
    id: 'dung-han',
    title: '8. Bảo đảm giao đúng hạn',
    points: [
      `Nếu đơn được giao sau ngày cuối của khoảng dự kiến (không do lỗi của bạn, bất khả kháng hoặc yêu cầu giữ hàng), bạn nhận voucher ${cfg.lateVoucherPct}% giá trị hàng, tối đa ${cfg.lateVoucherCap.toLocaleString('vi-VN')} ₫, hạn ${cfg.voucherValidDays} ngày.`,
      'Đơn Hỏa tốc bị trễ được cấp thêm voucher bằng phụ phí Hỏa tốc đã trả. Mỗi đơn chỉ được cấp một lần.',
    ],
  },
];
