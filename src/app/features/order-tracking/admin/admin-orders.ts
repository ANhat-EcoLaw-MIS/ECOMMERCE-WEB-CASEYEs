import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../components/status-badge/status-badge';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, FIELD } from '../components/ui';
import { CANCEL_REASON_LABELS, DELIVERY_CONFIG, FAILURE_CAUSES, VIOLATION_GROUPS } from '../config/delivery-config';
import { REFUND_TONE, TONE_CLASSES } from '../config/status-style';
import { formatDayLabel, formatShortDate, isWorkingDay, toDateKey } from '../domain/calendar';
import { Actor } from '../domain/order-mutations';
import { isConfirmed, isOnHold, pendingCancelRequest, refundStatusLabel } from '../domain/order-rules';
import { lateness, productionDueDate, productionSlot } from '../domain/schedule';
import { formatVnd } from '../domain/shipping-fee';
import { statusLabel } from '../domain/timeline';
import { Order, RefundRequest, Resolution } from '../models/order-tracking.model';
import { Clock } from '../services/clock';
import { DemoSettings } from '../services/demo-settings';
import { OrderTrackingService } from '../services/order-tracking.service';

type QueueKey =
  | 'review'
  | 'toProduce'
  | 'producing'
  | 'pickup'
  | 'cancelRequests'
  | 'tickets'
  | 'refundApprove'
  | 'refundTransfer'
  | 'refundWaiting'
  | 'late'
  | 'all';

interface Queue {
  readonly key: QueueKey;
  readonly label: string;
  readonly hint: string;
  readonly match: (o: Order, now: Date) => boolean;
}

const HOUR = 3_600_000;

const ROLE_QUEUES: Record<'Operator' | 'CSKH' | 'Admin', readonly Queue[]> = {
  Operator: [
    { key: 'review', label: 'Chờ duyệt thiết kế', hint: 'Kiểm tra bản thiết kế trước khi in. Duyệt xong, đơn chuyển sang "Chờ sản xuất".', match: (o) => o.status === 'Pending_Review' && !isOnHold(o) },
    { key: 'toProduce', label: 'Chờ sản xuất', hint: 'Đơn thiết kế vào sản xuất theo đợt 16:00 mỗi ngày làm việc. Hàng có sẵn đóng gói ngay.', match: (o, now) => o.status === 'Pending_Confirmation' && isConfirmed(o, now) && !isOnHold(o) },
    { key: 'producing', label: 'Đang sản xuất', hint: 'In xong và kiểm tra chất lượng thì bấm "Đóng gói".', match: (o) => o.status === 'In_Production' },
    { key: 'pickup', label: 'Chờ bàn giao', hint: 'Đã đóng gói, chờ đơn vị vận chuyển đến lấy.', match: (o) => o.status === 'Ready_for_Pickup' },
  ],
  CSKH: [
    { key: 'cancelRequests', label: 'Yêu cầu hủy', hint: 'Phản hồi trong 1 ngày làm việc. Đơn được tạm dừng cho tới khi có quyết định.', match: (o) => !!pendingCancelRequest(o) },
    { key: 'tickets', label: 'Báo sự cố', hint: 'Khách báo sự cố sau khi nhận hàng, hoặc khiếu nại nguyên nhân giao không thành công.', match: (o) => o.tickets.some((t) => t.open) },
  ],
  Admin: [
    { key: 'refundApprove', label: 'Hoàn tiền chờ duyệt', hint: 'Đối chiếu tài khoản (đứng tên người thanh toán) rồi duyệt.', match: (o) => o.refunds.some((r) => r.status === 'Pending_Approval' && !!r.refundMethod) },
    { key: 'refundTransfer', label: 'Đang chuyển khoản', hint: 'Chuyển khoản nội dung "HOAN <mã đơn>", rồi nhập mã giao dịch ngân hàng.', match: (o) => o.refunds.some((r) => ['Processing', 'Refund_Pending_Retry', 'Refund_Pending_Manual'].includes(r.status)) },
    { key: 'refundWaiting', label: 'Chờ khách nhập tài khoản', hint: 'Khách chưa cung cấp tài khoản nhận hoàn. Quá hạn sẽ chuyển CSKH liên hệ.', match: (o) => o.refunds.some((r) => r.status === 'Pending_Approval' && !r.refundMethod) },
  ],
};

const LATE_QUEUE: Queue = { key: 'late', label: 'Trễ hẹn', hint: 'Đơn quá giới hạn thời gian ở bất kỳ bước nào. Xử lý trước các đơn khác.', match: (o, now) => lateness(o, now) !== null };

const ALL_QUEUE: Queue = { key: 'all', label: 'Tất cả đơn', hint: 'Tra cứu mọi đơn hàng.', match: () => true };

