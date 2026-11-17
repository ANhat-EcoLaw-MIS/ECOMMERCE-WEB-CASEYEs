import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CasePreview } from '../../../../shared/ui/case-preview/case-preview';
import { CaseViewer3d } from '../../../../shared/ui/case-viewer-3d/case-viewer-3d';
import type { BaseSKU, PhoneModel } from '../../../../shared/devices/devices';
import { artworkUrl, variantPrice, variantStock, type ShopDesign } from '../../catalog';
import { ShopCart } from '../../services/shop-cart';
import { vnd } from '../../format';
import { VariantPicker } from '../variant-picker/variant-picker';

@Component({
  selector: 'app-quick-view',
  imports: [RouterLink, CasePreview, CaseViewer3d, VariantPicker],
  templateUrl: './quick-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class QuickView {
  readonly design = input.required<ShopDesign>();
  readonly model = input.required<PhoneModel>();
  readonly initialSku = input.required<BaseSKU>();
  readonly closed = output<void>();

  private readonly shopCart = inject(ShopCart);
  protected readonly vnd = vnd;
  protected readonly sku = linkedSignal(() => this.initialSku());
  protected readonly mode = signal<'2d' | '3d'>('2d');
  protected readonly artwork = computed(() => artworkUrl(this.design().id));
  protected readonly price = computed(() => variantPrice(this.design(), this.sku()));
  protected readonly stock = computed(() => variantStock(this.design(), this.sku()));
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog()?.nativeElement.focus());
  }

  protected add(event: MouseEvent): void {
    if (this.shopCart.addVariant(this.design(), this.model(), this.sku(), 1, event)) this.closed.emit();
  }
}
