import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StaffSession, type StaffRole } from '../../../core/auth/staff-session';
import { OrderTimeline } from '../components/order-timeline/order-timeline';
import { StatusBadge } from '../components/status-badge/status-badge';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, FIELD } from '../components/ui';
import { CANCEL_REASON_LABELS, DELIVERY_CONFIG, FAILURE_CAUSES, VIOLATION_GROUPS } from '../config/delivery-config';
import { REFUND_TONE, TONE_CLASSES } from '../config/status-style';
import { formatDayLabel, formatShortDate } from '../domain/calendar';
import { Actor } from '../domain/order-mutations';
import { codWindowOpen, faultParty, isOnHold, pendingCancelRequest, refundStatusLabel } from '../domain/order-rules';
import { lateness, productionDueDate, productionSlot } from '../domain/schedule';
import { formatVnd } from '../domain/shipping-fee';
import { statusLabel } from '../domain/timeline';
import { FailureCause, Order, RefundRequest, Resolution, ShipmentEventType } from '../models/order-tracking.model';
import { Clock } from '../services/clock';
import { OrderTrackingService } from '../services/order-tracking.service';

type Owner = 'Operator' | 'CSKH' | 'Admin' | 'All';

interface Queue {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
  readonly match: (o: Order, now: Date) => boolean;
}

interface QueueGroup {
  readonly owner: Owner;
  readonly title: string;
  /** Workspace tab: short name + who works it. */
  readonly tab: string;
  readonly who: string;
  readonly queues: readonly Queue[];
}

const HOUR = 3_600_000;
const openTicket = (o: Order) => o.tickets.find((t) => t.open);
const hasRefund = (o: Order, test: (r: RefundRequest) => boolean) => o.refunds.some(test);

/** Queues grouped by who works them. Admin sees every group; Operator / CSKH see theirs + "Theo dõi". */
const GROUPS: readonly QueueGroup[] = [
  {
    owner: 'Operator',
    title: 'Xưởng · Operator',
    tab: 'Xưởng',
    who: 'Operator',
    queues: [
      { key: 'review', label: 'Chờ duyệt thiết kế', hint: 'Xem bản thiết kế final rồi Duyệt hoặc Yêu cầu khách sửa (FR-OT-15).', match: (o) => o.status === 'Pending_Review' && !isOnHold(o) },
      { key: 'confirm', label: 'Chờ sản xuất / đóng gói', hint: 'Đơn đã xác nhận. Hàng thiết kế vào mẻ 16:00; hàng có sẵn đóng gói ngay. Đơn COD bị khóa trong 30 phút đổi ý.', match: (o) => o.status === 'Pending_Confirmation' && !isOnHold(o) },
      { key: 'producing', label: 'Đang sản xuất', hint: 'In xong, kiểm tra chất lượng rồi Đóng gói, hoặc In lại nếu lỗi.', match: (o) => o.status === 'In_Production' },
      { key: 'pickup', label: 'Chờ bàn giao vận chuyển', hint: 'Đã đóng gói, chờ đơn vị vận chuyển lấy hàng.', match: (o) => o.status === 'Ready_for_Pickup' },
    ],
  },
  {
    owner: 'CSKH',
    title: 'Chăm sóc khách hàng · CSKH',
    tab: 'Chăm sóc khách',
    who: 'CSKH',
    queues: [
      { key: 'cancel', label: 'Yêu cầu hủy', hint: 'Phản hồi trong 1 ngày làm việc. Đơn bị giữ cho tới khi có quyết định (FR-OT-19).', match: (o) => !!pendingCancelRequest(o) },
      { key: 'tickets', label: 'Báo sự cố / khiếu nại', hint: 'Khách báo sự cố sau khi nhận, hoặc không đồng ý nguyên nhân giao thất bại.', match: (o) => !!openTicket(o) },
      { key: 'failed', label: 'Giao thất bại', hint: 'Theo dõi đơn giao không thành công: hàng về kho, khách chọn giao lại hoặc hủy.', match: (o) => o.status === 'Delivery_Failed' },
      { key: 'designFix', label: 'Khách đang sửa thiết kế', hint: 'Thiết kế bị từ chối, chờ khách sửa (tối đa 7 ngày, 2 lần).', match: (o) => o.status === 'Action_Required' },
    ],
  },
  {
    owner: 'Admin',
    title: 'Hoàn tiền · Admin',
    tab: 'Hoàn tiền',
    who: 'Admin',
    queues: [
      { key: 'refundApprove', label: 'Chờ duyệt hoàn tiền', hint: 'Đối chiếu tài khoản (đứng tên người thanh toán) rồi duyệt.', match: (o) => hasRefund(o, (r) => r.status === 'Pending_Approval' && !!r.refundMethod) },
      { key: 'refundTransfer', label: 'Đang chuyển khoản', hint: 'Chuyển khoản nội dung "HOAN <mã đơn>", rồi nhập mã giao dịch ngân hàng.', match: (o) => hasRefund(o, (r) => ['Processing', 'Refund_Pending_Retry', 'Refund_Pending_Manual'].includes(r.status)) },
      { key: 'refundWaiting', label: 'Chờ khách nhập tài khoản', hint: 'Khách chưa cung cấp tài khoản nhận hoàn. Nhắc ngày 3, chuyển CSKH ngày 7.', match: (o) => hasRefund(o, (r) => r.status === 'Pending_Approval' && !r.refundMethod) },
    ],
  },
  {
    owner: 'All',
    title: 'Theo dõi',
    tab: 'Theo dõi',
    who: 'Mọi vai trò',
    queues: [
      { key: 'late', label: 'Trễ hẹn', hint: 'Đơn quá giới hạn thời gian ở bất kỳ bước nào. Xử lý trước.', match: (o, now) => lateness(o, now) !== null },
      { key: 'transit', label: 'Đang giao', hint: 'Đơn vị vận chuyển đang giao.', match: (o) => o.status === 'In_Transit' },
      { key: 'delivered', label: 'Đã giao, chờ khách xác nhận', hint: 'Tự hoàn tất sau 72 giờ nếu khách không xác nhận (tạm dừng khi có khiếu nại).', match: (o) => o.status === 'Delivered' },
      { key: 'all', label: 'Tất cả đơn', hint: 'Tra cứu mọi đơn hàng.', match: () => true },
    ],
  },
];

