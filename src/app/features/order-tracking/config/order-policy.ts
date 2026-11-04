import { DELIVERY_CONFIG } from './delivery-config';

/** Version stored in every PolicyConsent (FR-OT-17). Bump when the text below changes. */
export const POLICY_VERSION = 'CS-DH-1.0 (05/11/2026)';

const cfg = DELIVERY_CONFIG;
const vnd = (n: number) => `${n.toLocaleString('vi-VN')} đ`;

/** 4–5 key points shown in the Checkout pop-up when the cart has Custom items. */
export const POLICY_HIGHLIGHTS: readonly string[] = [
  `Bạn có thể tự hủy đơn trong ${cfg.cancelWindowMinutes} phút sau khi đặt, hoặc khi thiết kế đang chờ kiểm duyệt.`,
  'Ảnh bạn tải lên được kiểm duyệt nội dung sau khi thanh toán; nếu bị từ chối, bạn được sửa hoặc hủy và hoàn 100%.',
  `Thời gian xử lý & in: hàng Custom ${cfg.handlingDays.custom.min}–${cfg.handlingDays.custom.max} ngày làm việc, cộng thời gian vận chuyển theo khu vực.`,
  'Tiền chỉ được hoàn trong 4 tình huống ghi tại trang chính sách; bạn nhận hoàn qua tài khoản ngân hàng hoặc voucher.',
  'Màu in thực tế có thể lệch nhẹ so với màn hình do khác biệt hiển thị và chất liệu phôi.',
];

export interface PolicySection {
  readonly id: string;
  readonly title: string;
  readonly points: readonly string[];
}

