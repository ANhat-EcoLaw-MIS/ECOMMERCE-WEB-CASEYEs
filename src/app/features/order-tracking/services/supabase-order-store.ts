import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { Result, fail, ok } from '../../../core/supabase/supabase.types';
import {
  ActorType,
  CancelReason,
  CancelRequestStatus,
  FailureCause,
  FaultParty,
  Order,
  OrderStatus,
  RefundRequest,
  RefundSituation,
  RefundStatus,
  VoucherKind,
} from '../models/order-tracking.model';

/* Row shapes returned by the nested select below (snake_case, as in the database). */
interface Row {
  [key: string]: unknown;
}

const SELECT = `*,
  order_items(*),
  order_status_history(*),
  cancel_requests(*),
  refund_requests(*),
  design_reviews(*),
  shipments(*, delivery_attempts(*)),
  order_vouchers(*)`;

const ACTOR: Record<string, ActorType> = {
  customer: 'Customer',
  operator: 'Operator',
  cskh: 'CustomerService',
  admin: 'Admin',
  carrier: 'Carrier',
  system: 'System',
};

const VOUCHER_KIND: Record<string, VoucherKind> = {
  late_delivery: 'Late_Delivery',
  express_surcharge: 'Express_Surcharge',
  complaint: 'Complaint_Compensation',
};

const CANCEL_STATUS: Record<string, CancelRequestStatus> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const s = (v: unknown): string => (v == null ? '' : String(v));
const opt = (v: unknown): string | undefined => (v == null || v === '' ? undefined : String(v));
const n = (v: unknown): number => Number(v ?? 0);
const rows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const byDate = (a: Row, b: Row, key = 'created_at') => s(a[key]).localeCompare(s(b[key]));

