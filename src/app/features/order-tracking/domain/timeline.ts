import { FAILURE_CAUSES } from '../config/delivery-config';
import { Order, OrderStatus } from '../models/order-tracking.model';
import { formatDayLabel, formatShortDate, toDateKey } from './calendar';
import { isConfirmed, isOnHold } from './order-rules';

/**
 * Customer view of an order: one status label, one progress bar and one journey list, all derived
 * from the same status so they never disagree (feedback 14/11: "link timeline với trạng thái").
 */

export type StepKey = 'placed' | 'review' | 'confirm' | 'production' | 'shipping' | 'delivered';
/** attention = the step where the order is stuck and the customer may need to act. */
export type StepState = 'done' | 'current' | 'upcoming' | 'attention';

export interface TimelineStep {
  readonly key: StepKey;
  readonly label: string;
  readonly state: StepState;
  /** When the step was reached (done/current). */
  readonly at?: string;
  /** Short expectation for upcoming steps, e.g. "Dự kiến 17/11". */
  readonly hint?: string;
}

export interface TimelineView {
  /** false for cancelled / refunded orders: the bar is replaced by an info box. */
  readonly visible: boolean;
  /** true while a cancel request is pending: the bar is shown greyed out (FR-OT-20). */
  readonly dimmed: boolean;
  readonly steps: readonly TimelineStep[];
  readonly caption: string;
}

/** Index of the step the order is at (0 placed … 4 delivered) and how it looks. */
function stage(order: Order, now: Date): { index: number; state: 'current' | 'attention' | 'done' } | null {
  switch (order.status) {
    case 'Pending_Review':
      return { index: 1, state: 'current' };
    case 'Action_Required':
      return { index: 1, state: 'attention' };
    case 'Pending_Confirmation':
      // Confirmed (design approved, paid, or COD window over): confirmation is done, production is next.
      return isConfirmed(order, now) ? { index: 2, state: 'current' } : { index: 1, state: 'current' };
    case 'In_Production':
      return { index: 2, state: 'current' };
    case 'Ready_for_Pickup':
    case 'In_Transit':
      return { index: 3, state: 'current' };
    case 'Delivery_Failed':
      return { index: 3, state: 'attention' };
    case 'Delivered':
    case 'Completed':
    case 'Return_Requested':
      return { index: 4, state: 'done' };
    case 'Cancelled':
    case 'Refunded':
      return null;
  }
}

/** Customer label. Same wording in the list, the badge, the account page and the bar. */
export function statusLabel(order: Order, now: Date): string {
  switch (order.status) {
    case 'Pending_Confirmation':
      return isConfirmed(order, now) ? 'Đã xác nhận' : 'Chờ xác nhận';
    case 'Pending_Review':
      return 'Đang duyệt thiết kế';
    case 'In_Production':
      return order.hasCustomItem ? 'Đang sản xuất' : 'Đang chuẩn bị hàng';
    case 'Ready_for_Pickup':
      return 'Đã đóng gói';
    case 'In_Transit':
      return 'Đang giao';
    case 'Delivered':
      return 'Đã giao';
    case 'Completed':
      return 'Hoàn thành';
    case 'Action_Required':
      return 'Cần chỉnh sửa thiết kế';
    case 'Delivery_Failed':
      return 'Giao chưa thành công';
    case 'Return_Requested':
      return 'Đang xử lý sự cố';
    case 'Cancelled':
      return 'Đã hủy';
    case 'Refunded':
      return 'Đã hoàn tiền';
  }
}

/** When production starts, in customer words (the internal 16:00 batch is never named). */
function productionStart(order: Order, now: Date): string {
  const today = toDateKey(now);
  if (order.batchDate === today) return 'trong hôm nay';
  if (order.batchDate < today) return 'trong thời gian sớm nhất';
  return `vào ${formatDayLabel(order.batchDate)}`;
}

