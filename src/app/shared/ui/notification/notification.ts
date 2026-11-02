import { Component, input, output, computed } from '@angular/core';
import {ButtonComponent} from '../button/button';

export type NotificationVariant = 'information' | 'warning' | 'error' | 'functional';

export interface NotificationPayload {
  id: string;
  variant: NotificationVariant;
  title: string;
  message: string;
  actionLabel?: string;
  duration?: number;
}

@Component({
  selector: 'app-notification',
  imports: [ButtonComponent],
  standalone: true,
  templateUrl: './notification.html',
  styleUrls: ['./notification.scss'],
})
export class Notification {
  payload = input.required<NotificationPayload>();

  actionClicked = output<string>();
  dismissed = output<string>();

  isFunctional = computed(() => this.payload().variant === 'functional');

  onAction() {
    this.actionClicked.emit(this.payload().id);
  }

  onDismiss() {
    this.dismissed.emit(this.payload().id);
  }
}
