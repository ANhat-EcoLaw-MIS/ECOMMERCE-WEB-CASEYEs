import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';
import { CartState } from '../../cart-state/cart-state';
import { SupportChat } from '../../support-chat/support-chat';

const EDITOR_PATH = '/design-studio/editor';
const onEditor = (url: string): boolean => url.includes(EDITOR_PATH);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, Footer, SupportChat],
  selector: 'app-shell-layout',
  templateUrl: './shell-layout.html',
})
export class ShellLayout {
  private readonly router = inject(Router);
  // Shop's cart is the single cart of the site.
  protected readonly cartCount = inject(CartState).itemCount;

  /** Design Studio canvas is full screen (like Canva/Figma): hide the site header and footer there. */
  protected readonly isCanvasEditor = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => onEditor(e.urlAfterRedirects)),
    ),
    { initialValue: onEditor(this.router.url) || (typeof window !== 'undefined' && onEditor(window.location.pathname)) },
  );

  protected onSearchRequested(): void {
    // TODO(search): open the search overlay
  }
}
