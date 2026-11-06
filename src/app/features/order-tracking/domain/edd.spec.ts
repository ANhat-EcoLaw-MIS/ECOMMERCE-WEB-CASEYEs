import { batchDateFor, computeEdd, shiftEdd, workingDaysBetween } from './edd';

// "Today" in the BRD examples: Wednesday 04/11/2026 (local time).
const wed = (h: number, m = 0) => new Date(2026, 10, 4, h, m);

describe('computeEdd (FR-OT-04 v8 examples)', () => {
  it('custom, Standard (transit 3–5), confirmed Wed 10:00 -> 10/11 to 14/11', () => {
    const r = computeEdd({ confirmedAt: wed(10), hasCustomItem: true, tier: 'Standard', transitDays: { min: 3, max: 5 } });
    expect(r.batchDate).toBe('2026-11-04');
    expect(r.earliest).toBe('2026-11-10');
    expect(r.latest).toBe('2026-11-14');
  });

  it('stock, Standard (transit 1–2), confirmed Wed 17:30 -> 07/11 to 11/11', () => {
    const r = computeEdd({ confirmedAt: wed(17, 30), hasCustomItem: false, tier: 'Standard', transitDays: { min: 1, max: 2 } });
    expect(r.batchDate).toBe('2026-11-05');
    expect(r.earliest).toBe('2026-11-07');
    expect(r.latest).toBe('2026-11-11');
  });

  it('stock, Hỏa tốc, confirmed Wed 10:00 -> same day 04/11', () => {
    const r = computeEdd({ confirmedAt: wed(10), hasCustomItem: false, tier: 'Express', transitDays: { min: 1, max: 2 } });
    expect(r.earliest).toBe('2026-11-04');
    expect(r.latest).toBe('2026-11-04');
    expect(r.sameDay).toBe(true);
  });

  it('stock, Hỏa tốc, confirmed Wed 15:30 (after 14:00) -> 05/11', () => {
    const r = computeEdd({ confirmedAt: wed(15, 30), hasCustomItem: false, tier: 'Express', transitDays: { min: 1, max: 2 } });
    expect(r.earliest).toBe('2026-11-05');
    expect(r.latest).toBe('2026-11-05');
    expect(r.sameDay).toBe(false);
  });

  it('shows processing and transit separately; transit days come from Thanh toán', () => {
    const r = computeEdd({ confirmedAt: wed(10), hasCustomItem: true, tier: 'Standard', transitDays: { min: 3, max: 5 } });
    expect(r.processingFrom).toBe('2026-11-06');
    expect(r.processingTo).toBe('2026-11-09');
    expect(r.handling).toEqual({ min: 2, max: 3 });
    expect(r.shipping).toEqual({ min: 3, max: 5 });
  });

  it('Hỏa tốc confirmed on Friday after 14:00 ships Monday', () => {
    const r = computeEdd({ confirmedAt: new Date(2026, 10, 6, 15), hasCustomItem: false, tier: 'Express', transitDays: { min: 1, max: 1 } });
    expect(r.earliest).toBe('2026-11-09');
  });
});

describe('batchDateFor', () => {
  it('joins today when confirmed before 16:00', () => {
    expect(batchDateFor(wed(15, 59)).getDate()).toBe(4);
  });
  it('moves to the next working day after 16:00', () => {
    expect(batchDateFor(wed(16, 1)).getDate()).toBe(5);
  });
  it('orders confirmed on Saturday join Monday', () => {
    expect(batchDateFor(new Date(2026, 10, 7, 9)).getDate()).toBe(9);
  });
  it('Friday after the cut-off joins Monday', () => {
    expect(batchDateFor(new Date(2026, 10, 6, 17)).getDate()).toBe(9);
  });
});

describe('shiftEdd / workingDaysBetween', () => {
  it('adds one working day to both bounds, skipping the weekend', () => {
    expect(shiftEdd('2026-11-06', '2026-11-13', 1)).toEqual({ earliest: '2026-11-09', latest: '2026-11-16' });
  });
  it('counts working days crossed (Fri -> Mon = 1)', () => {
    expect(workingDaysBetween(new Date(2026, 10, 6, 10).toISOString(), new Date(2026, 10, 9, 9).toISOString())).toBe(1);
    expect(workingDaysBetween(wed(9).toISOString(), wed(15).toISOString())).toBe(0);
  });
});
