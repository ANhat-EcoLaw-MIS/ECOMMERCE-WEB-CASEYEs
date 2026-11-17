import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CasePreview } from '../../../../shared/ui/case-preview/case-preview';
import { DEFAULT_DEVICE, DEVICES, minPrice } from '../../../../shared/devices/devices';
import { ACCESSORIES, artworkUrl, DESIGNS, fromPrice, type CatalogAccessory } from '../../../shop/catalog';
import { Reveal, shuffle } from '../../shared/reveal';

/** Bento slots for the best-seller grid (lg: 4 columns × 3 rows). */
const BEST_SLOTS = [
  { span: 'col-span-2 row-span-2', tone: 'featured' },
  { span: 'col-span-1 row-span-2', tone: 'tall' },
  { span: 'col-span-1 row-span-1', tone: 'light' },
  { span: 'col-span-1 row-span-1', tone: 'blush' },
  { span: 'col-span-2 row-span-1', tone: 'wide' },
] as const;

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

/** Products catalog on the landing page: random best sellers + the product lines we sell. */
@Component({
  selector: 'app-landing-catalog',
  imports: [RouterLink, CasePreview, Reveal],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class LandingCatalog {
  protected readonly device = DEFAULT_DEVICE;
  protected readonly devices = DEVICES;
  protected readonly designCount = DESIGNS.length;
  protected readonly artworkUrl = artworkUrl;

  /** Random in-stock designs, one per bento slot. */
  protected readonly best = shuffle(DESIGNS.filter((d) => !d.soldOut))
    .slice(0, BEST_SLOTS.length)
    .map((design, i) => ({ design, ...BEST_SLOTS[i], price: fromPrice(design, DEFAULT_DEVICE) }));

  /** Three designs fanned out on the "ready-made cases" tile. */
  protected readonly fan = shuffle(DESIGNS.filter((d) => d.art)).slice(0, 3);

  protected readonly magsafe = pick('MagSafe');
  protected readonly strap = pick('Dây đeo');
  protected readonly charm = pick('Charm');
  protected readonly accessoryCount = ACCESSORIES.length;

  protected money(n: number): string {
    return vnd.format(n);
  }

  protected fromK(model: (typeof DEVICES)[number]): string {
    return `${Math.round(minPrice(model) / 1000)}k`;
  }
}

function pick(category: CatalogAccessory['category']): CatalogAccessory[] {
  return shuffle(ACCESSORIES.filter((a) => a.category === category && a.stock > 0));
}
