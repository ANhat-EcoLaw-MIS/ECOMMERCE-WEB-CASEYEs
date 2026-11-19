import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CartState } from '../../../core/cart-state/cart-state';
import { CartDrawerState } from '../../../core/cart-state/cart-drawer-state';
import { injectRequireLogin } from '../../../core/auth/require-login';
import { NotificationManager } from '../../../shared/ui/notification/notification.manager';
import { type BaseSKU, type PhoneModel } from '../../../shared/devices/devices';
import {
  cartItemId,
  variantPrice,
  variantStock,
  type CatalogAccessory,
  type ShopDesign,
} from '../catalog';

const WISHLIST_KEY = 'caseye_favorites';

/** Add-to-cart and wishlist actions shared by the listing, quick view and detail page. */
@Injectable({ providedIn: 'root' })
export class ShopCart {
  private readonly cart = inject(CartState);
  private readonly drawer = inject(CartDrawerState);
  private readonly notifications = inject(NotificationManager);
  private readonly router = inject(Router);
  private readonly requireLogin = injectRequireLogin();

  readonly wishlist = signal<readonly string[]>(readWishlist());

  addVariant(design: ShopDesign, model: PhoneModel, sku: BaseSKU, quantity = 1, event?: MouseEvent): boolean {
    const stock = variantStock(design, sku);
    if (stock < 1) {
      this.notifications.show({ variant: 'warning', title: 'Tạm hết hàng', message: `${design.name} cho ${model.name} hiện đã hết. Bạn thử màu hoặc loại ốp khác nhé.` });
      return false;
    }
    if (!this.requireLogin(this.router.url)) return false;
    this.cart.add({
      id: cartItemId(design, model, sku),
      name: design.name,
      // Order tracking matches phone_models by name.
      model: model.name,
      finish: `${design.finish} · ${sku.colorName}`,
      tone: design.tone,
      caption: design.caption,
      unitPrice: variantPrice(design, sku),
      quantity: Math.min(quantity, stock),
      stock,
      custom: false,
    });
    flyToCart(event);
    this.drawer.show(true);
    return true;
  }

  addAccessory(item: CatalogAccessory, quantity = 1): void {
    if (item.stock < 1) {
      this.notifications.show({ variant: 'warning', title: 'Tạm hết hàng', message: `${item.name} hiện đã hết, bạn xem phụ kiện khác nhé.` });
      return;
    }
    if (!this.requireLogin(this.router.url)) return;
    this.cart.add({ id: item.id, name: item.name, model: 'Phụ kiện', finish: item.category, tone: 'lilac', caption: '', unitPrice: item.price, quantity: Math.max(1, Math.min(quantity, item.stock)), stock: item.stock, custom: false, snapshot: item.image });
    this.drawer.show(true);
  }

  isFavorite(id: string): boolean {
    return this.wishlist().includes(id);
  }

  toggleFavorite(id: string): void {
    this.wishlist.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(this.wishlist()));
    } catch {
      // Private mode / storage disabled: keep it in memory.
    }
  }
}

function readWishlist(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Small heart that flies from the click to the header cart icon. */
function flyToCart(e?: MouseEvent): void {
  if (!e || typeof document === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = document.getElementById('caseye-cart-icon');
  if (!target) return;
  const end = target.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.textContent = '♥';
  Object.assign(dot.style, {
    position: 'fixed', zIndex: '200', pointerEvents: 'none', fontSize: '28px', lineHeight: '1',
    color: '#a58cf4', textShadow: '0 2px 10px #fff', left: `${e.clientX}px`, top: `${e.clientY}px`,
  });
  document.body.appendChild(dot);
  const dx = end.left + end.width / 2 - e.clientX;
  const dy = end.top + end.height / 2 - e.clientY;
  dot
    .animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.55 - 40}px, ${dy * 0.45 - 90}px) scale(1.4)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.2)`, opacity: 0.25 },
      ],
      { duration: 850, easing: 'cubic-bezier(.25,.7,.25,1)' },
    )
    .finished.finally(() => dot.remove());
}
