import { DayRange, DELIVERY_CONFIG } from '../config/delivery-config';
import { ShippingTier, Zone } from '../models/order-tracking.model';
import {
  addCalendarDays,
  addShippingDays,
  addWorkingDays,
  isWorkingDay,
  nextWorkingDay,
  startOfDay,
  toDateKey,
} from './calendar';

export interface EddInput {
  /** Time the order was placed (or re-queued). */
  readonly placedAt: Date;
  readonly hasCustomItem: boolean;
  readonly zone: Zone;
  readonly tier: ShippingTier;
  /** Override the processing range (re-delivery, reprint). */
  readonly handling?: DayRange;
  /** Whether the hidden cancel window delays batch eligibility (true for new orders). */
  readonly applyCancelWindow?: boolean;
}

export interface EddResult {
  readonly batchDate: string;
  readonly processingFrom: string;
  readonly processingTo: string;
  readonly earliest: string;
  readonly latest: string;
  readonly handling: DayRange;
  readonly shipping: DayRange;
}

/**
 * Batch day (FR-OT-04, assumption A-01): today when the order is eligible for the batch
 * before the 16:00 cut-off of a working day, otherwise the next working day.
 * A new order becomes eligible only after the 30-minute cancel window closes, so an order
 * placed at 15:45 joins tomorrow's batch.
 */
export function batchDateFor(placedAt: Date, applyCancelWindow = true): Date {
  const cfg = DELIVERY_CONFIG;
  const eligibleAt = new Date(
    placedAt.getTime() + (applyCancelWindow ? cfg.cancelWindowMinutes * 60_000 : 0),
  );
  const day = startOfDay(placedAt);
  const cutoff = new Date(day);
  cutoff.setHours(cfg.batchCutoff.hour, cfg.batchCutoff.minute, 0, 0);

  if (isWorkingDay(day, cfg.holidays) && eligibleAt.getTime() <= cutoff.getTime()) return day;
  if (!isWorkingDay(day, cfg.holidays)) {
    let d = day;
    while (!isWorkingDay(d, cfg.holidays)) d = addCalendarDays(d, 1);
    return d;
  }
  return nextWorkingDay(day, cfg.holidays);
}

/** EDD = batch day + processing (Mon–Fri) + shipping (Mon–Sat). */
export function computeEdd(input: EddInput): EddResult {
  const cfg = DELIVERY_CONFIG;
  const handling =
    input.handling ?? (input.hasCustomItem ? cfg.handlingDays.custom : cfg.handlingDays.stock);
  const shipping = cfg.zoneRates[input.zone][input.tier].days;
  const batch = batchDateFor(input.placedAt, input.applyCancelWindow ?? true);

  const processingFrom = addWorkingDays(batch, handling.min, cfg.holidays);
  const processingTo = addWorkingDays(batch, handling.max, cfg.holidays);
  const earliest = addShippingDays(processingFrom, shipping.min, cfg.holidays);
  const latest = addShippingDays(processingTo, shipping.max, cfg.holidays);

  return {
    batchDate: toDateKey(batch),
    processingFrom: toDateKey(processingFrom),
    processingTo: toDateKey(processingTo),
    earliest: toDateKey(earliest),
    latest: toDateKey(latest),
    handling,
    shipping,
  };
}

/** Shifts both EDD bounds by working days (QC reprint, FR-OT-EX-05). */
export function shiftEdd(
  earliest: string,
  latest: string,
  workingDays: number,
): { earliest: string; latest: string } {
  const cfg = DELIVERY_CONFIG;
  const [ey, em, ed] = earliest.split('-').map(Number);
  const [ly, lm, ld] = latest.split('-').map(Number);
  return {
    earliest: toDateKey(addWorkingDays(new Date(ey, em - 1, ed), workingDays, cfg.holidays)),
    latest: toDateKey(addWorkingDays(new Date(ly, lm - 1, ld), workingDays, cfg.holidays)),
  };
}
