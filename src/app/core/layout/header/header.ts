import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {NAV_ITEMS} from './nav-items';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class Header {
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
}