/** Full order policy page content (/order-tracking/chinh-sach). */
export const POLICY_SECTIONS: readonly PolicySection[] = [
  {
    id: 'huy-don',
    title: '1. Hủy đơn hàng',
    points: [
      `Bạn có thể tự hủy đơn trong vòng ${cfg.cancelWindowMinutes} phút kể từ lúc đặt hàng. Giao diện không hiển thị đồng hồ đếm ngược; nút "Hủy đơn" chỉ sáng khi còn được hủy.`,
      'Với đơn có ảnh tải lên đang chờ kiểm duyệt, bạn vẫn được hủy cho tới khi thiết kế được duyệt và đưa vào sản xuất.',
      'Từ khi đơn vào sản xuất (đang in) trở đi, bạn không tự hủy được; nếu có vấn đề, hãy dùng "Báo sự cố" sau khi nhận hàng.',
    ],
  },
  {
    id: 'kiem-duyet',
    title: '2. Kiểm duyệt ảnh tải lên',
    points: [
      `Ảnh bạn tải lên được nhân viên xưởng kiểm duyệt nội dung (thường trong khung ${cfg.moderationWindow.from}–${cfg.moderationWindow.to} ngày làm việc).`,
      `Nếu thiết kế bị từ chối, bạn nhận email kèm nhóm vi phạm và có ${cfg.designFixDeadlineDays} ngày để sửa (gửi lại tối đa ${cfg.maxDesignResubmit} lần) hoặc hủy và nhận hoàn 100%.`,
      `Quá ${cfg.designFixDeadlineDays} ngày không phản hồi, đơn tự hủy và được hoàn 100%.`,
    ],
  },
  {
    id: 'thoi-gian',
    title: '3. Thời gian xử lý và giao hàng',
    points: [
      `Đơn được gom theo mẻ in hằng ngày, chốt lúc ${String(cfg.batchCutoff.hour).padStart(2, '0')}:00 các ngày Thứ 2 – Thứ 6. Đơn đủ điều kiện sau giờ chốt vào mẻ ngày làm việc kế tiếp.`,
      `Xử lý & in: hàng có sẵn ${cfg.handlingDays.stock.min}–${cfg.handlingDays.stock.max} ngày làm việc; đơn có hàng Custom (kể cả đơn hỗn hợp) ${cfg.handlingDays.custom.min}–${cfg.handlingDays.custom.max} ngày làm việc. Đơn hỗn hợp được giao chung một kiện.`,
      'Thời gian vận chuyển đếm từ Thứ 2 đến Thứ 7. Khoảng ngày giao dự kiến (từ–đến) được hiển thị khi đặt hàng và trong chi tiết đơn.',
      'Không có giao hỏa tốc trong ngày vì thời gian xử lý tối thiểu là 1 ngày làm việc.',
    ],
  },
  {
    id: 'phi-van-chuyen',
    title: '4. Phí vận chuyển theo khu vực',
    points: [
      ...(['Z1', 'Z2', 'Z3'] as const).map((z) => {
        const r = cfg.zoneRates[z];
        return `${cfg.zoneLabels[z]}: Standard ${vnd(r.Standard.fee)} (${r.Standard.days.min}–${r.Standard.days.max} ngày); Giao nhanh ${vnd(r.Fast.fee)} (${r.Fast.days.min === r.Fast.days.max ? r.Fast.days.min : `${r.Fast.days.min}–${r.Fast.days.max}`} ngày).`;
      }),
      `Miễn phí vận chuyển Standard cho đơn có giá trị hàng từ ${vnd(cfg.freeshipThreshold)}; chọn Giao nhanh thì trả phần chênh lệch so với Standard cùng khu vực.`,
      'Giao nhanh chỉ áp dụng ở khu vực đơn vị vận chuyển hỗ trợ, không áp dụng cho huyện đảo, vùng xa.',
    ],
  },
  {
    id: 'giao-that-bai',
    title: '5. Giao hàng không thành công',
    points: [
      `Hàng giao không thành công được lưu tại kho ${cfg.warehouseHoldDays} ngày. Bạn được yêu cầu giao lại 1 lần.`,
      'Nếu lỗi do bạn (không nghe máy, sai địa chỉ, từ chối nhận): bạn trả cước giao lại. Đơn hàng có sẵn đã trả trước có thể hủy và nhận hoàn tiền hàng trừ cước vận chuyển hai chiều. Hàng Custom làm riêng không được hoàn.',
      'Nếu lỗi do đơn vị vận chuyển hoặc shop: bạn được giao lại miễn phí hoặc hủy và hoàn 100%, kể cả hàng Custom.',
      `Quá ${cfg.warehouseHoldDays} ngày không xử lý, đơn tự đóng; hàng Custom được tiêu hủy có biên bản để bảo mật thông tin của bạn.`,
      'Nếu không đồng ý với nguyên nhân giao thất bại, bạn gửi "Báo sự cố"; hạn lưu kho tạm dừng trong thời gian đối soát.',
    ],
  },
  {
    id: 'su-co',
    title: '6. Báo sự cố, nhận hàng và hoàn tất đơn',
    points: [
      `Bạn có thể báo sự cố trong ${cfg.complaintWindowDays} ngày kể từ khi giao thành công. Ảnh hoặc video bằng chứng là bắt buộc với lỗi in ấn và hư hỏng khi vận chuyển.`,
      `Sau khi giao thành công, hãy bấm "Đã nhận được hàng". Nếu bạn không thao tác, đơn tự hoàn tất sau ${cfg.autoCompleteHours} giờ (tạm dừng khi có khiếu nại).`,
      'Kết quả xử lý khiếu nại gồm: in lại hoặc gửi lại miễn phí, voucher đền bù, hoàn tiền 100% hoặc từ chối kèm lý do.',
    ],
  },
  {
    id: 'hoan-tien',
    title: '7. Bốn tình huống được hoàn tiền',
    points: [
      'Hủy đơn khi chưa vào sản xuất (trong 30 phút hoặc khi đang chờ kiểm duyệt): hoàn 100%.',
      'Thiết kế bị từ chối và bạn hủy, hoặc quá hạn chỉnh sửa: hoàn 100%.',
      'Giao không thành công: lỗi vận chuyển/shop hoàn 100%; lỗi của bạn với đơn hàng có sẵn trả trước hoàn tiền hàng trừ cước hai chiều; hàng Custom lỗi của bạn không hoàn.',
      'Khiếu nại được chấp nhận hoàn tiền: hoàn 100%.',
      `Cách nhận hoàn: chuyển khoản vào tài khoản đứng tên người thanh toán (nội dung "HOAN <mã đơn>") hoặc voucher bằng 100% giá trị. Nếu chưa cung cấp tài khoản sau ${cfg.refundAccountDeadlineDays} ngày, bạn được cấp voucher.`,
      'Mọi khoản hoàn đều được Admin đối chiếu và xác nhận, không hoàn tự động.',
    ],
  },
  {
    id: 'mau-in',
    title: '8. Dung sai màu in',
    points: ['Màu in thực tế có thể lệch nhẹ so với màn hình do khác biệt hiển thị và chất liệu phôi; đây không được xem là lỗi in ấn.'],
  },
  {
    id: 'dung-han',
    title: '9. Bảo đảm giao đúng hạn',
    points: [
      `Nếu đơn được giao sau ngày cuối của khoảng dự kiến (không do lỗi của bạn, bất khả kháng hoặc yêu cầu giữ hàng), bạn nhận voucher ${cfg.lateVoucherPct}% giá trị hàng, tối đa ${vnd(cfg.lateVoucherCap)}, hạn ${cfg.voucherValidDays} ngày.`,
      'Đơn Giao nhanh bị trễ được cấp thêm voucher bằng phụ phí Giao nhanh đã trả. Mỗi đơn chỉ được cấp một lần.',
    ],
  },
];
