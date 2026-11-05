import {ChangeDetectionStrategy, Component, computed, inject, input, output, signal} from '@angular/core';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {NAV_ITEMS} from './nav-items';
import {NotificationManager} from '../../../shared/ui/notification/notification.manager';
import {SupabaseAuthService} from '../../supabase/supabase-auth.service';
import {AuthModal} from '../../auth/auth-modal';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class Header {
  private readonly router = inject(Router);
  protected readonly auth = inject(SupabaseAuthService);
  private readonly notifications = inject(NotificationManager);
  private readonly authModal = inject(AuthModal);
  /** Number of items in the cart. Provided by the parent. */
  readonly cartCount = input(0);

  /** Fires when the user wants to search (click or Ctrl/Cmd + K). */
  readonly searchRequested = output<void>();

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
      this.router.navigate(['/cart']);
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

  onSignOut(): void {
    this.auth.signOut().then((r) => {
      if (!r.error){
        this.router.navigate(['/'])
        this.notifications.show({
          variant: "information",
          title: "Thông tin",
          message: "Đăng xuất thành công",
        })
      } else {
        this.notifications.show({
          variant: "error",
          title: "Gặp chút lỗi rồi!",
          message: `${r.error.code}: ${r.error.message} - Hãy liên hệ với chăm sóc khách hàng để được hỗ trợ sớm nhất.`,
        })
      }
      })
  }
}
