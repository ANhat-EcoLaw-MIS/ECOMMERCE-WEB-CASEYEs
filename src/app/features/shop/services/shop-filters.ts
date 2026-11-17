import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { DEFAULT_DEVICE, findDevice } from '../../../shared/devices/devices';
import { colorSkus, DESIGNS, fromPrice, pickSku, type ShopDesign } from '../catalog';

export type ShopSort = 'featured' | 'low' | 'high' | 'name';
export type ShopView = 'grid' | 'large' | 'list';

export const SORT_OPTIONS: readonly { id: ShopSort; label: string }[] = [
  { id: 'featured', label: 'Nổi bật' },
  { id: 'low', label: 'Giá thấp đến cao' },
  { id: 'high', label: 'Giá cao đến thấp' },
  { id: 'name', label: 'Tên A–Z' },
];

export const PAGE_SIZE = 12;
const BOOST: Record<string, number> = { 'BEST SELLER': 3, HOT: 2, 'NEW DROP': 2, LIMITED: 1 };

/** Keys that reset pagination when they change. */
type FilterPatch = Partial<Record<'model' | 'color' | 'style' | 'sort' | 'view' | 'q', string | null>>;

/**
 * Listing state for /shop, stored in the URL (`?model=&color=&style=&sort=&view=&page=&q=`),
 * so filters survive reloads and can be shared. Provided by the Shop page (not root), so it
 * never collides with the studio's global model selection.
 */
@Injectable()
export class ShopFilters {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly device = computed(() => findDevice(this.params().get('model')) ?? DEFAULT_DEVICE);
  /** Colours offered on the device. */
  readonly colors = computed(() => colorSkus(this.device()).map((s) => ({ name: s.colorName, hex: s.colorHex })));
  readonly color = computed(() => {
    const c = this.params().get('color');
    return c && this.colors().some((x) => x.name === c) ? c : null;
  });
  readonly style = computed(() => this.params().get('style'));
  readonly query = computed(() => (this.params().get('q') ?? '').trim());
  readonly sort = computed<ShopSort>(() => {
    const s = this.params().get('sort') as ShopSort | null;
    return s && SORT_OPTIONS.some((o) => o.id === s) ? s : 'featured';
  });
  readonly view = computed<ShopView>(() => {
    const v = this.params().get('view');
    return v === 'large' || v === 'list' ? v : 'grid';
  });

  /** SKU shown on every card for the current device / colour. */
  readonly sku = computed(() => pickSku(this.device(), this.color()));

  readonly activeCount = computed(() => [this.color(), this.style(), this.query()].filter(Boolean).length);

  readonly results = computed<readonly ShopDesign[]>(() => {
    const needle = this.query().toLocaleLowerCase('vi');
    const style = this.style();
    const device = this.device();
    const list = DESIGNS.filter(
      (d) =>
        (!style || d.style === style) &&
        (!needle || [d.name, d.collection, d.style, ...d.tags].join(' ').toLocaleLowerCase('vi').includes(needle)),
    );
    const byPrice = (a: ShopDesign, b: ShopDesign) => fromPrice(a, device) - fromPrice(b, device);
    switch (this.sort()) {
      case 'low':
        return [...list].sort(byPrice);
      case 'high':
        return [...list].sort((a, b) => byPrice(b, a));
      case 'name':
        return [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      default:
        return [...list].sort((a, b) => Number(!!a.soldOut) - Number(!!b.soldOut) || (BOOST[b.badge] ?? 0) - (BOOST[a.badge] ?? 0));
    }
  });

  /** Changes whenever what the grid shows changes (used for scroll + re-render). */
  readonly listKey = computed(() =>
    [this.device().id, this.color(), this.style(), this.query(), this.sort(), this.view(), this.params().get('page') ?? ''].join('|'),
  );

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.results().length / PAGE_SIZE)));
  readonly page = computed(() => {
    const p = Number(this.params().get('page'));
    return Number.isInteger(p) && p >= 1 ? Math.min(p, this.pageCount()) : 1;
  });
  readonly pageItems = computed(() => this.results().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));

  /** Update filters; any change other than the page goes back to page 1. Empty values are removed. */
  set(patch: FilterPatch): void {
    const queryParams: Params = { page: null };
    for (const [k, v] of Object.entries(patch)) queryParams[k] = v || null;
    // Colours differ per device.
    if ('model' in patch) queryParams['color'] = null;
    this.navigate(queryParams);
  }

  goToPage(page: number): void {
    this.navigate({ page: page > 1 ? page : null });
  }

  reset(): void {
    this.navigate({ color: null, style: null, q: null, page: null });
  }

  private navigate(queryParams: Params): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
