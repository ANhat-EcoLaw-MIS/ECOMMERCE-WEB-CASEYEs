import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SearchService } from '../../core/search/search.service';
import { CartState } from '../../core/cart-state/cart-state';
import { injectRequireLogin } from '../../core/auth/require-login';
import { CartDrawerState } from '../../core/cart-state/cart-drawer-state';
import { Case3d } from '../../shared/ui/case-3d/case-3d';
import { MODELS, PRODUCTS, productImage, type CatalogProduct } from './catalog';

@Component({ selector: 'app-shop', imports: [RouterLink, Case3d], styleUrl: './shop.scss', templateUrl: './shop.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class Shop {
  protected readonly cart = inject(CartState);
  private readonly requireLogin = injectRequireLogin();
  private readonly drawer = inject(CartDrawerState);
  /** Site-wide search (header box). Shop only keeps a ?q filter for links like /shop?q=mèo. */
  private readonly search = inject(SearchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected openDrawer(): void { if (this.requireLogin('/cart')) this.drawer.show(); }
  protected readonly productImage = productImage;
  protected readonly products = PRODUCTS;
  protected readonly models = MODELS;
  protected readonly styles = ['Tất cả', 'Pastel', 'Cá tính', 'Hoa lá', 'Trừu tượng', 'Tối giản'];
  protected readonly query = signal('');
  protected readonly style = signal('Tất cả');
  protected readonly maxPrice = signal(400000);
  protected readonly sort = signal('featured');
  protected readonly model = signal(MODELS[0]);
  protected readonly selected = signal<CatalogProduct | null>(null);
  protected readonly wishlist = signal<string[]>(this.readWishlist());
  protected readonly toast = signal('');
  protected readonly view3D = signal(false);
  protected readonly consent = signal(false);
  private readonly urlQuery = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('q') ?? '')), { initialValue: this.route.snapshot.queryParamMap.get('q') ?? '' });
  constructor(){ effect(() => this.query.set(this.urlQuery())); }
  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLocaleLowerCase('vi');
    const matched = this.products.filter((p) => (this.style() === 'Tất cả' || p.style === this.style()) && p.price <= this.maxPrice() && (!needle || [p.name,p.collection,p.style,...p.tags].join(' ').toLocaleLowerCase('vi').includes(needle)));
    return [...matched].sort((a,b) => this.sort() === 'low' ? a.price-b.price : this.sort() === 'high' ? b.price-a.price : this.sort() === 'name' ? a.name.localeCompare(b.name) : 0);
  });
  private readonly formatter = new Intl.NumberFormat('vi-VN', { style:'currency',currency:'VND',maximumFractionDigits:0 });
  protected money(amount: number): string { return this.formatter.format(amount); }
  protected updateStyle(e: Event): void { this.style.set((e.target as HTMLSelectElement).value); }
  protected updateSort(e: Event): void { this.sort.set((e.target as HTMLSelectElement).value); }
  protected updateModel(e: Event): void { this.model.set((e.target as HTMLSelectElement).value); }
  protected updatePrice(e: Event): void { this.maxPrice.set(Number((e.target as HTMLInputElement).value)); }
  protected open(p: CatalogProduct): void { this.selected.set(p); this.view3D.set(false); }
  protected close(): void { this.selected.set(null); }
  protected openDetail(p: CatalogProduct): void {
    this.close();
    void this.router.navigate(['/shop', p.id], {queryParams: {model: this.model()}});
  }
  protected toggleFavorite(id: string): void {
    this.wishlist.update((ids) => ids.includes(id) ? ids.filter((a) => a !== id) : [...ids,id]);
    if (typeof localStorage !== 'undefined') localStorage.setItem('caseye_favorites',JSON.stringify(this.wishlist()));
  }
  private readWishlist(): string[] { try { return JSON.parse(typeof localStorage !== 'undefined' ? localStorage.getItem('caseye_favorites') || '[]' : '[]'); } catch { return []; } }
  protected add(p: CatalogProduct, e?: MouseEvent): void {
    if (!p.stock) { this.toast.set('Mẫu này hiện hết hàng, bạn có thể xem mẫu khác nhé.'); return; }
    if (!this.requireLogin('/shop')) return;
    this.cart.add({ id: p.id + ':' + this.model(), name: p.name, model: this.model(), finish:p.material, tone:p.tone, caption:p.caption, unitPrice:p.price, quantity:1, stock:p.stock, custom:false });
    this.toast.set(p.stock ? `${p.name} đã vào giỏ hàng ♡` : `${p.name} đã lưu trong giỏ — hiện hết hàng`);
    this.flyToCart(e);
    this.selected.set(null);
    this.drawer.show(true);
  }
  private flyToCart(e?: MouseEvent): void {
    if (!e || typeof document === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = document.getElementById('caseye-cart-icon');
    if (!target) return;
    const end = target.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.textContent = '♥'; dot.className = 'caseye-fly-heart';
    dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px';
    document.body.appendChild(dot);
    const dx = end.left + end.width/2 - e.clientX, dy = end.top + end.height/2 - e.clientY;
    const animation = dot.animate([{transform:'translate(-50%, -50%) scale(1)',opacity:1},{transform:`translate(${dx*.55-40}px,${dy*.45-90}px) scale(1.4)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy}px) scale(.2)`,opacity:.25}],{duration:850,easing:'cubic-bezier(.25,.7,.25,1)'});
    animation.finished.then(() => dot.remove()).catch(() => dot.remove());
  }
  protected openSearch(): void { this.search.open('text', this.query()); }

  protected onProductImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img || img.dataset['fallbackApplied'] === 'true') return;
    img.dataset['fallbackApplied'] = 'true';
    img.src = '/products/bloom-club.webp';
  }
  protected onHeroImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img) return;
    img.src = '/products/lilac-dream.webp';
  }
}
