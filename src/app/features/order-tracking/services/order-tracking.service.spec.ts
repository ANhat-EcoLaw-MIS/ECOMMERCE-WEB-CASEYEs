import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import { Actor } from '../domain/order-mutations';
import { Order } from '../models/order-tracking.model';
import { Clock } from './clock';
import { DemoOrderFactory, DemoOrderInput } from './demo-order-factory';
import { DemoSettings } from './demo-settings';
import { OrderTrackingService } from './order-tracking.service';
import { ScheduledJobs } from './scheduled-jobs';

/** End-to-end scenarios of prompt §8, run against the real service + localStorage mock. */
describe('OrderTrackingService scenarios', () => {
  const HOUR = 3_600_000;
  const OPERATOR: Actor = { type: 'Operator', id: 'op' };
  const ADMIN: Actor = { type: 'Admin', id: 'ad' };
  const CSKH: Actor = { type: 'CustomerService', id: 'cs' };

  let service: OrderTrackingService;
  let jobs: ScheduledJobs;
  let clock: Clock;
  let factory: DemoOrderFactory;

  const create = (patch: Partial<DemoOrderInput>): Order => {
    const r = factory.create({ template: 'custom_plain', paymentMethod: 'QR_Transfer', zone: 'Z1', tier: 'Standard', minutesAgo: 0, ...patch });
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };
  const get = (id: string) => service.orders().find((o) => o.id === id)!;
  const at = (d: Date) => clock.advance(d.getTime() - clock.now().getTime());
  const later = (hours: number) => clock.advance(hours * HOUR);
  const ok = <T>(r: { error: unknown; data: T | null }) => {
    expect(r.error).toBeNull();
    return r.data as T;
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseAuthService, useValue: { user: signal(null), isAuthenticated: signal(false) } }],
    });
    service = TestBed.inject(OrderTrackingService);
    jobs = TestBed.inject(ScheduledJobs);
    clock = TestBed.inject(Clock);
    factory = TestBed.inject(DemoOrderFactory);
    TestBed.inject(DemoSettings).patch({ enabled: true });
    at(new Date(2026, 10, 4, 10, 0)); // Wednesday 04/11/2026 10:00
  });

  it('rejects COD for orders with Custom items (Payment BR-P-05)', () => {
    expect(factory.create({ template: 'mixed', paymentMethod: 'COD', zone: 'Z1', tier: 'Standard', minutesAgo: 0 }).error?.message)
      .toContain('bắt buộc thanh toán trước');
  });

  it('happy path: moderation -> approve -> pack -> deliver -> auto-complete after 72h', () => {
    const o = create({ template: 'custom_upload' });
    expect(o.requiresModeration).toBe(true);
    expect(o.earliestEDD).toBe('2026-11-07');

    jobs.run('job0');
    expect(get(o.id).status).toBe('Pending_Confirmation'); // still inside the 30-minute window
    later(0.6);
    jobs.run('job0');
    jobs.run('job0'); // idempotent
    expect(get(o.id).status).toBe('Pending_Review');

    ok(service.moderateDesign(o.id, 'Approved', {}, OPERATOR));
    expect(service.moderateDesign(o.id, 'Approved', {}, OPERATOR).error?.message).toContain('xử lý bởi người khác');
    ok(service.markPacked(o.id, OPERATOR));
    const transit = ok(service.applyWebhook(o.id, 'In_Transit'));
    expect(service.applyWebhook(o.id, 'In_Transit', { eventId: transit.eventId }).data?.result).toBe('Duplicate');
    ok(service.applyWebhook(o.id, 'Delivered'));
    expect(get(o.id).status).toBe('Delivered');

    later(71);
    jobs.run('job1');
    expect(get(o.id).status).toBe('Delivered');
    later(2);
    jobs.run('job1');
    expect(get(o.id).status).toBe('Completed');
    expect(get(o.id).reviewInvitePending).toBe(true);
    expect(get(o.id).logs.map((l) => l.to)).toEqual([
      'Pending_Confirmation', 'Pending_Review', 'In_Production', 'Ready_for_Pickup', 'In_Transit', 'Delivered', 'Completed',
    ]);
  });

  it('rejects webhooks that jump the sequence (EX-02) and logs them', () => {
    const o = create({});
    const r = ok(service.applyWebhook(o.id, 'Delivered'));
    expect(r.result).toBe('Rejected');
    expect(r.message).toBe('Trạng thái hiện tại không thể tiếp nhận sự kiện giao thành công');
    expect(service.db().webhookEvents.at(-1)?.result).toBe('Rejected');
  });

  it('cancel window: allowed within 30 minutes, refused after (EX-01)', () => {
    const a = create({});
    later(0.4);
    ok(service.cancelOrder(a.id, { reason: 'Changed_Mind', refund: { method: 'Voucher' } }, {}));
    expect(get(a.id).refunds[0]).toMatchObject({ situation: 'S1', status: 'Pending_Approval', refundMethod: 'Voucher', amount: 284_000 });

    const b = create({});
    later(0.6);
    expect(service.cancelOrder(b.id, { reason: 'Changed_Mind' }, {}).error?.message).toContain('không thể hủy');
  });

  it('stale pop-up is refused when the order changed meanwhile (EX-01)', () => {
    const o = create({ template: 'custom_upload' });
    const openedAt = o.updatedAt;
    later(0.6);
    jobs.run('job0'); // -> Pending_Review, updatedAt changes
    later(0.1);
    expect(service.cancelOrder(o.id, { reason: 'Other' }, { expectedUpdatedAt: openedAt }).error).not.toBeNull();
  });

  it('idempotency key makes a double click a no-op (EX-06)', () => {
    const o = create({});
    ok(service.cancelOrder(o.id, { reason: 'Other', refund: { method: 'Later' } }, { opKey: 'k1' }));
    ok(service.cancelOrder(o.id, { reason: 'Other', refund: { method: 'Later' } }, { opKey: 'k1' }));
    expect(get(o.id).refunds.length).toBe(1);
  });

  it('design rejected 3 times -> only cancel & refund 100% (S2)', () => {
    const o = create({ template: 'custom_upload' });
    later(0.6);
    jobs.run('job0');
    for (let round = 1; round <= 3; round++) {
      ok(service.moderateDesign(o.id, 'Rejected', { violationGroup: 'Khác', reason: 'Ảnh mờ' }, OPERATOR));
      if (round < 3) ok(service.resubmitDesign(o.id, {}));
    }
    expect(service.resubmitDesign(o.id, {}).error).not.toBeNull();
    ok(service.cancelRejectedOrder(o.id, { method: 'Voucher' }, {}));
    expect(get(o.id).cancellation?.customerFault).toBe(true);
    expect(get(o.id).refunds[0].situation).toBe('S2');
  });

  it('Job 3 cancels Action_Required after 7 days and reminds on day 3', () => {
    const o = create({ template: 'custom_upload' });
    later(0.6);
    jobs.run('job0');
    ok(service.moderateDesign(o.id, 'Rejected', { violationGroup: 'Khác', reason: 'x' }, OPERATOR));
    later(24 * 3);
    jobs.run('job3');
    expect(get(o.id).designFixReminderAt).toBeDefined();
    later(24 * 4);
    jobs.run('job3');
    expect(get(o.id).status).toBe('Cancelled');
    expect(get(o.id).refunds[0]).toMatchObject({ situation: 'S2', status: 'Pending_Approval' });
  });

  it('batch only at 16:00 on working days, then QC reprint adds 1 working day', () => {
    const o = create({ template: 'custom_plain' });
    expect(service.closeBatch(OPERATOR).error?.message).toContain('Chưa tới giờ chốt mẻ');
    at(new Date(2026, 10, 4, 16, 0));
    expect(ok(service.closeBatch(OPERATOR)).count).toBe(1);
    expect(service.closeBatch(OPERATOR).error?.message).toContain('Mẻ rỗng');
    ok(service.markQcReprint(o.id, OPERATOR));
    // original EDD 07/11–11/11 (Custom, Z1, Standard) -> +1 working day on both bounds
    expect(get(o.id)).toMatchObject({ status: 'In_Production', earliestEDD: '2026-11-09', latestEDD: '2026-11-12' });
  });

  it('complaint freezes the 72h timer once and resumes the remaining time (EX-04)', () => {
    const o = create({ template: 'stock' });
    later(0.6);
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivered'));
    const autoAt = new Date(get(o.id).autoCompleteAt!).getTime();
    later(10);
    ok(service.reportIssue(o.id, { issueType: 'Wrong_Design_Or_Model', description: 'Sai mẫu ốp', evidenceNames: [] }, {}));
    expect(get(o.id).status).toBe('Return_Requested');
    later(20);
    jobs.run('job1');
    expect(get(o.id).status).toBe('Return_Requested');
    ok(service.applyComplaintResult(o.id, 'Rejected', 'Đúng mẫu đã đặt', CSKH));
    expect(get(o.id).status).toBe('Delivered');
    // real time keeps ticking between calls, so allow a 1 s tolerance
    expect(Math.abs(new Date(get(o.id).autoCompleteAt!).getTime() - autoAt - 20 * HOUR)).toBeLessThan(1000);
    expect(get(o.id).autoCompleteFrozenOnce).toBe(true);
  });

  it('evidence is mandatory for print defects; Epic 6 down keeps the order unchanged', () => {
    const o = create({ template: 'stock' });
    later(0.6);
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivered'));
    expect(service.reportIssue(o.id, { issueType: 'Print_Defect', description: 'Lệch màu rõ', evidenceNames: [] }, {}).error?.message).toContain('bằng chứng');
    TestBed.inject(DemoSettings).setDown('CustomerService', true);
    expect(service.reportIssue(o.id, { issueType: 'Print_Defect', description: 'Lệch màu rõ', evidenceNames: ['a.jpg'] }, {}).error?.code).toBe('EPIC6');
    expect(get(o.id).status).toBe('Delivered');
  });

  it('late delivery issues a 10% voucher (cap 30k) plus the fast surcharge, once', () => {
    const o = create({ template: 'mixed', tier: 'Fast' }); // goods 388k -> freeship, fast pays 15k
    at(new Date(2026, 10, 4, 16, 0));
    ok(service.closeBatch(OPERATOR));
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    at(new Date(2026, 10, 12, 9, 0)); // latestEDD is 10/11
    ok(service.applyWebhook(o.id, 'Delivered'));
    const vouchers = get(o.id).vouchers;
    expect(vouchers.map((v) => [v.kind, v.value])).toEqual([['Late_Delivery', 30_000], ['Fast_Surcharge', 15_000]]);
  });

  it('custom + customer fault: paid redelivery, second failure closes without refund and destroys goods (3c)', () => {
    const o = create({ template: 'custom_plain', zone: 'Z2' });
    at(new Date(2026, 10, 4, 16, 0));
    ok(service.closeBatch(OPERATOR));
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivery_Failed', { failureCause: 'Customer_Unreachable' }));
    ok(service.applyWebhook(o.id, 'Warehouse_Received'));
    expect(get(o.id).warehouseHold).toBeDefined();
    expect(service.cancelAfterFailure(o.id, undefined, {}).error).not.toBeNull(); // 3c: no cancel & refund
    ok(service.requestRedelivery(o.id, {}));
    expect(get(o.id)).toMatchObject({ status: 'Ready_for_Pickup', redeliveryUsed: true, redeliveryFeePaid: 35_000 });
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivery_Failed', { failureCause: 'Customer_Refused' }));
    ok(service.applyWebhook(o.id, 'Warehouse_Received'));
    expect(get(o.id).status).toBe('Cancelled');
    expect(get(o.id).refunds).toEqual([]);
    expect(get(o.id).destruction).toBeDefined();
  });

  it('carrier fault: cancel & refund 100% even for Custom (3a)', () => {
    const o = create({ template: 'custom_plain' });
    at(new Date(2026, 10, 4, 16, 0));
    ok(service.closeBatch(OPERATOR));
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivery_Failed', { failureCause: 'Lost_In_Transit' }));
    ok(service.applyWebhook(o.id, 'Warehouse_Received'));
    ok(service.cancelAfterFailure(o.id, { method: 'Voucher' }, {}));
    expect(get(o.id).refunds[0]).toMatchObject({ situation: 'S3a', amount: 284_000 });
  });

  it('stock COD + customer fault is cancelled when goods return (no hold)', () => {
    const o = create({ template: 'stock', paymentMethod: 'COD' });
    later(0.6);
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivery_Failed', { failureCause: 'Customer_Refused' }));
    ok(service.applyWebhook(o.id, 'Warehouse_Received'));
    expect(get(o.id).status).toBe('Cancelled');
    expect(get(o.id).warehouseHold).toBeUndefined();
  });

  it('dispute freezes the 14-day hold and adds the frozen time back (EX-03); Job 2 then closes it', () => {
    const o = create({ template: 'stock' });
    later(0.6);
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivery_Failed', { failureCause: 'Customer_Unreachable' }));
    ok(service.applyWebhook(o.id, 'Warehouse_Received'));
    const expires = new Date(get(o.id).warehouseHold!.expiresAt).getTime();
    ok(service.reportIssue(o.id, { issueType: 'Dispute_Failure_Cause', description: 'Tôi ở nhà cả ngày', evidenceNames: [] }, {}));
    later(48);
    ok(service.resolveDispute(o.id, true, '', CSKH));
    expect(Math.abs(new Date(get(o.id).warehouseHold!.expiresAt).getTime() - expires - 48 * HOUR)).toBeLessThan(1000);
    later(24 * 14);
    jobs.run('job2');
    expect(get(o.id).status).toBe('Cancelled');
    expect(get(o.id).refunds[0]).toMatchObject({ situation: 'S3a' }); // customer was right -> carrier fault
  });

  it('only Admin moves money; failed transfer goes Retry -> Manual; Job 4 issues a voucher after 7 days', () => {
    const a = create({});
    ok(service.cancelOrder(a.id, { reason: 'Other', refund: { method: 'Bank', bank: 'VCB', accountNo: '0123456789', holder: 'NGUYEN NHAT ANH' } }, {}));
    const r = get(a.id).refunds[0];
    expect(service.approveRefund(a.id, r.id, OPERATOR).error?.message).toContain('Chỉ Admin');
    ok(service.approveRefund(a.id, r.id, ADMIN));
    ok(service.markTransferFailed(a.id, r.id, ADMIN));
    expect(get(a.id).refunds[0].status).toBe('Refund_Pending_Retry');
    ok(service.retryTransfer(a.id, r.id, ADMIN));
    ok(service.markTransferFailed(a.id, r.id, ADMIN));
    expect(get(a.id).refunds[0].status).toBe('Refund_Pending_Manual');
    ok(service.completeRefund(a.id, r.id, 'FT123', ADMIN));
    expect(get(a.id).refunds[0]).toMatchObject({ status: 'Refunded', bankRef: 'FT123' });

    const b = create({});
    ok(service.cancelOrder(b.id, { reason: 'Other', refund: { method: 'Later' } }, {}));
    later(24 * 7 + 1);
    jobs.run('job4');
    expect(get(b.id).refunds[0]).toMatchObject({ status: 'Refunded', refundMethod: 'Voucher' });
    expect(get(b.id).vouchers[0].kind).toBe('Store_Credit');
  });

  it('listOpenOrders follows Table 3.1', () => {
    const a = create({});
    expect(service.listOpenOrders(a.customerId).canDeleteAccount).toBe(false);
    ok(service.cancelOrder(a.id, { reason: 'Other', refund: { method: 'Later' } }, {}));
    expect(service.listOpenOrders(a.customerId).canDeleteAccount).toBe(false); // refund pending
    later(24 * 8);
    jobs.run('job4');
    expect(service.listOpenOrders(a.customerId).canDeleteAccount).toBe(true);
  });

  it('events to a down module wait in the retry queue and are delivered later (EX-12)', () => {
    const settings = TestBed.inject(DemoSettings);
    settings.setDown('Shopping', true);
    const o = create({});
    ok(service.cancelOrder(o.id, { reason: 'Other', refund: { method: 'Later' } }, {}));
    expect(get(o.id).status).toBe('Cancelled');
    expect(service.db().retryQueue.length).toBe(2); // ReleaseStock + OrderCancelled
    settings.setDown('Shopping', false);
    jobs.run('retry');
    expect(service.db().retryQueue.length).toBe(0);
  });
});
