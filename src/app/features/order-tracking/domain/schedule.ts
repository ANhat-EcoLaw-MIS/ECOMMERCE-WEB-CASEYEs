import { DELIVERY_CONFIG } from '../config/delivery-config';
import { Order } from '../models/order-tracking.model';
import { addWorkingDays, formatShortDate, fromDateKey, isWorkingDay, toDateKey } from './calendar';
import { batchDateFor } from './edd';
import { isConfirmed, isOnHold, pendingCancelRequest } from './order-rules';

/**
 * Time limits of the whole order process in one place (feedback 15/11): when each step is due,
 * whether an order may start production now, and which orders are late.
 */

const HOUR = 3_600_000;

function cutoffToday(now: Date): Date {
  const c = new Date(now);
  c.setHours(DELIVERY_CONFIG.batchCutoff.hour, DELIVERY_CONFIG.batchCutoff.minute, 0, 0);
  return c;
}

/** Day a confirmed custom order is due to start production (16:00 run of its confirmation day). */
export function productionDueDate(o: Order): string {
  return o.confirmedAt ? toDateKey(batchDateFor(new Date(o.confirmedAt))) : o.batchDate;
}

/**
 * Whether a custom order goes into production now:
 * - 'overdue': its production day has passed (missed run) → may start at any time;
 * - 'due': today's 16:00 run has started;
 * - null: not yet (or not eligible: not approved, on hold, stock order…).
 */
export function productionSlot(o: Order, now: Date): 'overdue' | 'due' | null {
  if (o.status !== 'Pending_Confirmation' || !o.hasCustomItem || !o.confirmedAt || isOnHold(o)) return null;
  const due = productionDueDate(o);
  const today = toDateKey(now);
  if (due < today) return 'overdue';
  if (due === today && isWorkingDay(now, DELIVERY_CONFIG.holidays) && now.getTime() >= cutoffToday(now).getTime()) return 'due';
  return null;
}

function lastLogTo(o: Order, to: Order['status']): string | undefined {
  return [...o.logs].reverse().find((l) => l.to === to && l.from !== l.to)?.createdAt;
}

function endOfDay(key: string): number {
  const d = fromDateKey(key);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export interface Lateness {
  /** Short admin label, e.g. "Trễ đợt sản xuất". */
  readonly label: string;
  /** When the step became late (ISO). */
  readonly since: string;
}

/** Which step of the order is past its time limit, if any (admin "Trễ hẹn"). */
export function lateness(o: Order, now: Date): Lateness | null {
  const cfg = DELIVERY_CONFIG;
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();

  const request = pendingCancelRequest(o);
  if (request && t > new Date(request.slaDueAt).getTime()) return { label: 'Yêu cầu hủy quá hạn phản hồi', since: request.slaDueAt };

  switch (o.status) {
    case 'Pending_Review': {
      if (!o.reviewQueuedAt || isOnHold(o)) return null;
      const due = new Date(o.reviewQueuedAt).getTime() + cfg.moderationSlaHours * HOUR;
      return t > due ? { label: `Duyệt thiết kế quá ${cfg.moderationSlaHours} giờ`, since: iso(due) } : null;
    }
    case 'Pending_Confirmation': {
      if (!isConfirmed(o, now) || isOnHold(o)) return null;
      if (o.hasCustomItem) {
        const due = productionDueDate(o);
        return due < toDateKey(now) ? { label: `Trễ đợt sản xuất ${formatShortDate(due)}`, since: iso(endOfDay(due)) } : null;
      }
      // Stock: packed within the handling time after confirmation.
      const from = new Date(o.confirmedAt ?? o.confirmDueAt ?? o.createdAt);
      const due = addWorkingDays(from, cfg.handlingDays.stock.max, cfg.holidays).getTime();
      return t > due ? { label: 'Chưa đóng gói đúng hẹn', since: iso(due) } : null;
    }
    case 'In_Production': {
      const from = lastLogTo(o, 'In_Production');
      if (!from) return null;
      const due = addWorkingDays(new Date(from), cfg.handlingDays.custom.max, cfg.holidays).getTime();
      return t > due ? { label: `Sản xuất quá ${cfg.handlingDays.custom.max} ngày làm việc`, since: iso(due) } : null;
    }
    case 'Ready_for_Pickup': {
      const from = lastLogTo(o, 'Ready_for_Pickup');
      if (!from) return null;
      const due = addWorkingDays(new Date(from), cfg.pickupSlaWorkingDays, cfg.holidays).getTime();
      return t > due ? { label: 'Chưa bàn giao vận chuyển', since: iso(due) } : null;
    }
    case 'In_Transit':
      return t > endOfDay(o.latestEDD) ? { label: 'Giao trễ so với dự kiến', since: iso(endOfDay(o.latestEDD)) } : null;
    default:
      return null;
  }
}

/** Customer side: the promised delivery date has passed and the parcel is not there yet. */
export function isLateForCustomer(o: Order, now: Date): boolean {
  const open = ['Pending_Confirmation', 'Pending_Review', 'In_Production', 'Ready_for_Pickup', 'In_Transit'].includes(o.status);
  return open && now.getTime() > endOfDay(o.latestEDD);
}
