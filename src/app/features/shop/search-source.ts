import { Injectable } from '@angular/core';
import { SearchSource } from '../../core/search/search.service';
import { SearchDoc } from '../../shared/search/search.types';
import { ACCESSORIES, PRODUCTS, productImage } from './catalog';

const BOOST: Record<string, number> = { 'BEST SELLER': 2, HOT: 2, 'NEW DROP': 1, LIMITED: 1 };

/** Mua sắm → Tìm kiếm: ready-made cases and accessories. */
@Injectable({ providedIn: 'root' })
export class ShopSearchSource implements SearchSource {
  readonly id = 'shop';
  private readonly list: readonly SearchDoc[] = [
    ...PRODUCTS.map(
      (p): SearchDoc => ({
        id: `product:${p.id}`,
        type: 'product',
        title: p.name,
        subtitle: p.collection,
        text: `${p.tags.join(' ')} ${p.description} ${p.material} ${p.caption}`,
        style: p.style,
        image: productImage(p.id),
        link: `/shop/${p.id}`,
        price: p.price,
        badge: p.badge || undefined,
        boost: BOOST[p.badge] ?? 0,
        outOfStock: p.stock <= 0,
      }),
    ),
    ...ACCESSORIES.map(
      (a): SearchDoc => ({
        id: `accessory:${a.id}`,
        type: 'product',
        title: a.name,
        subtitle: 'Phụ kiện',
        text: 'phụ kiện magsafe dây đeo airpods',
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
