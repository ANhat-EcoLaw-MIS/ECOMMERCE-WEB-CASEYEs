import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PhoneModel } from '../../shared/devices/devices';
import { ShopFilters } from './services/shop-filters';
import { ACCESSORIES, ACCESSORY_CATEGORIES, type CatalogAccessory, type ShopDesign } from './catalog';
import { DeviceChipRow } from './components/device-chip-row/device-chip-row';
import { ShopToolbar } from './components/shop-toolbar/shop-toolbar';
import { FilterDrawer } from './components/filter-drawer/filter-drawer';
import { ProductCard } from './components/product-card/product-card';
import { Pagination } from './components/pagination/pagination';
import { QuickView } from './components/quick-view/quick-view';
import { AccessoryCard } from './components/accessory-card/accessory-card';
import { StudioCta } from './components/studio-cta/studio-cta';

@Component({
  selector: 'app-shop',
  imports: [RouterLink, DeviceChipRow, ShopToolbar, FilterDrawer, ProductCard, Pagination, QuickView, AccessoryCard, StudioCta],
  providers: [ShopFilters],
  templateUrl: './shop.html',
  styleUrl: './shop.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-surface' },
})
export class Shop {
  protected readonly f = inject(ShopFilters);
  protected readonly filtersOpen = signal(false);
  protected readonly quick = signal<ShopDesign | null>(null);
  protected readonly introOpen = signal(false);

  protected readonly accessoryCategories = ACCESSORY_CATEGORIES;
  protected readonly accessoryCategory = signal<CatalogAccessory['category'] | null>(null);
  protected readonly accessories = computed(() => {
    const c = this.accessoryCategory();
    return c ? ACCESSORIES.filter((a) => a.category === c) : ACCESSORIES;
  });

  protected readonly gridClass = computed(() => {
    switch (this.f.view()) {
      case 'large':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 'list':
        return 'grid-cols-1 lg:grid-cols-2';
      default:
        return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
    }
  });

  /** Bumped on every listing change so the cards re-mount and replay their entrance (images reload). */
  protected readonly renderKey = signal(0);
  private readonly listTop = viewChild<ElementRef<HTMLElement>>('listTop');
  private readonly injector = inject(Injector);

  constructor() {
    let first = true;
    effect(() => {
      this.f.listKey();
      if (first) {
        first = false;
        return;
      }
      untracked(() => {
        this.renderKey.update((k) => k + 1);
        afterNextRender(() => this.scrollToToolbar(), { injector: this.injector });
      });
    });
  }

  protected selectDevice(device: PhoneModel): void {
    this.f.set({ model: device.id });
  }

  protected goToPage(page: number): void {
    this.f.goToPage(page);
  }

  /** Smoothly brings the sort bar to its sticky position, right above the results. */
  private scrollToToolbar(): void {
    const anchor = this.listTop()?.nativeElement;
    if (!anchor || typeof window === 'undefined') return;
    const header = 64; // sticky site header (h-16)
    const top = anchor.getBoundingClientRect().top + window.scrollY - header;
    if (Math.abs(window.scrollY - top) < 8) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }
}