/** One sentence under the bar. Never mentions the hidden COD window or the 72h timer. */
export function captionFor(order: Order, now: Date): string {
  if (isOnHold(order)) return 'Đơn tạm dừng trong lúc CSKH xem xét yêu cầu hủy của bạn.';
  switch (order.status) {
    case 'Pending_Confirmation':
      if (!isConfirmed(order, now)) return 'Shop đang xác nhận đơn hàng của bạn.';
      return order.hasCustomItem
        ? `Thiết kế đã được duyệt. Đơn sẽ bắt đầu sản xuất ${productionStart(order, now)}.`
        : `Đơn đã được xác nhận và sẽ được chuẩn bị ${productionStart(order, now)}.`;
    case 'Pending_Review':
      return 'Đội ngũ CasEYE’s đang kiểm tra bản thiết kế để bảo đảm bản in đẹp nhất.';
    case 'In_Production':
      if (order.qcReprintCount > 0) return 'Sản phẩm đang được in lại để bảo đảm chất lượng tốt nhất.';
      return order.hasCustomItem ? 'Ốp lưng của bạn đang được in và kiểm tra chất lượng.' : 'Sản phẩm đang được kiểm tra và đóng gói.';
    case 'Ready_for_Pickup':
      return 'Đơn đã được đóng gói, đang chờ đơn vị vận chuyển đến lấy.';
    case 'In_Transit':
      return 'Đơn hàng đang trên đường đến với bạn.';
    case 'Delivered':
      return 'Đơn đã giao thành công. Hãy kiểm tra sản phẩm và xác nhận khi bạn hài lòng.';
    case 'Completed':
      return 'Đơn hàng đã hoàn tất. Cảm ơn bạn đã chọn CasEYE’s!';
    case 'Action_Required':
      return 'Bản thiết kế cần chỉnh sửa trước khi in.';
    case 'Delivery_Failed':
      return 'Lần giao vừa rồi chưa thành công.';
    case 'Return_Requested':
      return 'CSKH đang xử lý yêu cầu hỗ trợ của bạn.';
    case 'Cancelled':
      return 'Đơn hàng đã được hủy.';
    case 'Refunded':
      return 'Đơn hàng đã được hoàn tiền.';
  }
}

function lastLogTo(order: Order, to: OrderStatus, from?: OrderStatus): string | undefined {
  return [...order.logs].reverse().find((l) => l.to === to && l.from !== l.to && (!from || l.from === from))?.createdAt;
}

/** When the order counts as confirmed (stock orders). */
function confirmedAt(order: Order, now: Date): string | undefined {
  if (order.confirmedAt) return order.confirmedAt;
  return isConfirmed(order, now) ? order.confirmDueAt : undefined;
}

export function buildTimeline(order: Order, now: Date): TimelineView {
  const custom = order.hasCustomItem;
  const s = stage(order, now);
  const eddRange =
    order.earliestEDD === order.latestEDD ? formatShortDate(order.earliestEDD) : `${formatShortDate(order.earliestEDD)} – ${formatShortDate(order.latestEDD)}`;

  const defs: { key: StepKey; label: string; at?: string; hint?: string }[] = [
    { key: 'placed', label: 'Đặt hàng', at: order.createdAt },
    custom
      ? { key: 'review', label: 'Duyệt thiết kế', at: lastLogTo(order, 'Pending_Confirmation', 'Pending_Review') }
      : { key: 'confirm', label: 'Xác nhận', at: confirmedAt(order, now) },
    {
      key: 'production',
      label: custom ? 'Sản xuất' : 'Chuẩn bị hàng',
      at: lastLogTo(order, 'In_Production') ?? lastLogTo(order, 'Ready_for_Pickup'),
      hint: `Dự kiến ${formatShortDate(order.batchDate)}`,
    },
    { key: 'shipping', label: 'Vận chuyển', at: order.shipment?.attempts.at(-1)?.startedAt },
    { key: 'delivered', label: 'Đã giao', at: order.deliveredAt, hint: `Dự kiến ${eddRange}` },
  ];

  const steps = defs.map<TimelineStep>((d, i) => {
    let state: StepState = 'upcoming';
    if (s) {
      if (i < s.index || s.state === 'done') state = 'done';
      else if (i === s.index) state = s.state;
    }
    return {
      key: d.key,
      label: d.label,
      state,
      at: state === 'upcoming' ? undefined : d.at,
      hint: state === 'upcoming' || (state === 'current' && !d.at) ? d.hint : undefined,
    };
  });

  return { visible: s !== null, dimmed: isOnHold(order), steps, caption: captionFor(order, now) };
}

// ------------------------------------------------------------------ journey (merged history)

export type JourneyTone = 'brand' | 'success' | 'warning' | 'danger' | 'muted';

export interface JourneyEvent {
  readonly at: string;
  readonly title: string;
  readonly detail?: string;
  readonly tone: JourneyTone;
  /** Shown with the carrier's name (mock tracking events). */
  readonly fromCarrier?: boolean;
}

