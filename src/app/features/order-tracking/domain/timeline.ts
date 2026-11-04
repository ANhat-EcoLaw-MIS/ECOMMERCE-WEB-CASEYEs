import { Order, OrderStatus } from '../models/order-tracking.model';

export type StepKey = 'confirm' | 'printing' | 'packing' | 'shipping' | 'done';
export type StepState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  readonly key: StepKey;
  readonly label: string;
  readonly state: StepState;
}

export interface TimelineView {
  /** false for exception statuses: the bar is hidden and a badge + info box is shown. */
  readonly visible: boolean;
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

export const EXCEPTION_STATUSES: readonly OrderStatus[] = [
  'Action_Required',
  'Cancelled',
  'Delivery_Failed',
  'Return_Requested',
  'Refunded',
];

/** Dynamic caption (Table 3.2). Never mentions the hidden 30-minute window or 72h timer. */
export function captionFor(order: Order): string {
  switch (order.status) {
    case 'Pending_Confirmation':
      return 'Đã tiếp nhận đơn hàng';
    case 'Pending_Review':
      return 'Thiết kế đang được kiểm duyệt';
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

export function buildTimeline(order: Order): TimelineView {
  const keys: StepKey[] = order.hasCustomItem
    ? ['confirm', 'printing', 'packing', 'shipping', 'done']
    : ['confirm', 'packing', 'shipping', 'done'];
  const currentKey = STATUS_STEP[order.status];
  const currentIdx = currentKey ? keys.indexOf(currentKey) : -1;

  const steps = keys.map<TimelineStep>((key, i) => ({
    key,
    label: STEP_LABELS[key],
    state:
      order.status === 'Completed' || i < currentIdx
        ? 'done'
        : i === currentIdx
          ? 'current'
          : 'upcoming',
  }));

  return { visible: currentIdx >= 0, steps, caption: captionFor(order) };
}

/** Customer-facing filter tabs (v5 FR-OT-03). */
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
