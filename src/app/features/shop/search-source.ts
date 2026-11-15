import { Injectable } from '@angular/core';
import { SearchSource } from '../../core/search/search.service';
import { SearchDoc } from '../../shared/search/search.types';
import { ACCESSORIES, PRODUCTS, productImage } from './catalog';

/** Average colors of the case photos, for "Tìm bằng ảnh" (moved from the old header search). */
const COLORS: Record<string, [number, number, number]> = {
  'lilac-dream': [192, 159, 239],
  'midnight-eyes': [43, 31, 71],
  'bloom-club': [240, 218, 247],
  'purple-orbit': [164, 128, 230],
  'little-love': [244, 232, 249],
  'noir-muse': [45, 39, 53],
  'cloud-nine': [198, 177, 236],
  'mono-heart': [232, 227, 238],
};

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
        color: COLORS[p.id],
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