const HOUR = 3_600_000;

/** City at the end of the shipping address, e.g. "TP. Hồ Chí Minh". */
function cityOf(address: string): string {
  return address.split(',').at(-1)?.trim() || 'khu vực của bạn';
}

/**
 * Mock carrier scans for each delivery attempt (the real 3PL webhook only sends In_Transit /
 * Delivered / Delivery_Failed). Only scans that already "happened" by now are returned.
 */
function carrierScans(order: Order, now: Date): JourneyEvent[] {
  const attempts = order.shipment?.attempts ?? [];
  const express = order.shippingTier === 'Express';
  const out: JourneyEvent[] = [];
  for (const a of attempts) {
    const start = new Date(a.startedAt).getTime();
    const end = a.endedAt ? new Date(a.endedAt).getTime() : Number.POSITIVE_INFINITY;
    const limit = Math.min(now.getTime(), end);
    const scans: { offset: number; title: string; detail: string }[] = [
      { offset: 0, title: a.attemptNo > 1 ? 'Đơn vị vận chuyển đã lấy hàng để giao lại' : 'Đơn vị vận chuyển đã lấy hàng', detail: 'Tại kho CasEYE’s, TP. Hồ Chí Minh' },
      { offset: (express ? 1 : 4) * HOUR, title: 'Đã đến kho phân loại', detail: `Kho phân loại ${cityOf(order.shippingAddress)}` },
      { offset: (express ? 2 : 18) * HOUR, title: 'Đang giao đến bạn', detail: 'Shipper sẽ gọi điện trước khi giao, bạn để ý điện thoại nhé.' },
    ];
    for (const sc of scans) {
      const t = start + sc.offset;
      if (sc.offset === 0 || t < limit) {
        out.push({ at: new Date(t).toISOString(), title: sc.title, detail: sc.detail, tone: 'brand', fromCarrier: true });
      }
    }
  }
  return out;
}

const RESOLUTION_TEXT: Record<string, string> = {
  Reprint: 'In lại và gửi lại miễn phí',
  Voucher: 'Tặng voucher đền bù',
  Refund: 'Hoàn tiền 100%',
  Rejected: 'Không chấp nhận yêu cầu',
};

