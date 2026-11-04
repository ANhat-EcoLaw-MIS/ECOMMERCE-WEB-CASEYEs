import { batchDateFor, computeEdd, shiftEdd } from './edd';
import { quoteShipping } from './shipping-fee';

// "Today" in the BRD examples: Wednesday 04/11/2026 (local time).
const wed = (h: number, m = 0) => new Date(2026, 10, 4, h, m);

describe('computeEdd (FR-OT-04 examples)', () => {
  it('Custom, Z3, Standard, placed Wed 10:00 -> 10/11 to 14/11', () => {
    const r = computeEdd({ placedAt: wed(10), hasCustomItem: true, zone: 'Z3', tier: 'Standard' });
    expect(r.batchDate).toBe('2026-11-04');
    expect(r.earliest).toBe('2026-11-10');
    expect(r.latest).toBe('2026-11-14');
  });

  it('Stock only, Z1, Standard, placed Wed 17:30 -> 07/11 to 11/11', () => {
    const r = computeEdd({ placedAt: wed(17, 30), hasCustomItem: false, zone: 'Z1', tier: 'Standard' });
    expect(r.batchDate).toBe('2026-11-05');
    expect(r.earliest).toBe('2026-11-07');
    expect(r.latest).toBe('2026-11-11');
  });

  it('Custom, Z1, Giao nhanh, placed Wed 10:00 -> 07/11 to 10/11', () => {
    const r = computeEdd({ placedAt: wed(10), hasCustomItem: true, zone: 'Z1', tier: 'Fast' });
    expect(r.earliest).toBe('2026-11-07');
    expect(r.latest).toBe('2026-11-10');
  });

  it('shows processing and shipping separately', () => {
    const r = computeEdd({ placedAt: wed(10), hasCustomItem: true, zone: 'Z3', tier: 'Standard' });
    expect(r.processingFrom).toBe('2026-11-06');
    expect(r.processingTo).toBe('2026-11-09');
    expect(r.handling).toEqual({ min: 2, max: 3 });
    expect(r.shipping).toEqual({ min: 3, max: 5 });
  });
});

describe('batchDateFor (assumption A-01)', () => {
  it('joins today when the cancel window closes before 16:00', () => {
    expect(batchDateFor(wed(15, 30)).getDate()).toBe(4);
  });
  it('moves to the next working day when the window closes after 16:00', () => {
    expect(batchDateFor(wed(15, 45)).getDate()).toBe(5);
  });
  it('orders on Saturday join Monday', () => {
    const sat = new Date(2026, 10, 7, 9);
    expect(batchDateFor(sat).getDate()).toBe(9);
  });
  it('Friday after the cut-off joins Monday', () => {
    const fri = new Date(2026, 10, 6, 17);
    expect(batchDateFor(fri).getDate()).toBe(9);
  });
});

describe('shiftEdd (QC reprint)', () => {
  it('adds one working day to both bounds, skipping the weekend', () => {
    expect(shiftEdd('2026-11-06', '2026-11-13', 1)).toEqual({
      earliest: '2026-11-09',
      latest: '2026-11-16',
    });
  });
});

describe('quoteShipping (Table 3.5)', () => {
  it('charges the zone rate below the freeship threshold', () => {
    expect(quoteShipping('Z2', 'Standard', 200_000).fee).toBe(35_000);
  });
  it('Standard is free from 349.000 đ', () => {
    expect(quoteShipping('Z3', 'Standard', 349_000).fee).toBe(0);
  });
  it('Giao nhanh pays only the difference when freeship applies', () => {
    const q = quoteShipping('Z1', 'Fast', 400_000);
    expect(q.fee).toBe(15_000);
    expect(q.fastSurcharge).toBe(15_000);
  });
  it('Giao nhanh pays the full fast rate below the threshold', () => {
    expect(quoteShipping('Z3', 'Fast', 100_000).fee).toBe(70_000);
  });
});
