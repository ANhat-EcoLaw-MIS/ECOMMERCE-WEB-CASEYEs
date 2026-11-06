import { buildInsights } from '../demo-console/insights';
import { Order } from '../models/order-tracking.model';
import { TrackEvent } from '../services/tracker';
import { highlight, needsAttention, primaryAction } from './actions';

const base = {
  orderCode: 'CC-1',
  hasCustomItem: true,
  cancelRequests: [],
} as unknown as Order;
const o = (patch: Partial<Order>): Order => ({ ...base, ...patch }) as Order;

describe('primaryAction (P1-2: one primary button per state)', () => {
  it('maps each state to its next step', () => {
    expect(primaryAction(o({ status: 'Action_Required' })).label).toBe('Chỉnh sửa thiết kế');
    expect(primaryAction(o({ status: 'Delivery_Failed' })).queryParams).toEqual({ action: 'redeliver' });
    expect(primaryAction(o({ status: 'Delivered' })).label).toBe('Đã nhận được hàng');
    expect(primaryAction(o({ status: 'Completed' }))).toMatchObject({ label: 'Mua lại', reorder: 'completed' });
    expect(primaryAction(o({ status: 'Cancelled' })).label).toBe('Đặt lại thiết kế này');
    expect(primaryAction(o({ status: 'Cancelled', hasCustomItem: false })).label).toBe('Mua lại');
    expect(primaryAction(o({ status: 'In_Production' })).label).toBe('Xem đơn hàng');
  });
  it('needsAttention follows the "Cần xử lý" tab', () => {
    expect(needsAttention(o({ status: 'Action_Required' }))).toBe(true);
    expect(needsAttention(o({ status: 'In_Transit' }))).toBe(false);
  });
});

describe('highlight (P1-3)', () => {
  it('matches without accents or case and keeps the original text', () => {
    expect(highlight('Ốp lưng Good Vibes', 'op')).toEqual([
      { text: 'Ốp', hit: true },
      { text: ' lưng Good Vibes', hit: false },
    ]);
    expect(highlight('CC-261106-0001', '0001').at(-1)).toEqual({ text: '0001', hit: true });
  });
});

describe('buildInsights (P2)', () => {
  it('counts cancel kinds, refund methods and reorder clicks', () => {
    const ev = (name: TrackEvent['name'], props: TrackEvent['props'] = {}): TrackEvent => ({ name, ts: '', props });
    const r = buildInsights(
      [ev('cancel_submitted', { kind: 'cod' }), ev('cancel_submitted', { kind: 'request' }), ev('refund_method_chosen', { method: 'Voucher' }), ev('reorder_clicked')],
      [o({ status: 'Cancelled', cancellation: { reason: 'Changed_Mind', cause: 'Customer_In_Window', customerFault: false, createdAt: '' } })],
    );
    expect(r.summary[0].value).toBe('1 / 1');
    expect(r.summary[1].value).toBe('1 / 0 / 0');
    expect(r.reasonRows[0]).toMatchObject({ label: 'Đổi ý', value: '1' });
  });
});
