import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../components/status-badge/status-badge';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL } from '../components/ui';
import { DELIVERY_CONFIG, FAILURE_CAUSES, FAULT_PARTY_LABELS, VIOLATION_GROUPS } from '../config/delivery-config';
import { REFUND_TONE, TONE_CLASSES } from '../config/status-style';
import { formatShortDate } from '../domain/calendar';
import { computeEdd } from '../domain/edd';
import { Actor } from '../domain/order-mutations';
import { faultParty, isOrderOpen } from '../domain/order-rules';
import { formatVnd, quoteShipping } from '../domain/shipping-fee';
import {
  FailureCause,
  Order,
  PaymentMethod,
  RefundRequest,
  Resolution,
  ShipmentEventType,
  ShippingTier,
  TargetService,
  Zone,
} from '../models/order-tracking.model';
import { Clock } from '../services/clock';
import { DEMO_TEMPLATES, DemoOrderFactory, DemoTemplate } from '../services/demo-order-factory';
import { DemoRole, DemoSettings } from '../services/demo-settings';
import { OrderRepository } from '../services/order.repository';
import { OrderTrackingService } from '../services/order-tracking.service';
import { JOB_LABELS, JobId, ScheduledJobs } from '../services/scheduled-jobs';

interface ActivityEntry {
  readonly at: string;
  readonly ok: boolean;
  readonly text: string;
}

const HOUR = 3_600_000;

/**
 * Demo Console (v5 FR-OT-07): a testing tool, NOT part of the product. It stands in for the
 * missing Payment (create order), Operator/Admin back office, Mock 3PL, Epic 6 and pg_cron,
 * so the customer tab can be demoed end-to-end. Open it next to the customer tab.
 */
