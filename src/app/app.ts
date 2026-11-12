import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthDialog } from './features/auth/auth-dialog';
import { Notification } from './shared/ui/notification/notification';
import { NotificationManager } from './shared/ui/notification/notification.manager';
import { ToastList } from './features/account/components/toast-list/toast-list';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Notification, AuthDialog, ToastList],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly notificationManager = inject(NotificationManager);
}