const ROLE_OWNER: Record<StaffRole, Owner> = { Operator: 'Operator', CSKH: 'CSKH', Admin: 'Admin' };

/**
 * Back office for Quản lý đơn hàng (/admin/order-tracking).
 * - Queues are grouped by who works them; Admin sees and can act on every group (M8).
 * - The order panel shows the same progress bar the customer sees, then "Bước tiếp theo" with the
 *   actions allowed for the order's current state.
 * - Admin gets a per-order simulation panel (carrier events, time travel) that writes to the database,
 *   so the customer page changes the same way (both pages reload on every change).
 */
@Component({
  selector: 'app-admin-orders',
  imports: [DatePipe, RouterLink, StatusBadge, OrderTimeline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-orders.html',
})
export class AdminOrders {
  private readonly service = inject(OrderTrackingService);
  private readonly clock = inject(Clock);
  private readonly session = inject(StaffSession);
  private readonly route = inject(ActivatedRoute);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnSecondary = BTN_SECONDARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly field = FIELD;
  protected readonly formatVnd = formatVnd;
  protected readonly formatShortDate = formatShortDate;
  protected readonly violationGroups = VIOLATION_GROUPS;
  protected readonly reasonLabels = CANCEL_REASON_LABELS;
  protected readonly failureCauses = Object.entries(FAILURE_CAUSES).map(([key, v]) => ({ key: key as FailureCause, label: `${v.label} (${v.party === 'Customer' ? 'lỗi khách' : v.party === 'Carrier' ? 'lỗi vận chuyển' : 'lỗi shop'})` }));

  /** Real role from profiles.role (Admin = every role). */
  protected readonly role = computed<StaffRole>(() => this.session.dbRole() ?? this.session.role() ?? 'Operator');
  protected readonly isAdmin = computed(() => this.role() === 'Admin');
  protected can(owner: Owner): boolean {
    return owner === 'All' || this.isAdmin() || ROLE_OWNER[this.role()] === owner;
  }

  protected readonly now = computed(() => this.clock.nowSignal());
  protected readonly syncedAt = this.service.syncedAt;
  protected readonly groups = computed(() => GROUPS.filter((g) => this.can(g.owner)));
  private readonly allQueues = computed(() => this.groups().flatMap((g) => g.queues));
  /** Workspace tab (Xưởng / CSKH / Hoàn tiền / Theo dõi); its queues fill the first column. */
  protected readonly workspaceKey = signal<Owner | ''>('');
  protected readonly workspace = computed(() => this.groups().find((g) => g.owner === this.workspaceKey()) ?? this.groups()[0]);
  protected readonly queueKey = signal<string>('');
  protected readonly queue = computed(() => this.allQueues().find((q) => q.key === this.queueKey()) ?? this.allQueues()[0]);
  protected readonly search = signal('');

  private readonly sorted = computed(() => [...this.service.orders()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  protected readonly counts = computed(() => {
    const now = this.now();
    return Object.fromEntries(this.allQueues().map((q) => [q.key, this.sorted().filter((o) => q.match(o, now)).length])) as Record<string, number>;
  });
  protected readonly rows = computed(() => {
    const now = this.now();
    const q = this.search().trim().toLowerCase();
    // Searching looks through every order, not only the open queue.
    const base = q ? this.sorted() : this.sorted().filter((o) => this.queue().match(o, now));
    const list = q ? base.filter((o) => o.orderCode.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerEmail.toLowerCase().includes(q)) : base;
    if (q || this.queue().key === 'all') return [...list].reverse();
    return [...list].sort((a, b) => Number(!!lateness(b, now)) - Number(!!lateness(a, now)));
  });

  /** Work waiting in a tab: every queue for the role tabs, only late orders for "Theo dõi". */
  protected readonly tabCounts = computed(() => {
    const c = this.counts();
    return Object.fromEntries(
      this.groups().map((g) => [g.owner, g.owner === 'All' ? c['late'] ?? 0 : g.queues.reduce((n, q) => n + (c[q.key] ?? 0), 0)]),
    ) as Record<string, number>;
  });

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => {
    const id = this.selectedId();
    return (id && this.service.orders().find((o) => o.id === id)) || this.rows()[0] || null;
  });
  /** The order still shown on the right after an action moved it out of the open queue. */
  protected readonly selectedLeftQueue = computed(() => {
    const o = this.selected();
    return !!o && !this.rows().some((r) => r.id === o.id);
  });
  protected readonly selectedIndex = computed(() => this.rows().findIndex((r) => r.id === this.selected()?.id));

  // form inputs (reset when the selected order changes)
  protected readonly violation = signal<string>(VIOLATION_GROUPS[0]);
  protected readonly note = signal('');
  protected readonly bankRef = signal('');
  protected readonly cause = signal<FailureCause>('Customer_Unreachable');
  protected readonly busy = signal(false);
  protected readonly flash = signal<{ ok: boolean; text: string } | null>(null);

  constructor() {
    // ?q=CODE (link from the simulator) opens that order straight away.
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.search.set(q);
    // Open the first queue that has work, once the orders are in.
    effect(() => {
      if (this.queueKey() || !this.service.ready()) return;
      const c = this.counts();
      const group = this.groups().find((g) => g.owner !== 'All' && g.queues.some((q) => c[q.key] > 0)) ?? this.groups().find((g) => g.owner === 'All');
      untracked(() => {
        const keep = this.search();
        if (group) this.openWorkspace(group.owner);
        this.search.set(keep); // keep the ?q= search from the simulator link
      });
    });
    effect(() => {
      this.selected()?.id;
      untracked(() => {
        this.note.set('');
        this.bankRef.set('');
      });
    });
  }

  protected openWorkspace(owner: Owner): void {
    const g = this.groups().find((x) => x.owner === owner);
    if (!g) return;
    const c = this.counts();
    this.workspaceKey.set(owner);
    this.openQueue((g.queues.find((q) => q.key !== 'all' && c[q.key] > 0) ?? g.queues[0]).key);
  }

  /** Up / down arrows move through the order list. */
  protected step(delta: number): void {
    const rows = this.rows();
    if (!rows.length) return;
    const i = Math.min(rows.length - 1, Math.max(0, this.selectedIndex() + delta));
    this.selectedId.set(rows[i].id);
    queueMicrotask(() => document.getElementById('ot-row-' + rows[i].id)?.focus());
  }

  protected openQueue(key: string): void {
    this.queueKey.set(key);
    this.search.set('');
    this.selectedId.set(null);
  }

  protected refresh(): void {
    this.service.refresh();
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
  protected batchDay(o: Order): string {
    return formatDayLabel(productionDueDate(o));
  }
  protected codLocked(o: Order): boolean {
    return o.paymentMethod === 'COD' && o.status === 'Pending_Confirmation' && codWindowOpen(o, this.now());
  }
  protected request(o: Order) {
    return pendingCancelRequest(o);
  }
  protected requestOverdue(o: Order): boolean {
    const r = pendingCancelRequest(o);
    return !!r && this.now().getTime() > new Date(r.slaDueAt).getTime();
  }
  protected ticket(o: Order) {
    return openTicket(o);
  }
  protected failure(o: Order): string {
    const c = o.failureCause;
    return c ? FAILURE_CAUSES[c].label : '';
  }
  protected party(o: Order): string {
    const p = faultParty(o);
    return p === 'Customer' ? 'lỗi khách' : p === 'Carrier' ? 'lỗi vận chuyển' : p === 'Shop' ? 'lỗi shop' : '';
  }
  protected refundLabel(r: RefundRequest): string {
    return refundStatusLabel(r);
  }
  protected refundTone(r: RefundRequest): string {
    return TONE_CLASSES[REFUND_TONE[r.status]].badge;
  }
  protected actorLabel(a: string): string {
    return ({ Customer: 'Khách', Operator: 'Operator', CustomerService: 'CSKH', Admin: 'Admin', System: 'Hệ thống', Carrier: 'Vận chuyển' } as Record<string, string>)[a] ?? a;
  }
  protected reviewOverdue(o: Order): boolean {
    return o.status === 'Pending_Review' && !!o.reviewQueuedAt && this.now().getTime() - new Date(o.reviewQueuedAt).getTime() > DELIVERY_CONFIG.moderationSlaHours * HOUR;
  }
  protected newestLogs(o: Order) {
    return [...o.logs].reverse();
  }

  /** Carrier events that make sense for the order right now (FR-OT-07). */
  protected carrierEvents(o: Order): readonly { type: ShipmentEventType; label: string }[] {
    switch (o.status) {
      case 'Ready_for_Pickup':
        return [{ type: 'In_Transit', label: 'Hãng đã lấy hàng (Đang giao)' }];
      case 'In_Transit':
        return [{ type: 'Delivered', label: 'Giao thành công' }];
      case 'Delivery_Failed':
        return o.warehouseHold ? [] : [{ type: 'Warehouse_Received', label: 'Hàng đã về kho' }];
      default:
        return [];
    }
  }

  /** Time jumps that trigger something for this order (jobs run right after). */
  protected timeJumps(o: Order): readonly { minutes: number; label: string }[] {
    const out: { minutes: number; label: string }[] = [];
    if (this.codLocked(o)) out.push({ minutes: 31, label: '+30 phút · hết thời gian đổi ý COD' });
    if (o.status === 'Pending_Confirmation' && o.hasCustomItem) out.push({ minutes: 24 * 60, label: '+1 ngày · qua mẻ 16:00' });
    if (this.request(o)) out.push({ minutes: 24 * 60, label: '+1 ngày · yêu cầu hủy quá hạn' });
    if (o.status === 'Action_Required') out.push({ minutes: 3 * 24 * 60, label: '+3 ngày · nhắc khách sửa' }, { minutes: 7 * 24 * 60 + 5, label: '+7 ngày · tự hủy, hoàn 100%' });
    if (o.status === 'Delivered') out.push({ minutes: 72 * 60 + 1, label: '+72 giờ · tự hoàn tất' });
    if (o.status === 'Delivery_Failed' && o.warehouseHold && !o.warehouseHold.disputed) out.push({ minutes: 14 * 24 * 60 + 5, label: '+14 ngày · hết hạn lưu kho' });
    if (hasRefund(o, (r) => r.status === 'Pending_Approval' && !r.refundMethod)) out.push({ minutes: 3 * 24 * 60 + 5, label: '+3 ngày · nhắc nhập tài khoản' }, { minutes: 7 * 24 * 60 + 5, label: '+7 ngày · chuyển CSKH liên hệ' });
    out.push({ minutes: 60, label: '+1 giờ' });
    return out;
  }

  protected readonly actor = computed<Actor>(() => {
    switch (this.role()) {
      case 'Admin':
        return { type: 'Admin', id: 'admin' };
      case 'CSKH':
        return { type: 'CustomerService', id: 'cskh' };
      default:
        return { type: 'Operator', id: 'operator' };
    }
  });

  // ------------------------------------------------------------ actions
  protected approve(o: Order): void {
    void this.run(this.service.moderateDesign(o.id, 'Approved', { violationGroup: '', reason: '' }, this.actor()), `${o.orderCode}: đã duyệt thiết kế, chờ mẻ sản xuất`);
  }
  protected reject(o: Order): void {
    void this.run(this.service.moderateDesign(o.id, 'Rejected', { violationGroup: this.violation(), reason: this.note() }, this.actor()), `${o.orderCode}: đã gửi yêu cầu chỉnh sửa cho khách`);
  }
  protected async startProduction(): Promise<void> {
    this.busy.set(true);
    const r = await this.service.closeBatch(this.actor());
    this.busy.set(false);
    this.flash.set(r.error ? { ok: false, text: r.error.message } : { ok: true, text: `Đã đưa ${r.data.count} đơn vào sản xuất.` });
  }
  protected pack(o: Order): void {
    void this.run(this.service.markPacked(o.id, this.actor()), `${o.orderCode}: đã đóng gói, chờ bàn giao vận chuyển`);
  }
  protected reprint(o: Order): void {
    void this.run(this.service.markQcReprint(o.id, this.actor()), `${o.orderCode}: in lại do lỗi QC, ngày giao lùi 1 ngày làm việc`);
  }
  protected decideCancel(o: Order, accept: boolean): void {
    void this.run(this.service.decideCancelRequest(o.id, accept, this.note(), this.actor()), `${o.orderCode}: ${accept ? 'đã chấp nhận' : 'đã từ chối'} yêu cầu hủy`);
  }
  protected resolveTicket(o: Order, resolution: Resolution): void {
    void this.run(this.service.applyComplaintResult(o.id, resolution, this.note(), this.actor()), `${o.orderCode}: đã trả kết quả cho khách`);
  }
  protected resolveDispute(o: Order, customerRight: boolean): void {
    void this.run(this.service.resolveDispute(o.id, customerRight, this.note(), this.actor()), `${o.orderCode}: đã kết luận khiếu nại giao hàng`);
  }
  protected approveRefund(o: Order, r: RefundRequest): void {
    void this.run(this.service.approveRefund(o.id, r.id, this.actor()), `${o.orderCode}: đã duyệt hoàn ${formatVnd(r.amount)}, chờ chuyển khoản`);
  }
  protected rejectRefund(o: Order, r: RefundRequest): void {
    void this.run(this.service.rejectRefund(o.id, r.id, this.note(), this.actor()), `${o.orderCode}: đã từ chối hoàn tiền`);
  }
  protected completeRefund(o: Order, r: RefundRequest): void {
    void this.run(this.service.completeRefund(o.id, r.id, this.bankRef(), this.actor()), `${o.orderCode}: đã ghi nhận chuyển khoản`);
  }
  protected transferFailed(o: Order, r: RefundRequest): void {
    void this.run(this.service.markTransferFailed(o.id, r.id, this.actor()), `${o.orderCode}: chuyển khoản lỗi, đã báo khách kiểm tra tài khoản`);
  }
  protected retryTransfer(o: Order, r: RefundRequest): void {
    void this.run(this.service.retryTransfer(o.id, r.id, this.actor()), `${o.orderCode}: chuyển khoản lại`);
  }
  // simulation (Admin)
  protected carrier(o: Order, type: ShipmentEventType): void {
    void this.run(this.service.applyWebhook(o.id, type, type === 'Delivery_Failed' ? { failureCause: this.cause() } : {}), `${o.orderCode}: mô phỏng vận chuyển “${type}”`);
  }
  protected travel(o: Order, minutes: number, label: string): void {
    void this.run(this.service.simTimeTravel(o.id, minutes), `${o.orderCode}: đã tua ${label.split('·')[0].trim()} và chạy tiến trình nền`);
  }

  private async run(pending: { error: { message: string } | null } | Promise<{ error: { message: string } | null }>, text: string): Promise<void> {
    this.busy.set(true);
    const r = await pending;
    this.busy.set(false);
    this.flash.set(r.error ? { ok: false, text: r.error.message } : { ok: true, text });
    if (!r.error) this.note.set('');
  }
}
