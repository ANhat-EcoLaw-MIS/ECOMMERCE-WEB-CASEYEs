import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DEFAULT_DEVICE } from '../../../shared/devices/devices';
import { ACCESSORIES, DESIGNS, pickSku } from '../catalog';
import { ACCESSORY_DETAILS, findAccessory } from '../accessory-content';
import { ShopCart } from '../services/shop-cart';
import { onPhotoError, vnd } from '../format';
import { AccessoryCard } from '../components/accessory-card/accessory-card';
import { ProductCard } from '../components/product-card/product-card';

type InfoTab = 'description' | 'specs' | 'box';

/** Accessory detail page: /shop/phu-kien/:id (images from /products/Accessories). */
@Component({
  selector: 'app-accessory-detail',
  imports: [RouterLink, AccessoryCard, ProductCard],
  templateUrl: './accessory-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-surface' },
})
export class AccessoryDetail {
  /** Route param (component input binding). */
  readonly id = input.required<string>();

  protected readonly shopCart = inject(ShopCart);
  private readonly router = inject(Router);
  protected readonly vnd = vnd;
  protected readonly onPhotoError = onPhotoError;

  protected readonly item = computed(() => findAccessory(this.id()));
  protected readonly detail = computed(() => (this.item() ? ACCESSORY_DETAILS[this.item()!.id] : undefined));
  protected readonly favorite = computed(() => this.shopCart.wishlist().includes(this.item()?.id ?? ''));
  protected readonly stars = computed(() => {
    const r = this.detail()?.rating ?? 0;
    return Array.from({ length: 5 }, (_, i) => (r >= i + 1 ? 1 : r > i ? 0.5 : 0));
  });

  protected readonly tab = signal<InfoTab>('description');
  protected readonly quantity = signal(1);
  protected readonly zoom = signal(false);

  /** Same category first, then the rest (in-stock only). */
  protected readonly related = computed(() => {
    const cur = this.item();
    if (!cur) return [];
    return ACCESSORIES.filter((a) => a.id !== cur.id && a.stock > 0)
      .sort((a, b) => Number(b.category === cur.category) - Number(a.category === cur.category))
      .slice(0, 5);
  });

  /** Cases to pair with: MagSafe accessories suggest MagSafe-ready designs; charms/straps any design. */
  protected readonly device = DEFAULT_DEVICE;
  protected readonly pairSku = computed(() => pickSku(DEFAULT_DEVICE)!);
  protected readonly pairs = computed(() => {
    const cur = this.item();
    if (!cur) return [];
    const offset = cur.id.length % 6;
    return DESIGNS.filter((d) => d.art && !d.soldOut).slice(offset, offset + 4);
  });

  constructor() {
    // New accessory → fresh defaults, back to top.
    effect(() => {
      this.id();
      this.tab.set('description');
      this.quantity.set(1);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    });
  }

  protected openDesign(id: string): void {
    void this.router.navigate(['/shop', id], { queryParams: { model: DEFAULT_DEVICE.id } });
  }

  protected step(delta: number): void {
    const max = Math.max(1, this.item()?.stock ?? 1);
    this.quantity.update((q) => Math.min(max, Math.max(1, q + delta)));
  }

  protected add(): void {
    const it = this.item();
    if (it) this.shopCart.addAccessory(it, this.quantity());
  }
}
