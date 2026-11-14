import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CartState } from './core/cart-state/cart-state';
import { Header } from './core/layout/header/header';
import { Footer } from './core/layout/footer/footer';
import { SupportChat } from './core/support-chat/support-chat';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, SupportChat],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly cartCount = inject(CartState).itemCount;

  protected onSearchRequested(): void {
    // TODO(search): open the search overlay
  }
}
