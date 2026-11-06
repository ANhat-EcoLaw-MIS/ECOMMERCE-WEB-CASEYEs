import { DayRange, DELIVERY_CONFIG } from '../config/delivery-config';
import { ShippingTier } from '../models/order-tracking.model';
import {
  addCalendarDays,
  addShippingDays,
  addWorkingDays,
  fromDateKey,
  isWorkingDay,
  nextWorkingDay,
  startOfDay,
  toDateKey,
} from './calendar';

export interface EddInput {
  /**
   * Time the order is (expected to be) confirmed: placement for prepaid orders, end of the
   * hidden change-of-mind window for COD (FR-OT-04).
   */
  readonly confirmedAt: Date;
  readonly hasCustomItem: boolean;
  readonly tier: ShippingTier;
  /** Transit days from Thanh toán (Mon–Sat). Not used for Hỏa tốc. */
  readonly transitDays: DayRange;
  /** Override the processing range (re-delivery, reprint). */
  readonly handling?: DayRange;
}

export interface EddResult {
  readonly batchDate: string;
  readonly processingFrom: string;
  readonly processingTo: string;
  readonly earliest: string;
  readonly latest: string;
  readonly handling: DayRange;
  readonly shipping: DayRange;
  /** Hỏa tốc only: true when it ships the same day it was confirmed. */
  readonly sameDay?: boolean;
}

function cutoffOf(day: Date, cut: { hour: number; minute: number }): Date {
  const d = new Date(day);
  d.setHours(cut.hour, cut.minute, 0, 0);
  return d;
}

/** First working day on or after `day`. */
function workingDayOnOrAfter(day: Date): Date {
  let d = startOfDay(day);
  while (!isWorkingDay(d, DELIVERY_CONFIG.holidays)) d = addCalendarDays(d, 1);
  return d;
}

/**
 * Batch day: the working day of confirmation when it happens before the cut-off,
 * otherwise the next working day (assumption A-01 for orders confirmed on a weekend).
 */
export function dayForCutoff(confirmedAt: Date, cut: { hour: number; minute: number }): Date {
  const day = startOfDay(confirmedAt);
  if (!isWorkingDay(day, DELIVERY_CONFIG.holidays)) return workingDayOnOrAfter(day);
  return confirmedAt.getTime() <= cutoffOf(day, cut).getTime() ? day : nextWorkingDay(day, DELIVERY_CONFIG.holidays);
}

export function batchDateFor(confirmedAt: Date): Date {
  return dayForCutoff(confirmedAt, DELIVERY_CONFIG.batchCutoff);
}

/**
 * EDD (FR-OT-04, Table 3.5):
 * - Standard: batch day + processing (Mon–Fri) + transit from Thanh toán (Mon–Sat).
 * - Hỏa tốc (stock only): same working day if confirmed before 14:00, else next working day.
 */
export function computeEdd(input: EddInput): EddResult {
  const cfg = DELIVERY_CONFIG;
  if (input.tier === 'Express') {
    const day = dayForCutoff(input.confirmedAt, cfg.expressCutoff);
    const key = toDateKey(day);
    return {
      batchDate: key,
      processingFrom: key,
      processingTo: key,
      earliest: key,
      latest: key,
      handling: { min: 0, max: 0 },
      shipping: { min: 0, max: 0 },
      sameDay: key === toDateKey(input.confirmedAt),
    };
  }

  const handling = input.handling ?? (input.hasCustomItem ? cfg.handlingDays.custom : cfg.handlingDays.stock);
  const batch = batchDateFor(input.confirmedAt);
  const processingFrom = addWorkingDays(batch, handling.min, cfg.holidays);
  const processingTo = addWorkingDays(batch, handling.max, cfg.holidays);
  return {
    batchDate: toDateKey(batch),
    processingFrom: toDateKey(processingFrom),
    processingTo: toDateKey(processingTo),
    earliest: toDateKey(addShippingDays(processingFrom, input.transitDays.min, cfg.holidays)),
    latest: toDateKey(addShippingDays(processingTo, input.transitDays.max, cfg.holidays)),
    handling,
    shipping: input.transitDays,
  };
}

/** Shifts both EDD bounds by working days (QC reprint, rejected cancel request). */
export function shiftEdd(earliest: string, latest: string, workingDays: number): { earliest: string; latest: string } {
  if (workingDays <= 0) return { earliest, latest };
  const h = DELIVERY_CONFIG.holidays;
  return {
    earliest: toDateKey(addWorkingDays(fromDateKey(earliest), workingDays, h)),
    latest: toDateKey(addWorkingDays(fromDateKey(latest), workingDays, h)),
  };
}

/** Working days between two instants (calendar days crossed that are working days). */
export function workingDaysBetween(fromIso: string, toIso: string): number {
  let d = startOfDay(new Date(fromIso));
  const end = startOfDay(new Date(toIso));
  let n = 0;
  while (d.getTime() < end.getTime()) {
    d = addCalendarDays(d, 1);
    if (isWorkingDay(d, DELIVERY_CONFIG.holidays)) n++;
  }
  return n;
}
