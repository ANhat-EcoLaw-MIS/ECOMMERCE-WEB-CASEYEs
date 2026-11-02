import { ChangeDetectionStrategy, Component, signal, inject, resource } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from './core/layout/header/header';
import { Placeholder } from './shared/ui/placeholder/placeholder';
import {Footer} from './core/layout/footer/footer';
import {Notification} from './shared/ui/notification/notification';
import {NotificationManager} from './shared/ui/notification/notification.manager';
import {AuthDialog} from './features/auth/auth-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Placeholder, Footer, Notification, AuthDialog],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  notificationManager=inject(NotificationManager);
  // TODO(cart team): replace with a computed() from the CartService
  protected readonly cartCount = signal(0);
  protected onSearchRequested(): void {
    // TODO(search): open the search overlay
  }
}
