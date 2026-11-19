import {ChangeDetectionStrategy, Component, computed, inject, input, output, signal} from '@angular/core';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map} from 'rxjs';
import {NAV_ITEMS} from './nav-items';
import {NotificationManager} from '../../../shared/ui/notification/notification.manager';
import {SupabaseAuthService} from '../../supabase/supabase-auth.service';
import { injectSignOut } from '../../auth/sign-out';
import {AuthModal} from '../../auth/auth-modal';
import { CartState } from '../../cart-state/cart-state';
import { CartDrawerState } from '../../cart-state/cart-drawer-state';
import { CartDrawer } from '../../cart-state/cart-drawer';
import { SearchService } from '../../search/search.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, CartDrawer],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class Header {
  private readonly router = inject(Router);
  protected readonly auth = inject(SupabaseAuthService);
  private readonly notifications = inject(NotificationManager);
  private readonly authModal = inject(AuthModal);
  // Shop (Mua sắm): cart drawer and add-to-bag animation.
  protected readonly cartState = inject(CartState);
  private readonly drawer = inject(CartDrawerState);
  /** Site-wide search (overlay mounted in ShellLayout). */
  private readonly search = inject(SearchService);
  /** Number of items in the cart. Provided by the parent. */
  readonly cartCount = input(0);

  /** Fires when the user wants to search (click or Ctrl/Cmd + K). */
  readonly searchRequested = output<void>();

  /** Current URL, kept in sync with the router. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  /** On /account the page has its own tabs, so the account dropdown is turned off. */
  protected readonly onAccountPage = computed(() => {
    const path = this.currentUrl().split(/[?#]/)[0];
    return path === '/account' || path.startsWith('/account/');
  });

  protected readonly navItems = NAV_ITEMS;
  protected readonly menuOpen = signal(false);

  protected readonly hasCartItems = computed(() => this.cartCount() > 0);
  protected readonly cartBadge = computed(() => (this.cartCount() > 99 ? '99+' : String(this.cartCount())));
  protected readonly cartLabel = computed(() =>
    this.hasCartItems() ? `Giỏ hàng, ${this.cartCount()} sản phẩm` : 'Giỏ hàng',
  );

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected openSearch(): void {
    this.closeMenu();
    this.searchRequested.emit();
    this.search.open('text');
  }

  protected openSuggest(): void {
    this.closeMenu();
    this.search.open('suggest');
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openSearch();
    } else if (event.key === 'Escape' && this.menuOpen()) {
      this.closeMenu();
    }
  }

  onAccountClick(){
    if(!this.auth.isAuthenticated()){
      this.authModal.open('login');
      return;
    } else {
      this.router.navigate(['/account']);
    }
  }

  onCartClick():void {
    if (this.auth.isAuthenticated()) {
      this.drawer.show();
    } else{
      this.showLoginRequireNotif();
    }
  }

  showLoginRequireNotif(): void {
    this.notifications.show({
      variant:"functional",
      title:"Cần xác thực!",
      message: "Bạn đăng nhập vào hệ thống nhaaa",
      actionLabel: "Đăng nhập",
      onAction: () => {
        this.router.navigate(['/auth']);
      }
    })
  }

  private readonly signOut = injectSignOut();

  onSignOut(): void {
    void this.signOut();
  }
}
