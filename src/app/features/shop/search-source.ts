import { Injectable } from '@angular/core';
import { SearchSource } from '../../core/search/search.service';
import { SearchDoc } from '../../shared/search/search.types';
import { DEFAULT_DEVICE, DEVICES } from '../../shared/devices/devices';
import { ACCESSORIES, DESIGNS, fromPrice, productImage } from './catalog';

const BOOST: Record<string, number> = { 'BEST SELLER': 2, HOT: 2, 'NEW DROP': 1, LIMITED: 1 };
/** Every design prints on every studio phone; accessories (MagSafe, straps, charms) fit them all too. */
const DEVICE_IDS = DEVICES.map((m) => m.id);

/** Mua sắm → Tìm kiếm: ready-made cases and accessories. */
@Injectable({ providedIn: 'root' })
export class ShopSearchSource implements SearchSource {
  readonly id = 'shop';
  private readonly list: readonly SearchDoc[] = [
    ...DESIGNS.map(
      (d): SearchDoc => ({
        id: `product:${d.id}`,
        type: 'product',
        title: d.name,
        subtitle: d.collection,
        // FR-SRCH-EX-12: phone names stay out of the text (they matched every product);
        // the phone is a filter via `devices` (FR-SRCH-05).
        text: `${d.tags.join(' ')} ${d.description} ${d.finish} ${d.caption}`,
        devices: DEVICE_IDS,
        style: d.style,
        image: productImage(d.id),
        link: `/shop/${d.id}`,
        price: fromPrice(d, DEFAULT_DEVICE),
        badge: d.badge || undefined,
        boost: BOOST[d.badge] ?? 0,
        outOfStock: !!d.soldOut,
      }),
    ),
    ...ACCESSORIES.map(
      (a): SearchDoc => ({
        id: `accessory:${a.id}`,
        type: 'product',
        title: a.name,
        subtitle: `Phụ kiện · ${a.category}`,
        text: `phụ kiện ${a.category} ${a.description}`,
        image: a.image,
        link: `/shop/phu-kien/${a.id}`,
        price: a.price,
        devices: DEVICE_IDS,
        outOfStock: a.stock <= 0,
      }),
    ),
  ];

  docs(): readonly SearchDoc[] {
    return this.list;
  }
}
