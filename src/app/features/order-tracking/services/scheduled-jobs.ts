import { Injectable, inject } from '@angular/core';
import { DELIVERY_CONFIG } from '../config/delivery-config';
import {
  SYSTEM,
  finalizeFailedDelivery,
  startProduction,
  withCancellation,
  withRefund,
  withTransition,
} from '../domain/order-mutations';
import { productionSlot } from '../domain/schedule';
import { Order, RefundRequest } from '../models/order-tracking.model';
import { Clock } from './clock';
import { IntegrationBus, LoyaltyService, NotificationService, RiskProfileService } from './integrations';
import { OrderRepository, OrderTrackingDb } from './order.repository';

export type JobId = 'batch' | 'job1' | 'job2' | 'job3' | 'job4' | 'retry';

export interface JobRun {
  readonly job: JobId;
  readonly processed: number;
  readonly messages: readonly string[];
}

export const JOB_LABELS: Record<JobId, string> = {
  batch: 'Đợt sản xuất 16:00 (Thứ 2 – Thứ 6, chạy bù đơn trễ)',
  job1: 'Job 1 · Tự hoàn thành sau 72 giờ (mỗi giờ)',
  job2: 'Job 2 · Hết hạn lưu kho 14 ngày (mỗi giờ)',
  job3: 'Job 3 · Quá hạn chỉnh sửa thiết kế 7 ngày (mỗi giờ)',
  job4: 'Job 4 · Chưa có tài khoản nhận hoàn 7 ngày (mỗi giờ)',
  retry: 'Gửi lại hàng đợi sự kiện (retry queue)',
};

const DAY = 86_400_000;

/**
 * Background jobs (FR-OT-EX-09). In production these run on pg_cron; here AutoJobs runs them every
 * minute of the (simulated) clock and catches up missed times; the simulator can also run them by hand. Each job re-checks every order against fresh data before updating,
 * so running it twice is safe (idempotent).
 */
@Injectable({ providedIn: 'root' })
export class ScheduledJobs {
  private readonly repo = inject(OrderRepository);
  private readonly clock = inject(Clock);
  private readonly bus = inject(IntegrationBus);
  private readonly notifier = inject(NotificationService);
  private readonly loyalty = inject(LoyaltyService);
  private readonly risk = inject(RiskProfileService);

  run(job: JobId): JobRun {
    const now = this.clock.now();
    return this.repo.transact((db) => {
      const messages: string[] = [];
      const nowIso = now.toISOString();
      if (job === 'retry') {
        const n = this.bus.retryQueued(db, nowIso);
        return { job, processed: n, messages: [`Đã gửi lại ${n} sự kiện, còn ${db.retryQueue.length} trong hàng đợi`] };
      }
      db.orders = db.orders.map((o) => {
        const next = this.step(job, o, db, now, messages);
        return next === o ? o : { ...next, updatedAt: nowIso };
      });
      return { job, processed: messages.length, messages };
    });
  }

  runAll(): JobRun[] {
    return (['batch', 'job1', 'job2', 'job3', 'job4', 'retry'] as const).map((j) => this.run(j));
  }

