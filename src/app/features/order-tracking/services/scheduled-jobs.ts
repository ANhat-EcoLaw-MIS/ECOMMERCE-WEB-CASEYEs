import { Injectable, inject } from '@angular/core';
import { DELIVERY_CONFIG } from '../config/delivery-config';
import { addDaysIso } from '../domain/calendar';
import {
  SYSTEM,
  finalizeFailedDelivery,
  withCancellation,
  withRefund,
  withTransition,
  withVoucher,
} from '../domain/order-mutations';
import { Order, RefundRequest } from '../models/order-tracking.model';
import { Clock } from './clock';
import { IntegrationBus, LoyaltyService, NotificationService, RiskProfileService } from './integrations';
import { OrderRepository, OrderTrackingDb } from './order.repository';

export type JobId = 'job1' | 'job2' | 'job3' | 'job4' | 'retry';

export interface JobRun {
  readonly job: JobId;
  readonly processed: number;
  readonly messages: readonly string[];
}

export const JOB_LABELS: Record<JobId, string> = {
  job1: 'Job 1 · Tự hoàn thành sau 72 giờ (mỗi giờ)',
  job2: 'Job 2 · Hết hạn lưu kho 14 ngày (mỗi giờ)',
  job3: 'Job 3 · Quá hạn chỉnh sửa thiết kế 7 ngày (mỗi giờ)',
  job4: 'Job 4 · Chưa có tài khoản nhận hoàn 7 ngày (mỗi giờ)',
  retry: 'Gửi lại hàng đợi sự kiện (retry queue)',
};

const DAY = 86_400_000;

/**
 * Background jobs (FR-OT-EX-09). In production these run on pg_cron; here they are triggered
 * from the Demo Console. Each job re-checks every order against fresh data before updating,
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
    return (['job1', 'job2', 'job3', 'job4', 'retry'] as const).map((j) => this.run(j));
  }

  private step(job: JobId, o: Order, db: OrderTrackingDb, now: Date, out: string[]): Order {
    const t = now.getTime();
    const nowIso = now.toISOString();
    const cfg = DELIVERY_CONFIG;

    switch (job) {
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
          if (t >= created + cfg.refundAccountDeadlineDays * DAY) {
            const v = withVoucher(changed, 'Store_Credit', r.amount, nowIso);
            changed = {
              ...v.order,
              refunds: v.order.refunds.map((x): RefundRequest =>
                x.id === r.id ? { ...x, status: 'Refunded', refundMethod: 'Voucher', voucherCode: v.voucher.code, approvedBy: 'system-job4', resolvedAt: nowIso } : x,
              ),
            };
            this.notifier.notify(db, changed, 'Đã hoàn bằng voucher', `Sau 7 ngày chưa nhận được tài khoản, bạn được cấp voucher ${v.voucher.code} (hạn ${new Date(addDaysIso(nowIso, cfg.voucherValidDays)).toLocaleDateString('vi-VN')}).`, nowIso);
            out.push(`${o.orderCode}: cấp voucher thay hoàn tiền (${r.situation})`);
          } else if (!r.reminderSentAt && t >= created + cfg.reminderDay * DAY) {
            changed = { ...changed, refunds: changed.refunds.map((x) => (x.id === r.id ? { ...x, reminderSentAt: nowIso } : x)) };
            this.notifier.notify(db, changed, 'Nhắc cung cấp tài khoản nhận hoàn', 'Vui lòng nhập tài khoản hoặc chọn nhận voucher trong chi tiết đơn.', nowIso);
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
