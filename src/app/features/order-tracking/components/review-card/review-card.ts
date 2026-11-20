import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { Order } from '../../models/order-tracking.model';
import { OrderTrackingService } from '../../services/order-tracking.service';
import { track } from '../../services/tracker';
import { BTN_GHOST, BTN_PRIMARY, FIELD } from '../ui';

/** Topics the customer can tap (P1-15): structured data, faster than typing. */
export const REVIEW_TAGS = ['Chất lượng in', 'Đúng màu', 'Chắc chắn', 'Đóng gói', 'Giao hàng'] as const;

/**
 * In-page review card after completion (P1-15). It never blocks the screen; "Để sau" hides it
 * for this visit and the invite stays for the next one.
 */
@Component({
  selector: 'app-review-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-card.html',
})
export class ReviewCard {
  readonly order = input.required<Order>();

  private readonly service = inject(OrderTrackingService);
  private readonly toast = inject(NotificationManager);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly field = FIELD;
  protected readonly tags = REVIEW_TAGS;
  protected readonly stars = signal(0);
  protected readonly picked = signal<readonly string[]>([]);
  protected readonly comment = signal('');
  protected readonly photos = signal<readonly string[]>([]);
  protected readonly hidden = signal(false);

  protected toggleTag(tag: string): void {
    this.picked.update((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]));
  }

  protected onPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.photos.set(Array.from(input.files ?? []).slice(0, 3).map((f) => f.name));
  }

  protected async send(): Promise<void> {
    if (this.stars() === 0) return;
    const r = await this.service.submitReview(this.order().id, {
      stars: this.stars(),
      tags: this.picked(),
      comment: this.comment(),
      photoNames: this.photos(),
    });
    if (r.error) {
      this.toast.show({ variant: 'warning', title: 'Chưa gửi được đánh giá', message: r.error.message });
      return;
    }
    track('rating_submitted', { stars: this.stars(), tags: this.picked() }, this.order().orderCode);
    this.toast.show({ variant: 'functional', title: 'Cảm ơn bạn!', message: 'Đánh giá của bạn đã được ghi nhận.' });
  }

  protected later(): void {
    this.hidden.set(true);
  }
}