  private step(job: JobId, o: Order, db: OrderTrackingDb, now: Date, out: string[]): Order {
    const t = now.getTime();
    const nowIso = now.toISOString();
    const cfg = DELIVERY_CONFIG;

    switch (job) {
      case 'batch': {
        // Daily 16:00 production run; orders that missed a run start right away.
        const slot = productionSlot(o, now);
        if (!slot) return o;
        out.push(`${o.orderCode}: vào sản xuất${slot === 'overdue' ? ' (chạy bù, trễ đợt)' : ''}`);
        return startProduction(o, SYSTEM, nowIso);
      }
      case 'job1': {
        if (o.status !== 'Delivered' || o.frozenAt || !o.autoCompleteAt || new Date(o.autoCompleteAt).getTime() > t) return o;
        const next = { ...withTransition(o, 'Completed', SYSTEM, 'Tự động hoàn thành sau 72 giờ kể từ khi giao', nowIso), reviewInvitePending: true };
        this.loyalty.earnPoints(db, next, nowIso);
        out.push(`${o.orderCode}: Delivered → Completed`);
        return next;
      }
      case 'job2': {
        const h = o.warehouseHold;
        if (o.status !== 'Delivery_Failed' || !h || h.disputed || new Date(h.expiresAt).getTime() > t) return o;
        const r = finalizeFailedDelivery(o, SYSTEM, 'Giao thất bại quá hạn', true, nowIso);
        this.risk.reportCancellation(db, r.order, r.cause, r.customerFault, nowIso);
        this.notifier.notify(db, r.order, 'Đơn hàng đã đóng', r.refund ? 'Quá hạn lưu kho 14 ngày. Yêu cầu hoàn tiền đang chờ xác nhận.' : 'Quá hạn lưu kho 14 ngày, đơn được đóng theo chính sách.', nowIso);
        out.push(`${o.orderCode}: hết hạn lưu kho → Cancelled${r.refund ? ` (hoàn ${r.refund.situation})` : ''}`);
        return r.order;
      }
      case 'job3': {
        if (o.status !== 'Action_Required' || !o.rejectedAt) return o;
        const rejected = new Date(o.rejectedAt).getTime();
        if (t >= rejected + cfg.designFixDeadlineDays * DAY) {
          let next = withCancellation(o, SYSTEM, 'Design_Fix_Expired', true, 'Quá hạn chỉnh sửa thiết kế', nowIso);
          next = withRefund(next, 'S2', undefined, nowIso).order;
          this.bus.dispatch(db, 'Shopping', 'ReleaseStock', { orderId: o.id, baseSkus: o.items.map((i) => i.baseSku) }, nowIso);
          this.risk.reportCancellation(db, next, 'Design_Fix_Expired', true, nowIso);
          this.notifier.notify(db, next, 'Đơn hàng đã hủy', 'Quá hạn chỉnh sửa thiết kế. Yêu cầu hoàn 100% đang chờ xác nhận.', nowIso);
          out.push(`${o.orderCode}: Action_Required quá 7 ngày → Cancelled + hoàn S2`);
          return next;
        }
        if (!o.designFixReminderAt && t >= rejected + cfg.reminderDay * DAY) {
          this.notifier.notify(db, o, 'Nhắc chỉnh sửa thiết kế', `Còn ${cfg.designFixDeadlineDays - cfg.reminderDay} ngày để sửa thiết kế hoặc hủy và nhận hoàn 100%.`, nowIso);
          out.push(`${o.orderCode}: nhắc sửa thiết kế (ngày 3)`);
          return { ...o, designFixReminderAt: nowIso };
        }
        return o;
      }
      case 'job4': {
        let changed = o;
        for (const r of o.refunds) {
          if (r.status !== 'Pending_Approval' || r.refundMethod) continue;
          const created = new Date(r.createdAt).getTime();
          if (!r.escalatedAt && t >= created + cfg.refundAccountDeadlineDays * DAY) {
            // No more automatic voucher: CSKH contacts the customer to get the account.
            changed = { ...changed, refunds: changed.refunds.map((x): RefundRequest => (x.id === r.id ? { ...x, escalatedAt: nowIso } : x)) };
            this.bus.dispatch(db, 'CustomerService', 'ContactForRefundAccount', { orderId: o.id, refundId: r.id, amount: r.amount }, nowIso);
            this.notifier.notify(db, changed, 'CSKH sẽ liên hệ để hoàn tiền', 'Bạn chưa cung cấp tài khoản nhận hoàn. Nhân viên CSKH sẽ liên hệ để hỗ trợ.', nowIso);
            out.push(`${o.orderCode}: quá ${cfg.refundAccountDeadlineDays} ngày chưa có tài khoản → chuyển CSKH liên hệ (${r.situation})`);
          } else if (!r.reminderSentAt && t >= created + cfg.reminderDay * DAY) {
            changed = { ...changed, refunds: changed.refunds.map((x) => (x.id === r.id ? { ...x, reminderSentAt: nowIso } : x)) };
            this.notifier.notify(db, changed, 'Nhắc cung cấp tài khoản nhận hoàn', 'Vui lòng nhập tài khoản ngân hàng nhận hoàn trong chi tiết đơn.', nowIso);
            out.push(`${o.orderCode}: nhắc cung cấp tài khoản (ngày 3)`);
          }
        }
        return changed;
      }
      case 'retry':
        return o;
    }
  }
}