/** Everything that happened to the order, newest first, in customer words (no internal reasons). */
export function buildJourney(order: Order, now: Date): JourneyEvent[] {
  const ev: JourneyEvent[] = [];

  for (const l of order.logs) {
    if (l.from === l.to) continue;
    const from = l.from;
    switch (l.to) {
      case 'Pending_Review':
        ev.push(from === 'Action_Required'
          ? { at: l.createdAt, title: 'Bạn đã gửi lại bản thiết kế', tone: 'brand' }
          : { at: l.createdAt, title: 'Đặt hàng thành công', detail: order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'Đã thanh toán', tone: 'brand' });
        break;
      case 'Pending_Confirmation':
        ev.push(from === 'Pending_Review'
          ? { at: l.createdAt, title: 'Thiết kế đã được duyệt', tone: 'success' }
          : { at: l.createdAt, title: 'Đặt hàng thành công', detail: order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'Đã thanh toán', tone: 'brand' });
        break;
      case 'Action_Required':
        ev.push({ at: l.createdAt, title: 'Thiết kế cần chỉnh sửa', detail: 'Xem hướng dẫn chỉnh sửa ở đầu trang.', tone: 'warning' });
        break;
      case 'In_Production':
        ev.push(from === 'Return_Requested'
          ? { at: l.createdAt, title: 'Bắt đầu in lại sản phẩm', tone: 'brand' }
          : { at: l.createdAt, title: order.hasCustomItem ? 'Bắt đầu sản xuất' : 'Bắt đầu chuẩn bị hàng', tone: 'brand' });
        break;
      case 'Ready_for_Pickup':
        ev.push(from === 'Delivery_Failed'
          ? { at: l.createdAt, title: 'Đơn được chuẩn bị để giao lại', tone: 'brand' }
          : { at: l.createdAt, title: 'Đã đóng gói', detail: 'Đang chờ đơn vị vận chuyển đến lấy hàng', tone: 'brand' });
        break;
      case 'In_Transit':
        break; // covered by the carrier pick-up scan
      case 'Delivered':
        ev.push(from === 'Return_Requested'
          ? { at: l.createdAt, title: 'CSKH đã xử lý yêu cầu hỗ trợ', tone: 'success' }
          : { at: l.createdAt, title: 'Giao hàng thành công', tone: 'success' });
        break;
      case 'Completed':
        ev.push({ at: l.createdAt, title: l.actorType === 'Customer' ? 'Bạn đã xác nhận nhận hàng' : 'Đơn hàng hoàn tất', tone: 'success' });
        break;
      case 'Delivery_Failed':
        ev.push({ at: l.createdAt, title: 'Giao hàng chưa thành công', detail: order.failureCause ? FAILURE_CAUSES[order.failureCause].label : undefined, tone: 'danger' });
        break;
      case 'Return_Requested':
        ev.push({ at: l.createdAt, title: 'Bạn đã gửi báo sự cố', tone: 'warning' });
        break;
      case 'Cancelled':
        ev.push({ at: l.createdAt, title: 'Đơn hàng đã hủy', tone: 'muted' });
        break;
      case 'Refunded':
        ev.push({ at: l.createdAt, title: 'Đơn hàng được hoàn tiền', tone: 'success' });
        break;
    }
  }

  // Stock orders: the moment the shop confirmed (not shown when payment itself confirmed it).
  if (!order.hasCustomItem) {
    const c = confirmedAt(order, now);
    if (c && c !== order.createdAt) ev.push({ at: c, title: 'Shop đã xác nhận đơn hàng', tone: 'success' });
  }

  for (const r of order.cancelRequests) {
    ev.push({ at: r.createdAt, title: 'Bạn đã gửi yêu cầu hủy đơn', tone: 'warning' });
    if (r.decidedAt) {
      if (r.status === 'Withdrawn') ev.push({ at: r.decidedAt, title: 'Bạn đã rút lại yêu cầu hủy', tone: 'muted' });
      if (r.status === 'Rejected') ev.push({ at: r.decidedAt, title: 'Yêu cầu hủy không được chấp nhận', detail: r.decisionReason, tone: 'warning' });
      if (r.status === 'Accepted') ev.push({ at: r.decidedAt, title: 'Yêu cầu hủy đã được chấp nhận', tone: 'success' });
    }
  }

  for (const t of order.tickets) {
    if (t.resolvedAt && t.resolution) {
      ev.push({ at: t.resolvedAt, title: 'Kết quả yêu cầu hỗ trợ', detail: RESOLUTION_TEXT[t.resolution] ?? t.resolution, tone: t.resolution === 'Rejected' ? 'muted' : 'success' });
    }
  }

  for (const r of order.refunds) {
    if (r.status === 'Refunded' && r.resolvedAt) {
      ev.push({ at: r.resolvedAt, title: 'Đã chuyển khoản hoàn tiền', detail: `${r.amount.toLocaleString('vi-VN')} ₫`, tone: 'success' });
    }
  }

  ev.push(...carrierScans(order, now));
  return ev.sort((a, b) => b.at.localeCompare(a.at));
}

// ------------------------------------------------------------------ list tabs

/** Customer-facing filter tabs (FR-OT-03), merged to 6 (feedback 14/11). */
export type OrderTab = 'all' | 'action' | 'processing' | 'shipping' | 'done' | 'closed';

export const ORDER_TABS: readonly { key: OrderTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'action', label: 'Cần xử lý' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'done', label: 'Hoàn thành' },
  { key: 'closed', label: 'Đã hủy' },
];

/** Old ?tab= values still open the right tab. */
export const LEGACY_TABS: Readonly<Record<string, OrderTab>> = { pending: 'processing', printing: 'processing' };

const TAB_STATUSES: Record<Exclude<OrderTab, 'all'>, readonly OrderStatus[]> = {
  // Needs the customer: fix the design, choose re-delivery, or follow a support request.
  action: ['Action_Required', 'Delivery_Failed', 'Return_Requested'],
  // The shop is working on it: confirming, reviewing the design, producing, packing.
  processing: ['Pending_Confirmation', 'Pending_Review', 'In_Production', 'Ready_for_Pickup'],
  shipping: ['In_Transit'],
  done: ['Delivered', 'Completed'],
  closed: ['Cancelled', 'Refunded'],
};

export function matchesTab(status: OrderStatus, tab: OrderTab): boolean {
  return tab === 'all' || TAB_STATUSES[tab].includes(status);
}