/** Maps one orders row (with its embedded relations) to the UI model used by every screen. */
export function mapOrderRow(r: Row): Order {
  const items = rows(r['order_items']);
  const history = rows(r['order_status_history']).sort((a, b) => byDate(a, b) || s(a['id']).localeCompare(s(b['id'])));
  const shipment = rows(r['shipments'])[0];
  const status = s(r['status_detail']) as OrderStatus;
  const hasCustom = items.some((i) => i['design_id'] != null);
  const fee = n(r['shipping_fee']);

  let prev: OrderStatus | null = null;
  const logs = history.map((h) => {
    const to = (s(h['status_detail']) || status) as OrderStatus;
    const log = {
      id: s(h['id']),
      from: prev,
      to,
      actorType: ACTOR[s(h['actor_type'])] ?? 'System',
      actorId: s(h['actor_id']) || s(h['actor_type']),
      reason: s(h['reason']),
      createdAt: s(h['created_at']),
    };
    prev = to;
    return log;
  });

  return {
    id: s(r['id']),
    orderCode: s(r['order_code']),
    customerId: s(r['user_id']),
    customerName: s(r['recipient']),
    customerPhone: s(r['phone']),
    customerEmail: '',
    payerName: s(r['recipient']),
    shippingAddress: [r['address_line'], r['ward'], r['district'], r['city']].filter(Boolean).join(', '),
    status,
    paymentMethod: r['payment_method'] === 'cod' ? 'COD' : 'QR_Transfer',
    paymentStatus: r['payment_status'] === 'paid' ? 'Paid' : 'Unpaid',
    paymentTxnRef: opt(r['payment_txn_ref']),
    goodsTotal: n(r['goods_total']),
    discount: n(r['discount']) || undefined,
    shipping: {
      fee,
      standardFee: n(r['standard_fee']) || fee,
      expressSurcharge: n(r['express_surcharge']),
      transitDays: { min: n(r['transit_min']) || 1, max: n(r['transit_max']) || 2 },
    },
    shippingTier: r['shipping_tier'] === 'express' ? 'Express' : 'Standard',
    hasCustomItem: hasCustom,
    hasUploadedImage: false,
    earliestEDD: s(r['earliest_edd']),
    latestEDD: s(r['latest_edd']),
    batchDate: s(r['batch_date']),
    policyVersion: '',
    policyAcceptedAt: s(r['created_at']),
    createdAt: s(r['created_at']),
    updatedAt: s(r['updated_at']),
    confirmDueAt: opt(r['confirm_due_at']),
    confirmedAt: opt(r['confirmed_at']),
    reviewQueuedAt: opt(r['review_queued_at']),
    rejectedAt: opt(r['rejected_at']),
    designFixReminderAt: opt(r['design_fix_reminded_at']),
    designResubmitCount: n(r['design_resubmit_count']),
    deliveredAt: opt(r['delivered_at']),
    autoCompleteAt: opt(r['auto_complete_at']),
    frozenAt: opt(r['frozen_at']),
    autoCompleteFrozenOnce: !!r['frozen_at'],
    reviewInvitePending: false,
    redeliveryUsed: !!r['redelivery_used'],
    qcReprintCount: n(r['qc_reprint_count']),
    failureCause: opt(r['failure_cause']) as FailureCause | undefined,
    faultOverride: opt(r['fault_override']) as FaultParty | undefined,
    lateVoucherIssued: !!r['late_voucher_issued'],
    items: items.map((i) => {
      const custom = i['design_id'] != null;
      return {
        id: s(i['id']),
        productName: s(i['name']),
        phoneModel: s(i['phone_model']),
        baseSku: s(i['variant_id'] ?? i['design_id']),
        isCustom: custom,
        quantity: n(i['qty']),
        unitPrice: n(i['unit_price']),
        imageUrl: opt(i['image_url']),
        design: custom
          ? { id: s(i['design_id']), previewUrl: opt(i['image_url']), caption: s(i['name']), hasUploadedImage: false, version: n(i['design_version']) || 1 }
          : undefined,
      };
    }),
    logs,
    moderationReviews: rows(r['design_reviews']).sort(byDate).map((d) => ({
      id: s(d['id']),
      round: n(d['round']),
      decision: d['decision'] === 'approved' ? 'Approved' : 'Rejected',
      violationGroup: opt(d['violation_group']),
      reason: opt(d['reason']),
      reviewerId: s(d['reviewer_id']),
      createdAt: s(d['created_at']),
    })),
    cancelRequests: rows(r['cancel_requests']).sort(byDate).map((c) => ({
      id: s(c['id']),
      reason: s(c['reason']) as CancelReason,
      note: opt(c['note']),
      status: CANCEL_STATUS[s(c['status'])] ?? 'Pending',
      slaDueAt: s(c['sla_due_at']),
      createdAt: s(c['created_at']),
      decidedAt: opt(c['decided_at']),
      decidedBy: opt(c['decided_by']),
      decisionReason: opt(c['decision_reason']),
    })),
    shipment: shipment
      ? {
          carrier: s(shipment['carrier']),
          trackingCode: s(shipment['tracking_code']),
          attempts: rows(shipment['delivery_attempts'])
            .sort((a, b) => n(a['attempt_no']) - n(b['attempt_no']))
            .map((a) => ({
              attemptNo: n(a['attempt_no']),
              startedAt: s(a['started_at']),
              result: a['result'] === 'delivered' ? ('Delivered' as const) : a['result'] === 'failed' ? ('Failed' as const) : undefined,
              failureCause: opt(a['failure_cause']) as FailureCause | undefined,
              endedAt: opt(a['ended_at']),
            })),
        }
      : undefined,
    warehouseHold: r['warehouse_hold_until']
      ? { receivedAt: s(r['updated_at']), expiresAt: s(r['warehouse_hold_until']), disputed: !!r['warehouse_disputed'] }
      : undefined,
    refunds: rows(r['refund_requests']).sort(byDate).map(
      (f): RefundRequest => ({
        id: s(f['id']),
        situation: s(f['situation']) as RefundSituation,
        amount: n(f['amount']),
        deductedFee: n(f['deducted_fee']),
        status: s(f['status']) as RefundStatus,
        refundMethod: f['refund_method'] === 'bank' ? 'Bank' : undefined,
        refundBank: opt(f['bank']),
        refundAccountNo: opt(f['account_no']),
        refundAccountHolder: opt(f['account_holder']),
        approvedBy: opt(f['approved_by']),
        bankRef: opt(f['bank_ref']),
        transferAttempts: n(f['transfer_attempts']),
        rejectReason: opt(f['reject_reason']),
        reminderSentAt: opt(f['reminder_sent_at']),
        escalatedAt: opt(f['escalated_at']),
        createdAt: s(f['created_at']),
        resolvedAt: opt(f['resolved_at']),
      }),
    ),
    tickets: r['ticket_id']
      ? [{ ticketCode: s(r['ticket_id']), issueType: 'Other' as const, description: '', evidenceNames: [], open: status === 'Return_Requested', createdAt: s(r['updated_at']) }]
      : [],
    vouchers: rows(r['order_vouchers']).map((v) => ({
      code: s(v['code']),
      kind: VOUCHER_KIND[s(v['kind'])] ?? 'Late_Delivery',
      value: n(v['value']),
      expiresAt: s(v['expires_at']),
      createdAt: s(v['created_at']),
    })),
  } as unknown as Order;
}

