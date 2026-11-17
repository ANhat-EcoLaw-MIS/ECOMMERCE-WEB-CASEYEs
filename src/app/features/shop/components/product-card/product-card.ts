import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CasePreview } from '../../../../shared/ui/case-preview/case-preview';
import { type BaseSKU, type PhoneModel } from '../../../../shared/devices/devices';
import { artworkUrl, colorSkus, variantPrice, variantStock, type ShopDesign } from '../../catalog';
import { ShopCart } from '../../services/shop-cart';
import { vnd } from '../../format';
import type { ShopView } from '../../services/shop-filters';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, CasePreview],
  templateUrl: './product-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ProductCard {
  readonly design = input.required<ShopDesign>();
  readonly model = input.required<PhoneModel>();
  readonly sku = input.required<BaseSKU>();
  readonly view = input<ShopView>('grid');
  readonly quickView = output<void>();

  protected readonly shopCart = inject(ShopCart);
  protected readonly vnd = vnd;

  protected readonly artwork = computed(() => artworkUrl(this.design().id));
  protected readonly price = computed(() => variantPrice(this.design(), this.sku()));
  protected readonly stock = computed(() => variantStock(this.design(), this.sku()));
  protected readonly favorite = computed(() => this.shopCart.wishlist().includes(this.design().id));
  protected readonly link = computed(() => ['/shop', this.design().id]);
  protected readonly linkParams = computed(() => ({ model: this.model().id, sku: this.sku().skuId }));

  /** Colours of the same device, shown as swatches (the case itself keeps its colour on hover). */
  protected readonly swatches = computed(() => colorSkus(this.model()));

  protected readonly mediaClass = computed(() =>
    this.view() === 'list' ? 'aspect-[4/5] w-[38%] sm:w-56' : 'aspect-square w-full',
  );
  protected readonly caseClass = computed(() =>
    this.view() === 'list' ? 'w-[52%]' : this.view() === 'large' ? 'w-[38%]' : 'w-[44%]',
  );

  protected add(event: MouseEvent): void {
    this.shopCart.addVariant(this.design(), this.model(), this.sku(), 1, event);
  }
}
