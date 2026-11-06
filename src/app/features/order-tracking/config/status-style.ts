import { OrderStatus, RefundStatus } from '../models/order-tracking.model';

/**
 * The ONLY place where status colours live (decision F). Tailwind default palette is used
 * for success/warning/danger until the team adds semantic tokens to tokens.css; swap the
 * classes here and every badge follows.
 */
export type Tone = 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export const TONE_CLASSES: Record<Tone, { badge: string; box: string; dot: string }> = {
  brand: { badge: 'bg-brand-100 text-brand-800', box: 'border-brand-200 bg-brand-50 text-brand-900', dot: 'bg-brand-600' },
  info: { badge: 'bg-sky-50 text-sky-800', box: 'border-sky-200 bg-sky-50 text-sky-900', dot: 'bg-sky-500' },
  success: { badge: 'bg-emerald-50 text-emerald-800', box: 'border-emerald-200 bg-emerald-50 text-emerald-900', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-50 text-amber-800', box: 'border-amber-200 bg-amber-50 text-amber-900', dot: 'bg-amber-500' },
  danger: { badge: 'bg-rose-50 text-rose-800', box: 'border-rose-200 bg-rose-50 text-rose-900', dot: 'bg-rose-500' },
  neutral: { badge: 'bg-line text-ink-soft', box: 'border-line bg-surface text-ink', dot: 'bg-ink-soft' },
};

export const STATUS_META: Record<OrderStatus, { label: string; tone: Tone }> = {
  Pending_Confirmation: { label: 'Chờ xác nhận', tone: 'brand' },
  Pending_Review: { label: 'Đang kiểm tra thiết kế', tone: 'brand' },
  Action_Required: { label: 'Cần chỉnh sửa thiết kế', tone: 'warning' },
  In_Production: { label: 'Đang in', tone: 'brand' },
  Ready_for_Pickup: { label: 'Đã đóng gói', tone: 'info' },
  In_Transit: { label: 'Đang giao', tone: 'info' },
  Delivered: { label: 'Đã giao', tone: 'success' },
  Completed: { label: 'Hoàn thành', tone: 'success' },
  Delivery_Failed: { label: 'Giao không thành công', tone: 'danger' },
  Return_Requested: { label: 'Đang xử lý yêu cầu hỗ trợ', tone: 'warning' },
  Cancelled: { label: 'Đã hủy', tone: 'neutral' },
  Refunded: { label: 'Đã hoàn tiền', tone: 'neutral' },
};

export const REFUND_TONE: Record<RefundStatus, Tone> = {
  Pending_Approval: 'warning',
  Processing: 'info',
  Refunded: 'success',
  Rejected: 'danger',
  Refund_Pending_Retry: 'warning',
  Refund_Pending_Manual: 'warning',
};

/** Outline button in warning colour for destructive secondary actions (e.g. "Xác nhận hủy"). */
export const DANGER_OUTLINE = 'border-rose-700 text-rose-800 hover:bg-rose-50';