/**
 * Back office for Quản lý đơn hàng (/admin/order-tracking). Each role works from its own queues;
 * time travel, carrier events and sample orders live on the separate simulator page.
 */
@Component({
  selector: 'app-admin-orders',
  imports: [DatePipe, RouterLink, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-orders.html',
})
export class AdminOrders {
  private readonly service = inject(OrderTrackingService);
  private readonly clock = inject(Clock);
  protected readonly demo = inject(DemoSettings);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnSecondary = BTN_SECONDARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly field = FIELD;
  protected readonly formatVnd = formatVnd;
  protected readonly formatShortDate = formatShortDate;
  protected readonly violationGroups = VIOLATION_GROUPS;
  protected readonly reasonLabels = CANCEL_REASON_LABELS;

  protected readonly now = computed(() => this.clock.nowSignal());
  protected readonly queues = computed<readonly Queue[]>(() => [...ROLE_QUEUES[this.demo.role()], LATE_QUEUE, ALL_QUEUE]);
  protected readonly queueKey = signal<QueueKey>('review');
  protected readonly queue = computed(() => this.queues().find((q) => q.key === this.queueKey()) ?? this.queues()[0]);
  protected readonly search = signal('');

  private readonly sorted = computed(() => [...this.service.orders()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  protected readonly counts = computed(() => {
    const now = this.now();
    return Object.fromEntries(this.queues().map((q) => [q.key, this.sorted().filter((o) => q.match(o, now)).length])) as Record<QueueKey, number>;
  });
  protected readonly rows = computed(() => {
    const now = this.now();
    const q = this.search().trim().toLowerCase();
    const list = this.sorted().filter((o) => this.queue().match(o, now));
    const filtered = q ? list.filter((o) => o.orderCode.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)) : list;
    if (this.queue().key === 'all') return [...filtered].reverse();
    // Late orders first, then oldest first.
    return [...filtered].sort((a, b) => Number(!!lateness(b, now)) - Number(!!lateness(a, now)));
  });

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => {
    const id = this.selectedId();
    return this.rows().find((o) => o.id === id) ?? this.service.orders().find((o) => o.id === id) ?? this.rows()[0] ?? null;
  });

  /** Production run banner: late orders can start now, the others wait for 16:00. */
  protected readonly nextBatch = computed(() => {
    const now = this.now();
    const cut = DELIVERY_CONFIG.batchCutoff;
    const hhmm = `${String(cut.hour).padStart(2, '0')}:${String(cut.minute).padStart(2, '0')}`;
    const waiting = this.sorted().filter((o) => o.status === 'Pending_Confirmation' && o.hasCustomItem && !!o.confirmedAt && !isOnHold(o));
    const overdue = waiting.filter((o) => productionSlot(o, now) === 'overdue').length;
    const due = waiting.filter((o) => productionSlot(o, now) === 'due').length;
    const cutToday = new Date(now);
    cutToday.setHours(cut.hour, cut.minute, 0, 0);
    const today = isWorkingDay(now, DELIVERY_CONFIG.holidays);
    const label = today && now < cutToday ? `${hhmm} hôm nay` : today ? 'đang chạy' : `${hhmm} ngày làm việc tiếp theo`;
    return { label, overdue, due, upcoming: waiting.length - overdue - due, ready: overdue + due };
  });

  // form inputs (reset when the selected order changes)
  protected readonly violation = signal<string>(VIOLATION_GROUPS[0]);
  protected readonly note = signal('');
  protected readonly bankRef = signal('');
  protected readonly flash = signal<{ ok: boolean; text: string } | null>(null);

  protected readonly actor = computed<Actor>(() => {
    switch (this.demo.role()) {
      case 'Admin':
        return { type: 'Admin', id: 'admin-01' };
      case 'CSKH':
        return { type: 'CustomerService', id: 'cskh-01' };
      default:
        return { type: 'Operator', id: 'operator-01' };
    }
  });

  constructor() {
    // Switching role opens that role's first queue.
    effect(() => {
      const first = ROLE_QUEUES[this.demo.role()][0].key;
      this.queueKey.set(first);
      this.selectedId.set(null);
    });
    effect(() => {
      this.selected()?.id;
      this.note.set('');
      this.bankRef.set('');
    });
  }

  // ------------------------------------------------------------ view helpers
  protected label(o: Order): string {
    return statusLabel(o, this.now());
  }

  protected kind(o: Order): string {
    if (!o.hasCustomItem) return 'Có sẵn';
    return o.items.some((i) => !i.isCustom) ? 'Hỗn hợp' : 'Thiết kế';
  }

  protected waited(iso: string): string {
    const h = (this.now().getTime() - new Date(iso).getTime()) / HOUR;
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} phút`;
    if (h < 48) return `${Math.round(h)} giờ`;
    return `${Math.round(h / 24)} ngày`;
  }

  protected late(o: Order) {
    return lateness(o, this.now());
  }

  protected slot(o: Order) {
    return productionSlot(o, this.now());
  }

  protected reviewOverdue(o: Order): boolean {
    return o.status === 'Pending_Review' && !!o.reviewQueuedAt && this.now().getTime() - new Date(o.reviewQueuedAt).getTime() > DELIVERY_CONFIG.moderationSlaHours * HOUR;
  }

  protected request(o: Order) {
    return pendingCancelRequest(o);
  }

  protected requestOverdue(o: Order): boolean {
    const r = pendingCancelRequest(o);
    return !!r && this.now().getTime() > new Date(r.slaDueAt).getTime();
  }

  protected ticket(o: Order) {
    return o.tickets.find((t) => t.open);
  }

  protected failure(o: Order): string {
    return o.failureCause ? FAILURE_CAUSES[o.failureCause].label : '';
  }

  protected refundLabel(r: RefundRequest): string {
    return refundStatusLabel(r);
  }

  protected refundTone(r: RefundRequest): string {
    return TONE_CLASSES[REFUND_TONE[r.status]].badge;
  }

  protected batchDay(o: Order): string {
    return formatDayLabel(productionDueDate(o));
  }

  // ------------------------------------------------------------ actions
  protected approve(o: Order): void {
    this.report(this.service.moderateDesign(o.id, 'Approved', { violationGroup: '', reason: '' }, this.actor()), `${o.orderCode}: đã duyệt thiết kế, chờ đợt sản xuất`);
  }

  protected reject(o: Order): void {
    this.report(this.service.moderateDesign(o.id, 'Rejected', { violationGroup: this.violation(), reason: this.note() }, this.actor()), `${o.orderCode}: đã gửi yêu cầu chỉnh sửa cho khách`);
  }

  protected startProduction(): void {
    const r = this.service.closeBatch(this.actor());
    if (r.error) {
      return this.flash.set({ ok: false, text: r.error.message });
    }
    this.flash.set({ ok: true, text: `Đã đưa ${r.data.count} đơn vào sản xuất (${Object.entries(r.data.groups).map(([m, n]) => `${m}: ${n}`).join(', ')}).` });
  }

  protected pack(o: Order): void {
    this.report(this.service.markPacked(o.id, this.actor()), `${o.orderCode}: đã đóng gói, chờ bàn giao vận chuyển`);
  }

  protected reprint(o: Order): void {
    this.report(this.service.markQcReprint(o.id, this.actor()), `${o.orderCode}: in lại do lỗi QC, ngày giao lùi 1 ngày làm việc`);
  }

  protected decideCancel(o: Order, accept: boolean): void {
    this.report(this.service.decideCancelRequest(o.id, accept, this.note(), this.actor()), `${o.orderCode}: ${accept ? 'đã chấp nhận' : 'đã từ chối'} yêu cầu hủy`);
  }

  protected resolveTicket(o: Order, resolution: Resolution): void {
    this.report(this.service.applyComplaintResult(o.id, resolution, this.note(), this.actor()), `${o.orderCode}: đã trả kết quả cho khách`);
  }

  protected resolveDispute(o: Order, customerRight: boolean): void {
    this.report(this.service.resolveDispute(o.id, customerRight, this.note(), this.actor()), `${o.orderCode}: đã kết luận khiếu nại giao hàng`);
  }

  protected approveRefund(o: Order, r: RefundRequest): void {
    this.report(this.service.approveRefund(o.id, r.id, this.actor()), `${o.orderCode}: đã duyệt hoàn ${formatVnd(r.amount)}, chờ chuyển khoản`);
  }

  protected rejectRefund(o: Order, r: RefundRequest): void {
    this.report(this.service.rejectRefund(o.id, r.id, this.note(), this.actor()), `${o.orderCode}: đã từ chối hoàn tiền`);
  }

  protected completeRefund(o: Order, r: RefundRequest): void {
    this.report(this.service.completeRefund(o.id, r.id, this.bankRef(), this.actor()), `${o.orderCode}: đã ghi nhận chuyển khoản`);
  }

  protected transferFailed(o: Order, r: RefundRequest): void {
    this.report(this.service.markTransferFailed(o.id, r.id, this.actor()), `${o.orderCode}: chuyển khoản lỗi, đã báo khách kiểm tra tài khoản`);
  }

  protected retryTransfer(o: Order, r: RefundRequest): void {
    this.report(this.service.retryTransfer(o.id, r.id, this.actor()), `${o.orderCode}: chuyển khoản lại`);
  }

  private report(r: { error: { message: string } | null }, text: string): void {
    this.flash.set(r.error ? { ok: false, text: r.error.message } : { ok: true, text });
    if (!r.error) this.note.set('');
  }
}
