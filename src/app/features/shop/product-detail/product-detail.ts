import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CasePreview } from '../../../shared/ui/case-preview/case-preview';
import { CaseViewer3d } from '../../../shared/ui/case-viewer-3d/case-viewer-3d';
import { BRANDS_DATA, DEFAULT_DEVICE, DEVICES, findDevice, type BaseSKU, type PhoneModel } from '../../../shared/devices/devices';
import {
  ACCESSORIES,
  artworkUrl,
  colorSkus,
  DESIGNS,
  findDesign,
  pickSku,
  productImage,
  productPhotos,
  variantPrice,
  variantStock,
} from '../catalog';
import { ShopCart } from '../services/shop-cart';
import { onPhotoError, vnd } from '../format';
import { VariantPicker } from '../components/variant-picker/variant-picker';
import { ProductCard } from '../components/product-card/product-card';
import { AccessoryCard } from '../components/accessory-card/accessory-card';

type MediaMode = '2d' | '3d' | 'photos';
type InfoTab = 'description' | 'specs' | 'reviews';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, CasePreview, CaseViewer3d, VariantPicker, ProductCard, AccessoryCard],
  templateUrl: './product-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-surface' },
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly shopCart = inject(ShopCart);
  protected readonly vnd = vnd;
  protected readonly onPhotoError = onPhotoError;
  protected readonly accessories = ACCESSORIES.filter((a) => a.stock > 0).slice(0, 4);
  protected readonly colorSkus = colorSkus;

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  protected readonly design = computed(() => findDesign(this.params().get('id')));
  /** Device and SKU live in the URL (?model=&sku=) so a configured case can be shared. */
  protected readonly device = computed(() => findDevice(this.query().get('model')) ?? DEFAULT_DEVICE);
  protected readonly sku = computed<BaseSKU | undefined>(() => {
    const id = this.query().get('sku');
    return this.device().skus.find((s) => s.skuId === id && s.isAvailable) ?? pickSku(this.device());
  });

  protected readonly brands = BRANDS_DATA.filter((b) => DEVICES.some((d) => d.brandId === b.id));
  protected readonly devicesOfBrand = computed(() => DEVICES.filter((d) => d.brandId === this.device().brandId));

  protected readonly artwork = computed(() => artworkUrl(this.design()?.id ?? ''));
  /**
   * Picture for the "Mô tả" tab: the design's artwork, or (for designs without their own file)
   * the same seeded background their case shows, so the image is never empty.
   */
  protected readonly descriptionImage = computed(() => productImage(this.design()?.id ?? ''));
  protected readonly photos = computed(() => (this.design() ? productPhotos(this.design()!.id) : []));
  protected readonly price = computed(() => {
    const d = this.design(), s = this.sku();
    return d && s ? variantPrice(d, s) : 0;
  });
  protected readonly stock = computed(() => {
    const d = this.design(), s = this.sku();
    return d && s ? variantStock(d, s) : 0;
  });
  protected readonly favorite = computed(() => this.shopCart.wishlist().includes(this.design()?.id ?? ''));

  protected readonly related = computed(() => {
    const current = this.design();
    if (!current) return [];
    return DESIGNS.filter((d) => d.id !== current.id)
      .sort((a, b) => Number(b.collection === current.collection) - Number(a.collection === current.collection))
      .slice(0, 6);
  });

  protected readonly mode = signal<MediaMode>('2d');
  protected readonly photoIndex = signal(0);
  protected readonly tab = signal<InfoTab>('description');
  protected readonly quantity = signal(1);

  constructor() {
    // New design → back to the default view.
    effect(() => {
      this.design();
      this.mode.set('2d');
      this.photoIndex.set(0);
      this.quantity.set(1);
    });
    // Keep quantity within stock when the variant changes.
    effect(() => {
      const max = Math.max(1, this.stock());
      if (this.quantity() > max) this.quantity.set(max);
    });
  }

  protected selectBrand(e: Event): void {
    const brandId = (e.target as HTMLSelectElement).value;
    const first = DEVICES.find((d) => d.brandId === brandId);
    if (first) this.selectDevice(first);
  }

  protected onDevice(e: Event): void {
    const d = findDevice((e.target as HTMLSelectElement).value);
    if (d) this.selectDevice(d);
  }

  protected selectDevice(device: PhoneModel): void {
    const current = this.sku();
    const next = pickSku(device, current?.colorName);
    this.setVariant(device, next);
  }

  protected selectSku(sku: BaseSKU): void {
    this.setVariant(this.device(), sku);
  }

  private setVariant(device: PhoneModel, sku: BaseSKU | undefined): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { model: device.id, sku: sku?.skuId ?? null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected step(delta: number): void {
    this.quantity.update((q) => Math.min(Math.max(1, this.stock()), Math.max(1, q + delta)));
  }

  protected showPhoto(i: number): void {
    const n = this.photos().length;
    this.photoIndex.set((i + n) % n);
  }

  protected add(event: MouseEvent): void {
    const d = this.design(), s = this.sku();
    if (d && s) this.shopCart.addVariant(d, this.device(), s, this.quantity(), event);
  }

  protected openDesign(id: string): void {
    void this.router.navigate(['/shop', id], { queryParamsHandling: 'preserve' });
  }

  protected scrollTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
