/**
 * Calendar helpers working in the browser's local time (the shop and its customers are in
 * Vietnam). Pure functions: every caller passes the reference time explicitly.
 */

const DAY_MS = 86_400_000;

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addCalendarDays(date: Date, days: number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Mon–Fri and not a configured holiday. */
export function isWorkingDay(date: Date, holidays: readonly string[] = []): boolean {
  const dow = date.getDay();
  return dow >= 1 && dow <= 5 && !holidays.includes(toDateKey(date));
}

/** Mon–Sat (carriers do not count Sundays). */
export function isShippingDay(date: Date, holidays: readonly string[] = []): boolean {
  return date.getDay() !== 0 && !holidays.includes(toDateKey(date));
}

export function nextWorkingDay(date: Date, holidays: readonly string[] = []): Date {
  let d = addCalendarDays(date, 1);
  while (!isWorkingDay(d, holidays)) d = addCalendarDays(d, 1);
  return d;
}

/** Moves forward `count` days that satisfy `accept`; count 0 returns the same day. */
export function addCountedDays(
  from: Date,
  count: number,
  accept: (d: Date) => boolean,
): Date {
  let d = startOfDay(from);
  let left = count;
  while (left > 0) {
    d = addCalendarDays(d, 1);
    if (accept(d)) left--;
  }
  return d;
}

export function addWorkingDays(from: Date, count: number, holidays: readonly string[] = []): Date {
  return addCountedDays(from, count, (d) => isWorkingDay(d, holidays));
}

export function addShippingDays(from: Date, count: number, holidays: readonly string[] = []): Date {
  return addCountedDays(from, count, (d) => isShippingDay(d, holidays));
}

export function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

export function addDaysIso(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();
}

export function diffMs(laterIso: string, earlierIso: string): number {
  return new Date(laterIso).getTime() - new Date(earlierIso).getTime();
}

/** dd/MM (Vietnamese short date). */
export function formatShortDate(key: string): string {
  const d = fromDateKey(key);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** "Thứ Ba 10/11" for EDD ranges (v8 UI rule). */
export function formatDayLabel(key: string): string {
  return `${WEEKDAYS[fromDateKey(key).getDay()]} ${formatShortDate(key)}`;
}

/** dd/MM/yyyy from an ISO instant. */
export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
