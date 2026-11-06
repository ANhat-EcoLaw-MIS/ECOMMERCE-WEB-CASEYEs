import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ATTENTION_DOT } from '../../config/status-style';
import { InboxMessage } from '../../models/order-tracking.model';
import { Clock } from '../../services/clock';
import { CustomerInbox } from '../../services/customer-inbox';
import { track } from '../../services/tracker';

/** Bell with an in-app notification list (P1-16). Each item deep-links to /order-tracking/:orderCode. */
@Component({
  selector: 'app-notification-bell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative', '(document:keydown.escape)': 'open.set(false)', '(document:click)': 'onDocClick($event)' },
  templateUrl: './notification-bell.html',
})
export class NotificationBell {
  protected readonly inbox = inject(CustomerInbox);
  private readonly router = inject(Router);
  private readonly clock = inject(Clock);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly open = signal(false);
  protected readonly dot = ATTENTION_DOT;

  /** "2 giờ trước" – relative time is used only in notifications (v8 UI rule). */
  protected ago(iso: string): string {
    const min = Math.max(0, Math.round((this.clock.now().getTime() - new Date(iso).getTime()) / 60_000));
    if (min < 1) return 'Vừa xong';
    if (min < 60) return `${min} phút trước`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.round(h / 24)} ngày trước`;
  }

  protected openMessage(m: InboxMessage): void {
    this.inbox.markRead(m.id);
    this.open.set(false);
    track('notification_clicked', { type: m.title });
    void this.router.navigateByUrl(m.link);
  }

  protected onDocClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
}
