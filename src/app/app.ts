import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthDialog } from './features/auth/auth-dialog';
import { Notification } from './shared/ui/notification/notification';
import { NotificationManager } from './shared/ui/notification/notification.manager';
import { ToastList } from './features/account/components/toast-list/toast-list';
import { LoadingHost } from './shared/ui/loading/loading-host';
import { RouteProgress } from './shared/ui/loading/route-progress';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Notification, AuthDialog, ToastList, LoadingHost, RouteProgress],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly notificationManager = inject(NotificationManager);
}