@Component({
  selector: 'app-demo-console',
  imports: [DatePipe, RouterLink, ReactiveFormsModule, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demo-console.html',
})
export class DemoConsole {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(OrderTrackingService);
  private readonly factory = inject(DemoOrderFactory);
  private readonly jobs = inject(ScheduledJobs);
  private readonly repo = inject(OrderRepository);
  protected readonly clock = inject(Clock);
  protected readonly demo = inject(DemoSettings);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnSecondary = BTN_SECONDARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly field = FIELD;
  protected readonly label = LABEL;
  protected readonly formatVnd = formatVnd;
  protected readonly formatShortDate = formatShortDate;

  protected readonly templates = Object.entries(DEMO_TEMPLATES).map(([key, v]) => ({ key: key as DemoTemplate, label: v.label }));
  protected readonly zones: Zone[] = ['Z1', 'Z2', 'Z3'];
  protected readonly zoneLabels = DELIVERY_CONFIG.zoneLabels;
  protected readonly failureCauses = Object.entries(FAILURE_CAUSES).map(([key, v]) => ({
    key: key as FailureCause,
    label: `${v.label} (${FAULT_PARTY_LABELS[v.party]})`,
  }));
  protected readonly violationGroups = VIOLATION_GROUPS;
  protected readonly jobIds = Object.keys(JOB_LABELS) as JobId[];
  protected readonly jobLabels = JOB_LABELS;
  protected readonly targets: { key: TargetService; label: string }[] = [
    { key: 'Shopping', label: 'Shopping (RiskProfile)' },
    { key: 'Loyalty', label: 'Loyalty (Epic 9)' },
    { key: 'Notification', label: 'Notification Service' },
    { key: 'CustomerService', label: 'CSKH (Epic 6)' },
    { key: 'Payment', label: 'Payment (QR cước giao lại)' },
  ];
  protected readonly minutesOptions = [
    { v: 0, l: 'Vừa đặt' },
    { v: 10, l: '10 phút trước' },
    { v: 29, l: '29 phút trước' },
    { v: 35, l: '35 phút trước' },
    { v: 120, l: '2 giờ trước' },
    { v: 60 * 26, l: '26 giờ trước' },
  ];

  // ------------------------------------------------------------ create order
  protected readonly createForm = this.fb.group({
    template: this.fb.control<DemoTemplate>('custom_upload'),
    paymentMethod: this.fb.control<PaymentMethod>('QR_Transfer'),
    zone: this.fb.control<Zone>('Z1'),
    tier: this.fb.control<ShippingTier>('Standard'),
    minutesAgo: 0,
  });
  private readonly createValue = toSignal(this.createForm.valueChanges, { initialValue: this.createForm.getRawValue() });
  protected readonly codAllowed = computed(() => this.createValue().template === 'stock');
  protected readonly preview = computed(() => {
    const v = { ...this.createForm.getRawValue(), ...this.createValue() };
    const items = DEMO_TEMPLATES[v.template].items;
    const goods = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const hasCustom = items.some((i) => i.isCustom);
    const placedAt = new Date(this.clock.nowSignal().getTime() - v.minutesAgo * 60_000);
    const quote = quoteShipping(v.zone, v.tier, goods);
    const edd = computeEdd({ placedAt, hasCustomItem: hasCustom, zone: v.zone, tier: v.tier });
    return { goods, quote, edd, placedAt };
  });

  // ------------------------------------------------------------ orders
  protected readonly orders = computed(() => [...this.service.orders()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => {
    const id = this.selectedId();
    return this.orders().find((o) => o.id === id) ?? this.orders()[0] ?? null;
  });
  protected readonly actor = computed<Actor>(() => ({
    type: this.demo.role(),
    id: this.demo.role() === 'Admin' ? 'admin-01' : 'operator-01',
  }));
  private readonly cskh: Actor = { type: 'CustomerService', id: 'cskh-01' };

  protected readonly db = this.repo.state;
  protected readonly inbox = computed(() => [...this.db().inbox].reverse().slice(0, 30));
  protected readonly webhookLog = computed(() => [...this.db().webhookEvents].reverse().slice(0, 15));
  protected readonly outbound = computed(() => [...this.db().outbound].reverse().slice(0, 15));
  protected readonly activity = signal<readonly ActivityEntry[]>([]);
  protected readonly lastEventId = signal<{ orderId: string; type: ShipmentEventType; eventId: string; cause?: FailureCause } | null>(null);
  protected readonly openOrdersCheck = signal<string | null>(null);

  // per-action inputs
  protected readonly failureCause = signal<FailureCause>('Customer_Unreachable');
  protected readonly violation = signal<string>(VIOLATION_GROUPS[0]);
  protected readonly rejectReason = signal('');
  protected readonly complaintNote = signal('');
  protected readonly bankRefs = signal<Record<string, string>>({});
  protected readonly refundRejectReason = signal('');

  protected readonly simTime = computed(() => this.clock.nowSignal());
  protected readonly offsetLabel = computed(() => {
    const ms = this.clock.offsetMs();
    if (Math.abs(ms) < 60_000) return 'Giờ thật';
    const h = ms / HOUR;
    return h >= 24 ? `+${(h / 24).toFixed(1)} ngày` : `+${h.toFixed(1)} giờ`;
  });

  // ------------------------------------------------------------ helpers for the template
  protected cancelWindowLeft(o: Order): string | null {
    if (o.status !== 'Pending_Confirmation') return null;
    const ms = new Date(o.createdAt).getTime() + DELIVERY_CONFIG.cancelWindowMinutes * 60_000 - this.simTime().getTime();
    return ms > 0 ? `${Math.ceil(ms / 60_000)} phút` : null;
  }

  protected reviewOverdue(o: Order): boolean {
    return (
      o.status === 'Pending_Review' &&
      !!o.reviewQueuedAt &&
      this.simTime().getTime() - new Date(o.reviewQueuedAt).getTime() > DELIVERY_CONFIG.moderationSlaHours * HOUR
    );
  }

  protected party(o: Order): string {
    const p = faultParty(o);
    return p ? FAULT_PARTY_LABELS[p] : '';
  }

  protected isOpen(o: Order): boolean {
    return isOrderOpen(o);
  }

  protected openTicket(o: Order) {
    return o.tickets.find((t) => t.open);
  }

  protected refundTone(r: RefundRequest): string {
    return TONE_CLASSES[REFUND_TONE[r.status]].badge;
  }

  protected setBankRef(id: string, value: string): void {
    this.bankRefs.update((m) => ({ ...m, [id]: value }));
  }

  // ------------------------------------------------------------ actions
  protected setRole(role: DemoRole): void {
    this.demo.patch({ role });
  }

  protected advance(hours: number): void {
    this.clock.advance(hours * HOUR);
    this.log(true, `Tua giờ +${hours >= 24 ? `${hours / 24} ngày` : `${hours} giờ`} → ${this.clock.now().toLocaleString('vi-VN')}`);
  }

  protected jumpTo16(): void {
    this.clock.jumpToTodayAt(16, 0);
    this.log(true, `Tua tới 16:00 → ${this.clock.now().toLocaleString('vi-VN')}`);
  }

  protected resetClock(): void {
    this.clock.reset();
    this.log(true, 'Về giờ thật');
  }

  protected createOrder(): void {
    const v = this.createForm.getRawValue();
    const paymentMethod = v.template === 'stock' ? v.paymentMethod : 'QR_Transfer';
    const r = this.factory.create({ ...v, paymentMethod });
    if (r.error) return this.log(false, r.error.message);
    this.selectedId.set(r.data.id);
    this.log(true, `Tạo đơn ${r.data.orderCode} (${DEMO_TEMPLATES[v.template].label}, ${paymentMethod === 'COD' ? 'COD' : 'trả trước'}, ${v.zone}/${v.tier === 'Fast' ? 'Giao nhanh' : 'Standard'}) – EDD ${formatShortDate(r.data.earliestEDD)}–${formatShortDate(r.data.latestEDD)}`);
  }

  protected moderate(o: Order, approve: boolean): void {
    const r = this.service.moderateDesign(
      o.id,
      approve ? 'Approved' : 'Rejected',
      { violationGroup: this.violation(), reason: this.rejectReason() },
      this.actor(),
    );
    this.report(r, `${o.orderCode}: ${approve ? 'duyệt thiết kế' : 'từ chối thiết kế'}`);
    if (!r.error) this.rejectReason.set('');
  }

  protected closeBatch(): void {
    const r = this.service.closeBatch(this.actor());
    if (r.error) return this.log(false, r.error.message);
    const groups = Object.entries(r.data.groups).map(([m, n]) => `${m}: ${n}`).join(', ');
    this.log(true, `Chốt mẻ: ${r.data.count} đơn vào In_Production (gom theo dòng máy – ${groups})`);
  }

  protected pack(o: Order): void {
    this.report(this.service.markPacked(o.id, this.actor()), `${o.orderCode}: đóng gói xong`);
  }

  protected qcReprint(o: Order): void {
    this.report(this.service.markQcReprint(o.id, this.actor()), `${o.orderCode}: in lại do lỗi QC`);
  }

  protected webhook(o: Order, type: ShipmentEventType): void {
    const cause = type === 'Delivery_Failed' ? this.failureCause() : undefined;
    const r = this.service.applyWebhook(o.id, type, { failureCause: cause });
    if (r.error) return this.log(false, r.error.message);
    this.lastEventId.set({ orderId: o.id, type, eventId: r.data.eventId, cause });
    this.log(r.data.result === 'Applied', `Webhook ${type} [${r.data.eventId}] → ${r.data.result}: ${r.data.message}`);
  }

  protected replayLastWebhook(): void {
    const last = this.lastEventId();
    if (!last) return;
    const r = this.service.applyWebhook(last.orderId, last.type, { eventId: last.eventId, failureCause: last.cause });
    if (r.error) return this.log(false, r.error.message);
    this.log(r.data.result === 'Applied', `Gửi lại webhook trùng [${last.eventId}] → ${r.data.result}: ${r.data.message}`);
  }

  protected complaint(o: Order, resolution: Resolution): void {
    this.report(this.service.applyComplaintResult(o.id, resolution, this.complaintNote(), this.cskh), `${o.orderCode}: kết quả khiếu nại ${resolution}`);
    this.complaintNote.set('');
  }

  protected dispute(o: Order, customerRight: boolean): void {
    this.report(this.service.resolveDispute(o.id, customerRight, this.complaintNote(), this.cskh), `${o.orderCode}: đối soát – ${customerRight ? 'khách đúng' : 'khách sai'}`);
    this.complaintNote.set('');
  }

  protected approveRefund(o: Order, r: RefundRequest): void {
    this.report(this.service.approveRefund(o.id, r.id, this.actor()), `${o.orderCode}: duyệt hoàn ${formatVnd(r.amount)}`);
  }

  protected completeRefund(o: Order, r: RefundRequest): void {
    this.report(this.service.completeRefund(o.id, r.id, this.bankRefs()[r.id] ?? '', this.actor()), `${o.orderCode}: ghi nhận đã chuyển khoản`);
  }

  protected transferFailed(o: Order, r: RefundRequest): void {
    this.report(this.service.markTransferFailed(o.id, r.id, this.actor()), `${o.orderCode}: chuyển khoản lỗi`);
  }

  protected retryTransfer(o: Order, r: RefundRequest): void {
    this.report(this.service.retryTransfer(o.id, r.id, this.actor()), `${o.orderCode}: thử chuyển lại`);
  }

  protected rejectRefund(o: Order, r: RefundRequest): void {
    this.report(this.service.rejectRefund(o.id, r.id, this.refundRejectReason(), this.actor()), `${o.orderCode}: từ chối hoàn tiền`);
  }

  protected runJob(job: JobId): void {
    const r = this.jobs.run(job);
    this.log(true, `${JOB_LABELS[job]}: ${r.processed ? r.messages.join(' · ') : 'không có đơn đến hạn'}`);
  }

  protected runAllJobs(): void {
    this.jobs.runAll().forEach((r) => this.log(true, `${JOB_LABELS[r.job]}: ${r.processed ? r.messages.join(' · ') : 'không có đơn đến hạn'}`));
  }

  protected checkOpenOrders(): void {
    const id = this.service.customer().id;
    const r = this.service.listOpenOrders(id);
    this.openOrdersCheck.set(
      r.canDeleteAccount
        ? 'canDeleteAccount = true: không còn đơn chưa khép.'
        : `canDeleteAccount = false: ${r.openOrders.map((o) => `${o.orderCode} (${o.status})`).join(', ')}`,
    );
  }

  protected resetData(): void {
    if (!confirm('Xóa toàn bộ dữ liệu demo của Epic 5 trên trình duyệt này?')) return;
    this.repo.reset();
    this.clock.reset();
    this.activity.set([]);
    this.log(true, 'Đã xóa dữ liệu demo');
  }

  private report(r: { error: { message: string } | null }, text: string): void {
    this.log(!r.error, r.error ? `${text} – ${r.error.message}` : text);
  }

  private log(ok: boolean, text: string): void {
    this.activity.update((list) => [{ at: this.clock.nowIso(), ok, text }, ...list].slice(0, 40));
  }
}
