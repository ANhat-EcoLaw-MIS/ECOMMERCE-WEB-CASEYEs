import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { Order } from '../../models/order-tracking.model';
import { OrderTrackingService } from '../../services/order-tracking.service';
import { OtModal } from '../ot-modal/ot-modal';
import { BTN_GHOST, BTN_PRIMARY, FIELD } from '../ui';

/** UC-OT-03 extension 7.1: 1–5 stars + comment; "Bỏ qua" keeps the invite for later. */
@Component({
  selector: 'app-review-dialog',
  imports: [OtModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ot-modal [open]="open()" title="Đánh giá sản phẩm" (closed)="skip()">
      <p class="text-sm text-ink-soft">Cảm ơn bạn đã mua hàng! Chất lượng in và cảm giác cầm có như mong đợi không?</p>
      <div class="mt-4 flex justify-center gap-1" role="radiogroup" aria-label="Số sao">
        @for (s of [1, 2, 3, 4, 5]; track s) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="stars() === s"
            [attr.aria-label]="s + ' sao'"
            (click)="stars.set(s)"
            class="grid size-11 place-items-center rounded-full text-3xl transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand-400 motion-reduce:transition-none"
            [class.text-brand-400]="s <= stars()"
            [class.text-line]="s > stars()"
          >
            ★
          </button>
        }
      </div>
      <label class="mt-4 block">
        <span class="sr-only">Nhận xét</span>
        <textarea rows="3" [class]="field" placeholder="Độ sắc nét hình in, cảm giác cầm nắm…" [value]="comment()" (input)="comment.set($any($event.target).value)"></textarea>
      </label>
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" [class]="btnGhost" (click)="skip()">Bỏ qua</button>
        <button type="button" [class]="btnPrimary" (click)="send()">Gửi đánh giá</button>
      </div>
    </app-ot-modal>
  `,
})
export class ReviewDialog {
  readonly order = input.required<Order>();
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly service = inject(OrderTrackingService);
  private readonly toast = inject(NotificationManager);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly field = FIELD;
  protected readonly stars = signal(5);
  protected readonly comment = signal('');

  protected send(): void {
    const r = this.service.submitReview(this.order().id, this.stars(), this.comment());
    if (!r.error) this.toast.show({ variant: 'functional', title: 'Cảm ơn bạn!', message: 'Đánh giá của bạn đã được ghi nhận.' });
    this.closed.emit();
  }

  protected skip(): void {
    if (this.order().reviewInvitePending) this.service.dismissReviewInvite(this.order().id);
    this.closed.emit();
  }
}
