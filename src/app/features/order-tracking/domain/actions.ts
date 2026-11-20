import { Order } from '../models/order-tracking.model';
import { matchesTab } from './timeline';

/** Deep-link intents the detail page understands (`?action=`). */
export type DetailIntent = 'received' | 'redeliver' | 'edit-design' | 'refund';

export interface PrimaryAction {
  readonly label: string;
  /** Router commands. */
  readonly link: readonly string[];
  readonly queryParams?: Readonly<Record<string, string>>;
  /** Reorder buttons leave this module (P2 tracks them). */
  readonly reorder?: 'completed' | 'cancelled';
}

/** Orders the customer must act on: tab "Cần xử lý" and the header dot (FR-OT-03). */
export function needsAttention(order: Order): boolean {
  return matchesTab(order.status, 'action');
}

/**
 * One primary button per state (P1-2): the card and the mobile action bar use the same rule,
 * so the customer always sees the single most useful next step.
 */
export function primaryAction(order: Order): PrimaryAction {
  const detail = ['/order-tracking', order.orderCode];
  switch (order.status) {
    case 'Action_Required':
      return { label: 'Chỉnh sửa thiết kế', link: detail, queryParams: { action: 'edit-design' } };
    case 'Delivery_Failed':
      return { label: 'Chọn cách giao lại', link: detail, queryParams: { action: 'redeliver' } };
    case 'Delivered':
      return { label: 'Đã nhận được hàng', link: detail, queryParams: { action: 'received' } };
    case 'Completed':
      return { label: 'Mua lại', link: [order.hasCustomItem ? '/design-studio' : '/shop'], reorder: 'completed' };
    case 'Cancelled':
      return order.hasCustomItem
        ? { label: 'Đặt lại thiết kế này', link: ['/design-studio'], reorder: 'cancelled' }
        : { label: 'Mua lại', link: ['/shop'], reorder: 'cancelled' };
    default:
      return { label: 'Xem đơn hàng', link: detail };
  }
}

export interface TextPart {
  readonly text: string;
  readonly hit: boolean;
}

/** Splits `text` around case/accent-insensitive matches of `query` for highlighting (P1-3). */
export function highlight(text: string, query: string): TextPart[] {
  const q = fold(query.trim());
  if (!q) return [{ text, hit: false }];
  const folded = fold(text);
  const parts: TextPart[] = [];
  let i = 0;
  for (let at = folded.indexOf(q); at >= 0; at = folded.indexOf(q, i)) {
    if (at > i) parts.push({ text: text.slice(i, at), hit: false });
    parts.push({ text: text.slice(at, at + q.length), hit: true });
    i = at + q.length;
  }
  if (i < text.length) parts.push({ text: text.slice(i), hit: false });
  return parts;
}

/** Lower-case without Vietnamese accents, same length as the input (đ -> d). */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}
