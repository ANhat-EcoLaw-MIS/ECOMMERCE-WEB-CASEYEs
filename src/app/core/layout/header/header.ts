import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CartState } from '../../cart-state/cart-state';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {NAV_ITEMS} from './nav-items';
import { AuthState } from '../../auth-state/auth-state';
import { CartDrawerState } from '../../cart-state/cart-drawer-state';
import { CartDrawer } from '../../cart-state/cart-drawer';
import { OmniSearchState } from '../../search/omni-search-state';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, CartDrawer],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class Header {
  protected readonly cartState = inject(CartState);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthState);
  private readonly drawer = inject(CartDrawerState);
  protected readonly omni = inject(OmniSearchState);
  protected readonly searchOpen = signal(false);
  protected readonly draggingImage = signal(false);
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

  protected openCart(): void {
    if (!this.auth.requireLogin('/cart')) return;
    this.drawer.show();
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected openSearch(): void {
    this.closeMenu();
    this.searchOpen.set(true);
  }
  protected submitSearch(): void {
    this.searchOpen.set(false);
    void this.router.navigate(['/shop'], { queryParams: this.omni.query().trim() ? {q:this.omni.query().trim()} : {} }).then(() => {
      if(typeof document !== 'undefined')document.getElementById('discover')?.scrollIntoView({behavior:'smooth'});
    });
  }
  protected async imageSelected(event: Event): Promise<void> {
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];input.value='';
    if(await this.omni.searchByImage(file))this.submitSearch();
  }
  protected async imageDropped(event: DragEvent): Promise<void> {
    event.preventDefault();this.draggingImage.set(false);
    if(await this.omni.searchByImage(event.dataTransfer?.files?.[0]))this.submitSearch();
  }
  protected onQueryChanged(event: Event): void {this.omni.search((event.target as HTMLInputElement).value);}


  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openSearch();
    } else if (event.key === 'Escape' && this.searchOpen()) {
      this.searchOpen.set(false);
    } else if (event.key === 'Escape' && this.menuOpen()) {
      this.closeMenu();
    }
  }
}
