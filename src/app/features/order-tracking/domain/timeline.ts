import { Order, OrderStatus } from '../models/order-tracking.model';
import { isConfirmed, isOnHold } from './order-rules';

export type StepKey = 'confirm' | 'printing' | 'packing' | 'shipping' | 'done';
export type StepState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  readonly key: StepKey;
  readonly label: string;
  readonly state: StepState;
  /** When the order reached this milestone (from OrderStatusLog). */
  readonly at?: string;
}

export interface TimelineView {
  /** false for exception statuses: the bar is hidden and a badge + info box is shown. */
  readonly visible: boolean;
  /** true while a cancel request is pending: the bar is shown greyed out (FR-OT-20). */
  readonly dimmed: boolean;
  readonly steps: readonly TimelineStep[];
  readonly caption: string;
}

const STEP_LABELS: Record<StepKey, string> = {
  confirm: 'Xác nhận',
  printing: 'Đang in',
  packing: 'Đóng gói',
  shipping: 'Đang giao',
  done: 'Hoàn thành',
};

/** Table 3.2: internal status -> customer milestone. */
const STATUS_STEP: Partial<Record<OrderStatus, StepKey>> = {
  Pending_Confirmation: 'confirm',
  Pending_Review: 'confirm',
  In_Production: 'printing',
  Ready_for_Pickup: 'packing',
  In_Transit: 'shipping',
  Delivered: 'done',
  Completed: 'done',
};

/** First status that marks each milestone as reached. */
const STEP_ENTRY: Record<StepKey, readonly OrderStatus[]> = {
  confirm: ['Pending_Confirmation', 'Pending_Review'],
  printing: ['In_Production'],
  packing: ['Ready_for_Pickup'],
  shipping: ['In_Transit'],
  done: ['Delivered'],
};

export const EXCEPTION_STATUSES: readonly OrderStatus[] = [
  'Action_Required',
  'Cancelled',
  'Delivery_Failed',
  'Return_Requested',
  'Refunded',
];

/**
 * Customer label (Table 3.2, v8): Chờ xác nhận / Đã xác nhận / Đang kiểm tra thiết kế / Đang in /
 * Đã đóng gói / Đang giao / Đã giao / Hoàn thành / Đã hủy / Đã hoàn tiền, plus the exception badges.
 */
export function statusLabel(order: Order, now: Date): string {
  switch (order.status) {
    case 'Pending_Confirmation':
      return isConfirmed(order, now) ? 'Đã xác nhận' : 'Chờ xác nhận';
    case 'Pending_Review':
      return 'Đang kiểm tra thiết kế';
    case 'In_Production':
      return 'Đang in';
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
      return 'Giao không thành công';
    case 'Return_Requested':
      return 'Đang xử lý yêu cầu hỗ trợ';
    case 'Cancelled':
      return 'Đã hủy';
    case 'Refunded':
      return 'Đã hoàn tiền';
  }
}

/** One-line explanation of the current step. Never mentions the hidden COD window or the 72h timer. */
export function captionFor(order: Order, now: Date): string {
  if (isOnHold(order)) return 'Đơn đang tạm giữ chờ xử lý yêu cầu hủy';
  switch (order.status) {
    case 'Pending_Confirmation':
      if (!isConfirmed(order, now)) return 'Shop đã nhận đơn và sắp xác nhận';
      return order.hasCustomItem
        ? 'Thiết kế đã được duyệt, đơn chờ vào mẻ in gần nhất'
        : 'Đơn đã được xác nhận và đang được chuẩn bị';
    case 'Pending_Review':
      return 'Nhân viên đang kiểm tra bản thiết kế trước khi in';
    case 'In_Production':
      return order.qcReprintCount > 0
        ? 'Sản phẩm đang được in lại để đảm bảo chất lượng'
        : 'Thiết kế đang được in và kiểm tra chất lượng';
    case 'Ready_for_Pickup':
      return 'Đóng gói xong, chờ đơn vị vận chuyển lấy hàng';
    case 'In_Transit':
      return 'Đơn hàng đang trên đường giao';
    case 'Delivered':
      return 'Đã giao thành công';
    case 'Completed':
      return 'Đơn hàng đã hoàn tất';
    case 'Action_Required':
      return 'Thiết kế cần chỉnh sửa';
    case 'Delivery_Failed':
      return 'Giao không thành công';
    case 'Return_Requested':
      return 'Yêu cầu hỗ trợ đang được xử lý';
    case 'Cancelled':
      return 'Đơn hàng đã hủy';
    case 'Refunded':
      return 'Đơn hàng được hoàn tiền';
  }
}

function reachedAt(order: Order, key: StepKey): string | undefined {
  const entry = STEP_ENTRY[key];
  // Latest entry wins so a re-delivery or reprint shows the newest time.
  return [...order.logs].reverse().find((l) => entry.includes(l.to) && l.from !== l.to)?.createdAt;
}

export function buildTimeline(order: Order, now: Date): TimelineView {
  const keys: StepKey[] = order.hasCustomItem
    ? ['confirm', 'printing', 'packing', 'shipping', 'done']
    : ['confirm', 'packing', 'shipping', 'done'];
  const currentKey = STATUS_STEP[order.status];
  const currentIdx = currentKey ? keys.indexOf(currentKey) : -1;

  const steps = keys.map<TimelineStep>((key, i) => {
    const state: StepState =
      order.status === 'Completed' || i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming';
    return { key, label: STEP_LABELS[key], state, at: state === 'upcoming' ? undefined : reachedAt(order, key) };
  });

  return {
    visible: currentIdx >= 0,
    dimmed: isOnHold(order),
    steps,
    caption: captionFor(order, now),
  };
}

/** Customer-facing filter tabs (FR-OT-03). */
export type OrderTab = 'all' | 'pending' | 'printing' | 'shipping' | 'done' | 'closed' | 'action';

export const ORDER_TABS: readonly { key: OrderTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'action', label: 'Cần xử lý' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'printing', label: 'Đang in' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'done', label: 'Hoàn thành' },
  { key: 'closed', label: 'Đã hủy & hoàn tiền' },
];

const TAB_STATUSES: Record<Exclude<OrderTab, 'all'>, readonly OrderStatus[]> = {
  pending: ['Pending_Confirmation', 'Pending_Review'],
  printing: ['In_Production'],
  shipping: ['Ready_for_Pickup', 'In_Transit'],
  done: ['Delivered', 'Completed'],
  closed: ['Cancelled', 'Refunded'],
  action: ['Action_Required', 'Delivery_Failed', 'Return_Requested'],
};

export function matchesTab(status: OrderStatus, tab: OrderTab): boolean {
  return tab === 'all' || TAB_STATUSES[tab].includes(status);
}
