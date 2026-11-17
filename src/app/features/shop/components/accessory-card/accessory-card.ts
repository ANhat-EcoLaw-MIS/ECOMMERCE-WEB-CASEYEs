import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { CatalogAccessory } from '../../catalog';
import { ShopCart } from '../../services/shop-cart';
import { onPhotoError, vnd } from '../../format';

/** Accessory product card (from /products/Accessories). */
@Component({
  selector: 'app-accessory-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article class="group flex h-full flex-col gap-3 rounded-card p-2 transition-colors duration-200 hover:bg-white">
      <div class="relative aspect-[3/4] overflow-hidden rounded-card bg-white">
        <img
          [src]="item().image"
          [alt]="item().name"
          loading="lazy"
          decoding="async"
          (error)="onPhotoError($event)"
          class="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
        />
        @if (item().badge) {
          <span class="absolute left-3 top-3 rounded-pill bg-white px-2.5 py-1 text-[10px] font-bold tracking-wider text-brand-800 shadow-soft">{{ item().badge }}</span>
        }
        @if (!item().stock) {
          <span class="absolute inset-x-3 bottom-3 rounded-pill bg-ink/80 py-1.5 text-center text-xs font-semibold text-white">Tạm hết hàng</span>
        }
      </div>
      <div class="flex flex-1 flex-col px-1 pb-1">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-brand-600">{{ item().category }}</p>
        <h3 class="mt-0.5 line-clamp-1 text-sm font-semibold text-ink">{{ item().name }}</h3>
        <p class="mt-1 line-clamp-2 text-xs text-ink-soft">{{ item().description }}</p>
        <div class="mt-auto flex items-center justify-between gap-2 pt-3">
          <span class="text-sm font-bold text-ink">{{ vnd(item().price) }}</span>
          <button
            type="button"
            [disabled]="!item().stock"
            (click)="shopCart.addAccessory(item())"
            [attr.aria-label]="'Thêm ' + item().name + ' vào giỏ'"
            class="min-h-9 rounded-pill border border-line px-3 text-xs font-semibold text-ink transition-colors hover:border-brand-800 hover:bg-brand-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-400"
          >
            + Thêm
          </button>
        </div>
      </div>
    </article>
  `,
})
export class AccessoryCard {
  readonly item = input.required<CatalogAccessory>();
  protected readonly shopCart = inject(ShopCart);
  protected readonly vnd = vnd;
  protected readonly onPhotoError = onPhotoError;
}
