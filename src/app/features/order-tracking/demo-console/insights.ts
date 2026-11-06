import { CANCEL_REASON_LABELS } from '../config/delivery-config';
import { CancelReason, Order } from '../models/order-tracking.model';
import { TrackEvent } from '../services/tracker';

export interface InsightRow {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
}

const pct = (a: number, b: number) => (b === 0 ? '–' : `${Math.round((a / b) * 100)}%`);

/**
 * P2 "Insights": simple tables from the tracking queue and order data, to show what the
 * customer UI lets the business learn (BR-OT-06). Pure function so it is easy to test.
 */
export function buildInsights(events: readonly TrackEvent[], orders: readonly Order[]) {
  const count = (name: TrackEvent['name'], pred: (e: TrackEvent) => boolean = () => true) =>
    events.filter((e) => e.name === name && pred(e)).length;

  // Cancel reasons: from stored records (COD cancels and cancel requests).
  const reasons = new Map<CancelReason, number>();
  for (const o of orders) {
    if (o.cancellation?.reason) reasons.set(o.cancellation.reason, (reasons.get(o.cancellation.reason) ?? 0) + 1);
    for (const r of o.cancelRequests) {
      if (r.status !== 'Accepted') reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
    }
  }
  const totalReasons = [...reasons.values()].reduce((a, b) => a + b, 0);
  const reasonRows: InsightRow[] = [...reasons.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => ({ label: CANCEL_REASON_LABELS[r], value: String(n), note: pct(n, totalReasons) }));

  const cod = count('cancel_submitted', (e) => e.props['kind'] === 'cod');
  const req = count('cancel_submitted', (e) => e.props['kind'] === 'request');
  const voucher = count('refund_method_chosen', (e) => e.props['method'] === 'Voucher');
  const bank = count('refund_method_chosen', (e) => e.props['method'] === 'Bank');
  const later = count('refund_method_chosen', (e) => e.props['method'] === 'Later');

  const decided = orders.flatMap((o) => o.cancelRequests).filter((r) => r.decidedAt && (r.status === 'Accepted' || r.status === 'Rejected'));
  const avgHours = decided.length
    ? decided.reduce((s, r) => s + (new Date(r.decidedAt!).getTime() - new Date(r.createdAt).getTime()), 0) / decided.length / 3_600_000
    : null;

  const reorder = count('reorder_clicked');
  const closedOrders = orders.filter((o) => o.status === 'Completed' || o.status === 'Cancelled').length;
  const ratings = events.filter((e) => e.name === 'rating_submitted');
  const avgStars = ratings.length ? ratings.reduce((s, e) => s + Number(e.props['stars'] ?? 0), 0) / ratings.length : null;

  const summary: InsightRow[] = [
    { label: 'Hủy COD / Yêu cầu hủy (đơn trả trước)', value: `${cod} / ${req}`, note: `COD chiếm ${pct(cod, cod + req)}` },
    { label: 'Nhận hoàn: voucher / tài khoản / cung cấp sau', value: `${voucher} / ${bank} / ${later}`, note: `Voucher ${pct(voucher, voucher + bank + later)}` },
    { label: 'Thời gian TB từ gửi yêu cầu hủy đến có kết quả', value: avgHours === null ? '–' : `${avgHours.toFixed(1)} giờ`, note: `${decided.length} yêu cầu` },
    { label: 'Số lần mở “Vì sao?” ở ngày giao dự kiến', value: String(count('edd_why_opened')), note: `trên ${count('order_detail_viewed')} lần xem chi tiết` },
    { label: 'Bấm “Mua lại / Đặt lại thiết kế”', value: String(reorder), note: `${pct(reorder, closedOrders)} so với đơn đã hoàn thành/hủy` },
    { label: 'Mở ảnh thiết kế (lightbox)', value: String(count('design_preview_opened')) },
    { label: 'Đánh giá đã gửi / sao trung bình', value: `${ratings.length} / ${avgStars === null ? '–' : avgStars.toFixed(1)}` },
    { label: 'Báo sự cố đã gửi', value: String(count('issue_reported')) },
    { label: 'Tìm kiếm không có kết quả', value: String(count('order_search', (e) => e.props['hasResult'] === false)), note: `trên ${count('order_search')} lần tìm` },
  ];

  return { summary, reasonRows, total: events.length };
}
