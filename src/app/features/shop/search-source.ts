import { Injectable } from '@angular/core';
import { SearchSource } from '../../core/search/search.service';
import { SearchDoc } from '../../shared/search/search.types';
import { DEFAULT_DEVICE, DEVICES } from '../../shared/devices/devices';
import { ACCESSORIES, DESIGNS, fromPrice, productImage } from './catalog';

const BOOST: Record<string, number> = { 'BEST SELLER': 2, HOT: 2, 'NEW DROP': 1, LIMITED: 1 };
const DEVICE_NAMES = DEVICES.map((m) => m.name).join(' ');

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
        text: `${d.tags.join(' ')} ${d.description} ${d.finish} ${d.caption} ${DEVICE_NAMES}`,
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
        link: '/shop',
        price: a.price,
        outOfStock: a.stock <= 0,
      }),
    ),
  ];

  docs(): readonly SearchDoc[] {
    return this.list;
  }
}
