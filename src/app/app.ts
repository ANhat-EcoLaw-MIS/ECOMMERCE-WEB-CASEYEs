import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

import { Header } from './core/layout/header/header';
import { Footer } from './core/layout/footer/footer';
import { Notification } from './shared/ui/notification/notification';
import { NotificationManager } from './shared/ui/notification/notification.manager';
import { AuthDialog } from './features/auth/auth-dialog';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, Notification, AuthDialog],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  notificationManager = inject(NotificationManager);
  // TODO(cart team): replace with a computed() from the CartService
  protected readonly cartCount = signal(0);

  // Full-screen Canvas workspace (hide global website header and footer on /design-studio/editor, like Canva/Figma)
  protected readonly isCanvasEditor = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.includes('/design-studio/editor') || e.url.includes('/design-studio/editor')),
      startWith(typeof window !== 'undefined' ? window.location.pathname.includes('/design-studio/editor') : false)
    ),
    { initialValue: typeof window !== 'undefined' ? window.location.pathname.includes('/design-studio/editor') : false }
  );

  protected onSearchRequested(): void {
    // TODO(search): open the search overlay
  }
}
