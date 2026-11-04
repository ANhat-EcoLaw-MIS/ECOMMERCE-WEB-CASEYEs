import { Injectable, inject } from '@angular/core';
import { Result, fail, ok } from '../../../core/supabase/supabase.types';
import {
  CancelCause,
  IssueType,
  Order,
  TargetService,
  VoucherKind,
} from '../models/order-tracking.model';
import { DemoSettings } from './demo-settings';
import { OrderTrackingDb } from './order.repository';

/**
 * Mock adapters for modules that do not exist yet (Class Diagram interfaces:
 * NotificationService, LoyaltyService, RiskProfileService (Shopping), ComplaintService (Epic 6),
 * PaymentService). Epic 5 only calls them; it never owns their data.
 *
 * Fire-and-forget events go through `IntegrationBus.dispatch`: when the target is down the
 * order is still updated and the event waits in the retry queue (FR-OT-EX-12).
 */

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function orderLink(order: Order): string {
  return `/order-tracking/${encodeURIComponent(order.orderCode)}`;
}

interface NotificationPayload {
  readonly customerId: string;
  readonly title: string;
  readonly body: string;
  readonly link: string;
  readonly channels: readonly ('Email' | 'InApp')[];
}

@Injectable({ providedIn: 'root' })
export class IntegrationBus {
  private readonly demo = inject(DemoSettings);

  /** Delivers or queues an event inside the caller's transaction draft. */
  dispatch(db: OrderTrackingDb, target: TargetService, type: string, payload: object, nowIso: string): void {
    const eventId = newId('evt');
    const body = JSON.stringify(payload);
    if (this.demo.isDown(target)) {
      db.retryQueue.push({
        eventId,
        target,
        type,
        payload: body,
        attempts: 1,
        lastError: `${target} không phản hồi`,
        createdAt: nowIso,
      });
      return;
    }
    this.deliver(db, eventId, target, type, body, nowIso);
  }

  /** Job "retryQueuedEvents": idempotent by eventId. Returns the number delivered. */
  retryQueued(db: OrderTrackingDb, nowIso: string): number {
    let delivered = 0;
    db.retryQueue = db.retryQueue.flatMap((item) => {
      if (db.outbound.some((o) => o.eventId === item.eventId)) return []; // already delivered
      if (this.demo.isDown(item.target)) {
        return [{ ...item, attempts: item.attempts + 1, lastError: `${item.target} không phản hồi` }];
      }
      this.deliver(db, item.eventId, item.target, item.type, item.payload, nowIso);
      delivered++;
      return [];
    });
    return delivered;
  }

  private deliver(
    db: OrderTrackingDb,
    eventId: string,
    target: TargetService,
    type: string,
    payload: string,
    nowIso: string,
  ): void {
    db.outbound.push({ eventId, target, type, payload, deliveredAt: nowIso });
    if (target === 'Notification' && type === 'Notify') {
      const n = JSON.parse(payload) as NotificationPayload;
      for (const channel of n.channels) {
        db.inbox.push({
          id: newId('msg'),
          eventId,
          channel,
          customerId: n.customerId,
          title: n.title,
          body: n.body,
          link: n.link,
          createdAt: nowIso,
        });
      }
    }
  }
}

/** Notification Service (Email + In-app mock; messages land in the Demo Console inbox). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly bus = inject(IntegrationBus);

  notify(
    db: OrderTrackingDb,
    order: Order,
    title: string,
    body: string,
    nowIso: string,
    channels: readonly ('Email' | 'InApp')[] = ['Email', 'InApp'],
  ): void {
    const payload: NotificationPayload = {
      customerId: order.customerId,
      title,
      body: `${order.orderCode}: ${body}`,
      link: orderLink(order),
      channels,
    };
    this.bus.dispatch(db, 'Notification', 'Notify', payload, nowIso);
  }
}

/** Loyalty (Epic 9): points and post-purchase vouchers are issued there. */
@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private readonly bus = inject(IntegrationBus);

  earnPoints(db: OrderTrackingDb, order: Order, nowIso: string): void {
    this.bus.dispatch(db, 'Loyalty', 'OrderCompleted', { orderId: order.id, amount: order.goodsTotal }, nowIso);
  }

  revokePoints(db: OrderTrackingDb, order: Order, nowIso: string): void {
    this.bus.dispatch(db, 'Loyalty', 'RevokePoints', { orderId: order.id }, nowIso);
  }

  requestVoucher(db: OrderTrackingDb, order: Order, kind: VoucherKind, value: number, code: string, nowIso: string): void {
    this.bus.dispatch(db, 'Loyalty', 'IssueVoucher', { orderId: order.id, kind, value, code }, nowIso);
  }
}

/** Shopping RiskProfile (FR-SH-08): Epic 5 reports, Shopping decides cancelCount. */
@Injectable({ providedIn: 'root' })
export class RiskProfileService {
  private readonly bus = inject(IntegrationBus);

  reportCancellation(db: OrderTrackingDb, order: Order, cause: CancelCause, customerFault: boolean, nowIso: string): void {
    this.bus.dispatch(
      db,
      'Shopping',
      'OrderCancelled',
      { orderId: order.id, customerId: order.customerId, cause, customerFault },
      nowIso,
    );
  }
}

/** Epic 6 complaint adapter. Ticket creation is synchronous: failure means no status change. */
@Injectable({ providedIn: 'root' })
export class ComplaintService {
  private readonly demo = inject(DemoSettings);

  createTicket(order: Order, issueType: IssueType): Result<string> {
    if (this.demo.isDown('CustomerService')) {
      return fail({ message: 'Chưa gửi được yêu cầu, vui lòng thử lại' });
    }
    const suffix = order.orderCode.split('-').pop() ?? '0000';
    return ok(`TK-${suffix}-${issueType === 'Dispute_Failure_Cause' ? 'D' : 'C'}${crypto.randomUUID().slice(0, 3).toUpperCase()}`);
  }
}

/** Payment adapter: QR mock only, no third-party gateway. */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly demo = inject(DemoSettings);

  newTransactionRef(): string {
    return `QR${Date.now().toString().slice(-8)}`;
  }

  confirmRedeliveryFee(amount: number): Result<string> {
    if (this.demo.isDown('Payment')) {
      return fail({ message: 'Thanh toán cước giao lại chưa thành công, vui lòng thử lại' });
    }
    return ok(amount > 0 ? this.newTransactionRef() : 'FREE');
  }
}
