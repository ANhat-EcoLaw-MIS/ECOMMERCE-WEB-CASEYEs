import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { DELIVERY_CONFIG } from '../../config/delivery-config';
import { TONE_CLASSES } from '../../config/status-style';
import { RefundChoice } from '../../domain/order-mutations';
import { formatVnd } from '../../domain/shipping-fee';
import { Order, RefundRequest, RefundSituation } from '../../models/order-tracking.model';
import { OrderTrackingService } from '../../services/order-tracking.service';
import { track } from '../../services/tracker';
import { RefundChoiceForm } from '../refund-choice-form/refund-choice-form';
import { BTN_PRIMARY } from '../ui';

type StepState = 'done' | 'current' | 'upcoming';

const SITUATION_LABELS: Record<RefundSituation, string> = {
  S1: 'Hủy đơn khi chưa vào sản xuất',
  S2: 'Thiết kế chưa đạt chính sách nội dung',
  S3a: 'Giao không thành công do vận chuyển/shop',
  S3b: 'Giao không thành công, hoàn tiền hàng trừ cước hai chiều',
  S3c: 'Không hoàn',
  S4: 'Khiếu nại được chấp nhận',
};

/**
 * "Tiến độ hoàn tiền" (FR-OT-20), shared by every refund: choose method → received, waiting
 * for confirmation → transferring → refunded (or voucher issued). No new order status.
 */
@Component({
  selector: 'app-refund-progress',
  imports: [DatePipe, RefundChoiceForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './refund-progress.html',
})
export class RefundProgress {
  readonly order = input.required<Order>();
  readonly refund = input.required<RefundRequest>();

  private readonly service = inject(OrderTrackingService);
  private readonly toast = inject(NotificationManager);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly formatVnd = formatVnd;
  protected readonly situationLabel = computed(() => SITUATION_LABELS[this.refund().situation]);
  protected readonly etaText = DELIVERY_CONFIG.refundEtaText;
  protected readonly warnBox = `rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES.warning.box}`;
  protected readonly dangerBox = `rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES.danger.box}`;
  protected readonly choice = signal<RefundChoice | null>(null);
  protected readonly busy = signal(false);

  protected readonly needsChoice = computed(() => {
    const r = this.refund();
    return (r.status === 'Pending_Approval' && !r.refundMethod) || r.status === 'Refund_Pending_Retry';
  });

  protected readonly steps = computed(() => {
    const r = this.refund();
    const chosen = !!r.refundMethod && r.status !== 'Refund_Pending_Retry';
    const transferring = ['Processing', 'Refund_Pending_Retry', 'Refund_Pending_Manual'].includes(r.status);
    const done = r.status === 'Refunded';
    const state = (isDone: boolean, isCurrent: boolean): StepState => (isDone ? 'done' : isCurrent ? 'current' : 'upcoming');
    const list: { key: string; label: string; state: StepState }[] = [
      { key: 'choose', label: 'Cung cấp tài khoản nhận hoàn', state: state(chosen || transferring || done, !chosen) },
      { key: 'received', label: 'Shop đang xác nhận', state: state(transferring || done, chosen && r.status === 'Pending_Approval') },
      { key: 'transfer', label: 'Đang chuyển khoản', state: state(done, transferring) },
      { key: 'done', label: 'Đã hoàn tiền', state: state(done, false) },
    ];
    return list;
  });

  protected submit(): void {
    const choice = this.choice();
    if (!choice || this.busy()) return;
    this.busy.set(true);
    const res = this.service.submitRefundAccount(this.order().id, this.refund().id, choice);
    this.busy.set(false);
    if (!res.error) track('refund_method_chosen', { method: choice.method }, this.order().orderCode);
    this.toast.show(
      res.error
        ? { variant: 'error', title: 'Chưa lưu được', message: res.error.message }
        : { variant: 'functional', title: 'Đã ghi nhận', message: 'Yêu cầu hoàn tiền đang chờ Admin xác nhận.' },
    );
  }
}
