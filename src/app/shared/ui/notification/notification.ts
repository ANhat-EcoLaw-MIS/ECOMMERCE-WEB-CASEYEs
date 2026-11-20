import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type NotificationVariant = 'success' | 'information' | 'warning' | 'error' | 'functional';

export interface NotificationPayload {
  id: string;
  variant: NotificationVariant;
  title: string;
  message: string;
  actionLabel?: string;
  duration?: number;
}

/** Accent per variant: icon chip, icon colour and the decaying time bar. */
const TONES: Record<NotificationVariant, { chip: string; icon: string; bar: string }> = {
  success: { chip: 'bg-success-bg', icon: 'text-success', bar: 'bg-success' },
  information: { chip: 'bg-brand-50', icon: 'text-brand-800', bar: 'bg-brand-400' },
  functional: { chip: 'bg-brand-50', icon: 'text-brand-800', bar: 'bg-brand-600' },
  warning: { chip: 'bg-state-warning-surface', icon: 'text-state-warning', bar: 'bg-state-warning' },
  error: { chip: 'bg-danger-bg', icon: 'text-danger', bar: 'bg-danger' },
};

@Component({
  selector: 'app-notification',
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Notification {
  readonly payload = input.required<NotificationPayload>();

  readonly actionClicked = output<string>();
  readonly dismissed = output<string>();

  protected readonly isFunctional = computed(() => this.payload().variant === 'functional');
  protected readonly tone = computed(() => TONES[this.payload().variant] ?? TONES.information);

  protected onAction(): void {
    this.actionClicked.emit(this.payload().id);
  }

  protected onDismiss(): void {
    this.dismissed.emit(this.payload().id);
  }
}
