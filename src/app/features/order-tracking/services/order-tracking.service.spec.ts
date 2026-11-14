import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import { Actor } from '../domain/order-mutations';
import { Order } from '../models/order-tracking.model';
import { Clock } from './clock';
import { DemoOrderFactory, DemoOrderInput } from './demo-order-factory';
import { DemoSettings } from './demo-settings';
import { MESSAGES, OrderTrackingService } from './order-tracking.service';
import { ScheduledJobs } from './scheduled-jobs';

/** End-to-end scenarios (v8 prompt §8 and UI review §8), run against the real service + localStorage mock. */
describe('OrderTrackingService scenarios (v8)', () => {
  const HOUR = 3_600_000;
  const OPERATOR: Actor = { type: 'Operator', id: 'op' };
  const ADMIN: Actor = { type: 'Admin', id: 'ad' };
  const CSKH: Actor = { type: 'CustomerService', id: 'cs' };

  let service: OrderTrackingService;
  let jobs: ScheduledJobs;
  let clock: Clock;
  let factory: DemoOrderFactory;

  const create = (patch: Partial<DemoOrderInput>): Order => {
    const r = factory.create({ template: 'custom_plain', paymentMethod: 'QR_Transfer', address: 'near', tier: 'Standard', minutesAgo: 0, ...patch });
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
  /** Custom order: approve the design, then run the 16:00 batch. */
  const toProduction = (o: Order) => {
    ok(service.moderateDesign(o.id, 'Approved', {}, OPERATOR));
    at(new Date(2026, 10, 4, 16, 0));
    ok(service.closeBatch(OPERATOR));
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

  it('rejects COD and Hỏa tốc for orders with custom designs', () => {
    expect(factory.create({ template: 'mixed', paymentMethod: 'COD', address: 'near', tier: 'Standard', minutesAgo: 0 }).error?.message)
      .toContain('bắt buộc thanh toán trước');
    expect(factory.create({ template: 'custom_plain', paymentMethod: 'QR_Transfer', address: 'near', tier: 'Express', minutesAgo: 0 }).error?.message)
      .toContain('Hỏa tốc');
  });

  it('P0-2: every custom order (even without an uploaded image) starts in design review', () => {
    const o = create({ template: 'custom_plain' });
    expect(o.status).toBe('Pending_Review');
    expect(o.hasUploadedImage).toBe(false);
    ok(service.moderateDesign(o.id, 'Approved', {}, OPERATOR));
    expect(get(o.id).status).toBe('Pending_Confirmation');
    expect(get(o.id).confirmedAt).toBeDefined();
  });

  it('happy path: review -> confirmed -> batch -> pack -> deliver -> auto-complete after 72h', () => {
    const o = create({ template: 'custom_upload' });
    expect(o.earliestEDD).toBe('2026-11-07');
    expect(service.closeBatch(OPERATOR).error).not.toBeNull(); // before 16:00
    toProduction(o);
    expect(service.moderateDesign(o.id, 'Approved', {}, OPERATOR).error?.message).toContain('xử lý bởi người khác');
    ok(service.markPacked(o.id, OPERATOR));
    const transit = ok(service.applyWebhook(o.id, 'In_Transit'));
    expect(service.applyWebhook(o.id, 'In_Transit', { eventId: transit.eventId }).data?.result).toBe('Duplicate');
    ok(service.applyWebhook(o.id, 'Delivered'));
    later(71);
    jobs.run('job1');
    expect(get(o.id).status).toBe('Delivered');
    later(2);
    jobs.run('job1');
    expect(get(o.id).status).toBe('Completed');
    expect(get(o.id).logs.map((l) => l.to)).toEqual([
      'Pending_Review', 'Pending_Confirmation', 'In_Production', 'Ready_for_Pickup', 'In_Transit', 'Delivered', 'Completed',
    ]);
  });

  it('rejects webhooks that jump the sequence (EX-02) and logs them', () => {
    const o = create({});
    const r = ok(service.applyWebhook(o.id, 'Delivered'));
    expect(r.result).toBe('Rejected');
    expect(service.db().webhookEvents.at(-1)?.result).toBe('Rejected');
  });

  it('P0-3 scenario 1: COD cancelled inside the change-of-mind window, no refund', () => {
    const o = create({ template: 'stock', paymentMethod: 'COD' });
    expect(o.confirmDueAt).toBeDefined();
    later(0.4);
    ok(service.cancelCodOrder(o.id, { reason: 'Changed_Mind' }, {}));
    expect(get(o.id).status).toBe('Cancelled');
    expect(get(o.id).refunds).toEqual([]);
    expect(get(o.id).cancellation?.customerFault).toBe(false);
  });

  it('P0-3 scenario 2: COD after the window is confirmed and cannot be cancelled', () => {
    const o = create({ template: 'stock', paymentMethod: 'COD' });
    later(0.6);
    expect(service.cancelCodOrder(o.id, { reason: 'Changed_Mind' }, {}).error?.message).toBe(MESSAGES.codConfirmed);
    expect(service.requestCancel(o.id, { reason: 'Other' }, {}).error).not.toBeNull(); // no alternative channel
  });

  it('P0-3: stale COD pop-up after the window is refused with the v8 message (EX-01)', () => {
    const o = create({ template: 'stock', paymentMethod: 'COD' });
    const openedAt = o.updatedAt;
    later(0.6);
    expect(service.cancelCodOrder(o.id, { reason: 'Other' }, { expectedUpdatedAt: openedAt }).error?.message).toBe(MESSAGES.codConfirmed);
  });

  it('P0-3: COD stock order can only be packed after the window', () => {
    const o = create({ template: 'stock', paymentMethod: 'COD' });
    expect(service.markPacked(o.id, OPERATOR).error?.message).toContain('thời gian đổi ý');
    later(0.6);
    ok(service.markPacked(o.id, OPERATOR));
  });

  it('P0-4 scenario 3: prepaid custom -> cancel request -> CSKH accepts -> refund by bank', () => {
    const o = create({ template: 'custom_upload' });
    expect(service.cancelCodOrder(o.id, { reason: 'Other' }, {}).error).not.toBeNull(); // no direct cancel
    ok(service.requestCancel(o.id, { reason: 'Changed_Mind', note: 'Đặt nhầm' }, {}));
    expect(service.requestCancel(o.id, { reason: 'Other' }, {}).error?.message).toBe(MESSAGES.requestExists);
    expect(service.moderateDesign(o.id, 'Approved', {}, OPERATOR).error?.message).toBe(MESSAGES.onHold);
    expect(service.decideCancelRequest(o.id, true, '', OPERATOR).error).not.toBeNull(); // CSKH only
    ok(service.decideCancelRequest(o.id, true, '', CSKH));
    const r = get(o.id).refunds[0];
    expect(get(o.id).status).toBe('Cancelled');
    expect(r).toMatchObject({ situation: 'S1', status: 'Pending_Approval', amount: 314_000 });
    expect(r.refundMethod).toBeUndefined(); // chosen in the refund progress block
    ok(service.submitRefundAccount(o.id, r.id, { method: 'Bank', bank: 'VCB', accountNo: '0123456789', holder: 'NGUYEN NHAT ANH' }));
    ok(service.approveRefund(o.id, r.id, ADMIN));
    ok(service.completeRefund(o.id, r.id, 'FT001', ADMIN));
    expect(get(o.id).refunds[0]).toMatchObject({ status: 'Refunded', bankRef: 'FT001' });
  });

  it('P0-4 scenario 4: CSKH rejects -> hold released, EDD shifted by the held working days', () => {
    const o = create({ template: 'custom_plain' });
    ok(service.requestCancel(o.id, { reason: 'Other' }, {}));
    at(new Date(2026, 10, 5, 9, 0)); // next working day, within SLA
    expect(service.decideCancelRequest(o.id, false, '', CSKH).error).not.toBeNull(); // reason required
    ok(service.decideCancelRequest(o.id, false, 'Đơn đã chuẩn bị phôi', CSKH));
    expect(get(o.id).status).toBe('Pending_Review');
    expect(get(o.id).earliestEDD).toBe('2026-11-09'); // 07/11 + 1 working day
    ok(service.moderateDesign(o.id, 'Approved', {}, OPERATOR)); // no longer held
  });

  it('P0-4: customer withdraws a pending request', () => {
    const o = create({ template: 'stock' });
    ok(service.requestCancel(o.id, { reason: 'Other' }, {}));
    ok(service.withdrawCancelRequest(o.id, {}));
    expect(get(o.id).cancelRequests[0].status).toBe('Withdrawn');
    ok(service.markPacked(o.id, OPERATOR));
  });

  it('P0-4: request refused once the order is in production (EX-15); batch skips held orders', () => {
    const a = create({ template: 'custom_plain' });
    const b = create({ template: 'custom_plain' });
    ok(service.moderateDesign(a.id, 'Approved', {}, OPERATOR));
    ok(service.moderateDesign(b.id, 'Approved', {}, OPERATOR));
    ok(service.requestCancel(b.id, { reason: 'Other' }, {}));
    at(new Date(2026, 10, 4, 16, 0));
    expect(ok(service.closeBatch(OPERATOR)).count).toBe(1);
    expect(get(b.id).status).toBe('Pending_Confirmation');
    expect(service.requestCancel(a.id, { reason: 'Other' }, {}).error?.message).toBe(MESSAGES.inProduction);
  });

  it('P0-5 scenario 5: design rejected -> customer cancels and gets 100% at once (S2)', () => {
    const o = create({ template: 'custom_upload' });
    ok(service.moderateDesign(o.id, 'Rejected', { violationGroup: 'Khác', reason: 'Ảnh mờ' }, OPERATOR));
    ok(service.cancelRejectedOrder(o.id, { method: 'Bank', bank: 'VCB', accountNo: '0123456789', holder: 'NGUYEN NHAT ANH' }, {}));
    expect(get(o.id).refunds[0]).toMatchObject({ situation: 'S2', refundMethod: 'Bank' });
  });

  it('design rejected 3 times -> only cancel & refund remains', () => {
    const o = create({ template: 'custom_upload' });
    for (let round = 1; round <= 3; round++) {
      ok(service.moderateDesign(o.id, 'Rejected', { violationGroup: 'Khác', reason: 'x' }, OPERATOR));
      if (round < 3) ok(service.resubmitDesign(o.id, {}));
    }
    expect(service.resubmitDesign(o.id, {}).error).not.toBeNull();
  });

  it('Job 3 cancels Action_Required after 7 days and reminds on day 3', () => {
    const o = create({ template: 'custom_upload' });
    ok(service.moderateDesign(o.id, 'Rejected', { violationGroup: 'Khác', reason: 'x' }, OPERATOR));
    later(24 * 3);
    jobs.run('job3');
    expect(get(o.id).designFixReminderAt).toBeDefined();
    later(24 * 4);
    jobs.run('job3');
    expect(get(o.id).status).toBe('Cancelled');
    expect(get(o.id).refunds[0]).toMatchObject({ situation: 'S2', status: 'Pending_Approval' });
  });

  it('P0-7/8 scenario 6: Hỏa tốc COD before and after 14:00', () => {
    const early = create({ template: 'stock', paymentMethod: 'COD', tier: 'Express' }); // confirmed 10:30
    expect([early.earliestEDD, early.latestEDD]).toEqual(['2026-11-04', '2026-11-04']);
    at(new Date(2026, 10, 4, 15, 0));
    const late = create({ template: 'stock', paymentMethod: 'COD', tier: 'Express' }); // confirmed 15:30
    expect([late.earliestEDD, late.latestEDD]).toEqual(['2026-11-05', '2026-11-05']);
  });

  it('QC reprint adds 1 working day to the EDD', () => {
    const o = create({ template: 'custom_plain' });
    toProduction(o);
    ok(service.markQcReprint(o.id, OPERATOR));
    expect(get(o.id)).toMatchObject({ status: 'In_Production', earliestEDD: '2026-11-09', latestEDD: '2026-11-12' });
  });

  it('scenario 8: delivered -> report issue -> 72h timer frozen and resumed (EX-04) -> review', () => {
    const o = create({ template: 'stock' });
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivered'));
    const autoAt = new Date(get(o.id).autoCompleteAt!).getTime();
    later(10);
    ok(service.reportIssue(o.id, { issueType: 'Wrong_Design_Or_Model', description: 'Sai mẫu ốp', evidenceNames: [] }, {}));
    later(20);
    jobs.run('job1');
    expect(get(o.id).status).toBe('Return_Requested');
    ok(service.applyComplaintResult(o.id, 'Rejected', 'Đúng mẫu đã đặt', CSKH));
    expect(Math.abs(new Date(get(o.id).autoCompleteAt!).getTime() - autoAt - 20 * HOUR)).toBeLessThan(1000);
    ok(service.confirmReceived(o.id, {}));
    ok(service.submitReview(o.id, { stars: 5, tags: ['Đúng màu'], comment: 'Đẹp' }));
    expect(get(o.id).review?.stars).toBe(5);
  });

  it('evidence is mandatory for print defects; CSKH down keeps the order unchanged', () => {
    const o = create({ template: 'stock' });
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivered'));
    expect(service.reportIssue(o.id, { issueType: 'Print_Defect', description: 'Lệch màu rõ', evidenceNames: [] }, {}).error?.message).toContain('bằng chứng');
    TestBed.inject(DemoSettings).setDown('CustomerService', true);
    expect(service.reportIssue(o.id, { issueType: 'Print_Defect', description: 'Lệch màu rõ', evidenceNames: ['a.jpg'] }, {}).error?.code).toBe('CSKH');
    expect(get(o.id).status).toBe('Delivered');
  });

  it('late delivery issues 10% (cap 30k) plus the Hỏa tốc surcharge, once', () => {
    const o = create({ template: 'stock', tier: 'Express' }); // goods 229k -> 22.900, surcharge 20k
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    at(new Date(2026, 10, 5, 9, 0)); // latestEDD 04/11
    ok(service.applyWebhook(o.id, 'Delivered'));
    expect(get(o.id).vouchers.map((v) => [v.kind, v.value])).toEqual([['Late_Delivery', 22_900], ['Express_Surcharge', 20_000]]);
  });

  it('scenario 7: custom + customer fault: paid redelivery, second failure closes without refund (3c)', () => {
    const o = create({ template: 'custom_plain' });
    toProduction(o);
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivery_Failed', { failureCause: 'Customer_Unreachable' }));
    ok(service.applyWebhook(o.id, 'Warehouse_Received'));
    expect(service.cancelAfterFailure(o.id, undefined, {}).error).not.toBeNull();
    ok(service.requestRedelivery(o.id, {}));
    expect(get(o.id)).toMatchObject({ status: 'Ready_for_Pickup', redeliveryUsed: true, redeliveryFeePaid: 25_000 });
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivery_Failed', { failureCause: 'Customer_Refused' }));
    ok(service.applyWebhook(o.id, 'Warehouse_Received'));
    expect(get(o.id).status).toBe('Cancelled');
    expect(get(o.id).refunds).toEqual([]);
    expect(get(o.id).destruction).toBeDefined();
  });

  it('carrier fault: cancel & refund 100% even for custom designs (3a)', () => {
    const o = create({ template: 'custom_plain' });
    toProduction(o);
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivery_Failed', { failureCause: 'Lost_In_Transit' }));
    ok(service.applyWebhook(o.id, 'Warehouse_Received'));
    ok(service.cancelAfterFailure(o.id, { method: 'Bank', bank: 'VCB', accountNo: '0123456789', holder: 'NGUYEN NHAT ANH' }, {}));
    expect(get(o.id).refunds[0]).toMatchObject({ situation: 'S3a', amount: 284_000 });
  });

  it('stock prepaid + customer fault: refund goods minus two-way Standard fee (3b)', () => {
    const o = create({ template: 'stock' });
    ok(service.markPacked(o.id, OPERATOR));
    ok(service.applyWebhook(o.id, 'In_Transit'));
    ok(service.applyWebhook(o.id, 'Delivery_Failed', { failureCause: 'Customer_Refused' }));
    ok(service.applyWebhook(o.id, 'Warehouse_Received'));
    ok(service.cancelAfterFailure(o.id, { method: 'Bank', bank: 'VCB', accountNo: '0123456789', holder: 'NGUYEN NHAT ANH' }, {}));
    expect(get(o.id).refunds[0]).toMatchObject({ situation: 'S3b', amount: 179_000, deductedFee: 50_000 });
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

  it('dispute freezes the 14-day hold and adds the frozen time back (EX-03); Job 2 closes it', () => {
    const o = create({ template: 'stock' });
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
    expect(get(o.id).refunds[0]).toMatchObject({ situation: 'S3a' });
  });

  it('only Admin moves money; failed transfer goes Retry -> Manual; Job 4 issues a voucher after 7 days', () => {
    const a = create({ template: 'custom_plain' });
    ok(service.moderateDesign(a.id, 'Rejected', { violationGroup: 'Khác', reason: 'x' }, OPERATOR));
    ok(service.cancelRejectedOrder(a.id, { method: 'Bank', bank: 'VCB', accountNo: '0123456789', holder: 'NGUYEN NHAT ANH' }, {}));
    const r = get(a.id).refunds[0];
    expect(service.approveRefund(a.id, r.id, OPERATOR).error?.message).toContain('Chỉ Admin');
    ok(service.approveRefund(a.id, r.id, ADMIN));
    ok(service.markTransferFailed(a.id, r.id, ADMIN));
    expect(get(a.id).refunds[0].status).toBe('Refund_Pending_Retry');
    ok(service.retryTransfer(a.id, r.id, ADMIN));
    ok(service.markTransferFailed(a.id, r.id, ADMIN));
    expect(get(a.id).refunds[0].status).toBe('Refund_Pending_Manual');
    ok(service.completeRefund(a.id, r.id, 'FT123', ADMIN));

    const b = create({ template: 'custom_plain' });
    ok(service.moderateDesign(b.id, 'Rejected', { violationGroup: 'Khác', reason: 'x' }, OPERATOR));
    ok(service.cancelRejectedOrder(b.id, { method: 'Later' }, {}));
    later(24 * 7 + 1);
    jobs.run('job4');
    // No automatic voucher any more: the refund stays pending and is handed to CSKH.
    expect(get(b.id).refunds[0].status).toBe('Pending_Approval');
    expect(get(b.id).refunds[0].refundMethod).toBeUndefined();
    expect(get(b.id).refunds[0].escalatedAt).toBeTruthy();
  });

  it('listOpenOrders follows Table 3.1', () => {
    const a = create({ template: 'stock', paymentMethod: 'COD' });
    expect(service.listOpenOrders(a.customerId).canDeleteAccount).toBe(false);
    ok(service.cancelCodOrder(a.id, { reason: 'Other' }, {}));
    expect(service.listOpenOrders(a.customerId).canDeleteAccount).toBe(true);
  });

  it('events to a down module wait in the retry queue and are delivered later (EX-12)', () => {
    const settings = TestBed.inject(DemoSettings);
    settings.setDown('Shopping', true);
    const o = create({ template: 'stock', paymentMethod: 'COD' });
    ok(service.cancelCodOrder(o.id, { reason: 'Other' }, {}));
    expect(get(o.id).status).toBe('Cancelled');
    expect(service.db().retryQueue.length).toBe(2); // ReleaseStock + OrderCancelled
    settings.setDown('Shopping', false);
    jobs.run('retry');
    expect(service.db().retryQueue.length).toBe(0);
  });
});