/**
 * Orders stored in Supabase (M1–M8). RLS decides what comes back: a customer gets their own
 * orders, staff get every order. Writes only go through the RPCs.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseOrderStore {
  private readonly db = inject(SUPABASE_CLIENT);
  /** For the few reads/writes around place_order (catalog lookup, saving a design). */
  readonly client = this.db;
  private readonly _orders = signal<readonly Order[]>([]);
  readonly orders = this._orders.asReadonly();
  readonly loaded = signal(false);
  /** Shared notifications of the signed-in user (M4), newest first. */
  readonly notifications = signal<readonly { id: string; userId: string; title: string; body: string; link: string; createdAt: string; readAt?: string }[]>([]);
  readonly error = signal<string | null>(null);

  async load(): Promise<Result<readonly Order[]>> {
    const { data, error } = await this.db.from('orders').select(SELECT).order('created_at', { ascending: false });
    if (error) {
      this.error.set(error.message);
      return fail(error);
    }
    const list = ((data ?? []) as unknown as Row[]).map(mapOrderRow);
    this._orders.set(list);
    void this.loadNotifications();
    this.loaded.set(true);
    this.error.set(null);
    return ok(list);
  }

  async loadNotifications(): Promise<void> {
    const { data } = await this.db.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    this.notifications.set(
      ((data ?? []) as unknown as Row[]).map((r) => ({
        id: s(r['id']),
        userId: s(r['user_id']),
        title: s(r['title']),
        body: s(r['body']),
        link: s(r['link']),
        createdAt: s(r['created_at']),
        readAt: opt(r['read_at']),
      })),
    );
  }

  async markNotificationsRead(ids: readonly string[]): Promise<void> {
    if (!ids.length) return;
    const now = new Date().toISOString();
    this.notifications.update((list) => list.map((m) => (ids.includes(m.id) ? { ...m, readAt: m.readAt ?? now } : m)));
    await this.db.from('notifications').update({ read_at: now }).in('id', [...ids]);
  }

  clear(): void {
    this.notifications.set([]);
    this._orders.set([]);
    this.loaded.set(false);
  }

  /** Calls an RPC, then reloads the orders so every screen shows the new state. */
  async rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<Result<T>> {
    const { data, error } = await (this.db.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: T; error: { message: string } | null }>)(fn, args);
    if (error) return fail({ message: rpcMessage(error.message) });
    await this.load();
    return ok(data);
  }
}

/** Database error codes (raise exception '…') in customer words. */
const RPC_MESSAGES: Record<string, string> = {
  forbidden: 'Tài khoản của bạn không có quyền thực hiện thao tác này.',
  order_not_found: 'Không tìm thấy đơn hàng.',
  cannot_cancel: 'Đơn đã được xác nhận và đang được chuẩn bị, không thể hủy.',
  cannot_request_cancel: 'Đơn đã vào sản xuất nên không thể gửi yêu cầu hủy.',
  request_exists: 'Đơn đã có một yêu cầu hủy đang chờ xử lý.',
  no_pending_request: 'Yêu cầu hủy đã có kết quả.',
  on_hold: 'Đơn đang tạm dừng vì có yêu cầu hủy chờ CSKH.',
  handled_by_other: 'Thao tác đã được xử lý bởi người khác. Danh sách đã được cập nhật.',
  reason_required: 'Vui lòng nhập lý do.',
  custom_needs_production: 'Đơn có hàng thiết kế phải qua sản xuất trước khi đóng gói.',
  not_confirmed: 'Đơn chưa được xác nhận.',
  cannot_pack: 'Đơn không ở bước có thể đóng gói.',
  invalid_state: 'Trạng thái đơn không phù hợp với sự kiện này.',
  cod_requires_stock_only: 'Đơn có hàng thiết kế theo yêu cầu cần thanh toán trước.',
  express_requires_stock_only: 'Hỏa tốc chỉ áp dụng cho đơn chỉ có hàng có sẵn.',
  out_of_stock: 'Một sản phẩm trong đơn đã hết hàng.',
  not_authenticated: 'Vui lòng đăng nhập để tiếp tục.',
  invalid_account: 'Thông tin tài khoản ngân hàng chưa hợp lệ.',
  no_account: 'Khách chưa cung cấp tài khoản nhận hoàn.',
  bank_ref_required: 'Nhập mã giao dịch ngân hàng.',
};

function rpcMessage(raw: string): string {
  const key = Object.keys(RPC_MESSAGES).find((k) => raw.includes(k));
  return key ? RPC_MESSAGES[key] : raw;
}
