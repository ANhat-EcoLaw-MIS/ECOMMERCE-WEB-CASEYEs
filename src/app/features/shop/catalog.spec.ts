import { findDevice } from '../../shared/devices/devices';
import { ACCESSORIES, artworkUrl, cartItemId, catalogId, colorSkus, DESIGNS, findDesign, fromPrice, pickSku, productImage, productPhotos, variantPrice, variantStock } from './catalog';
import { pageList } from './components/pagination/pagination';
import { fallbackArt } from '../../shared/devices/case-art';

const s24 = findDevice('galaxy-s24')!;
const ip16 = findDevice('iphone-16-pro')!;
const bloom = findDesign('bloom-club')!;

describe('shop catalog', () => {
  it('builds cart ids as design:model:sku and reads the design back', () => {
    const sku = pickSku(s24)!;
    const id = cartItemId(bloom, s24, sku);
    expect(id).toBe(`bloom-club:galaxy-s24:${sku.skuId}`);
    expect(catalogId(id)).toBe('bloom-club');
    // No artwork file: the cart shows the same seeded fallback the case uses.
    expect(productImage(id)).toBe(fallbackArt('bloom-club').url);
    expect(productImage('unknown:x:y')).toBe(fallbackArt('unknown').url);
  });

  it('prices a variant as SKU price + design premium', () => {
    const sku = pickSku(ip16, 'Trắng Sữa')!;
    expect(sku.colorName).toBe('Trắng Sữa');
    expect(variantPrice(bloom, sku)).toBe(sku.price + bloom.premium);
    expect(fromPrice(bloom, ip16)).toBe(Math.min(...ip16.skus.map((s) => s.price)) + bloom.premium);
  });

  it('sells by colour only: one SKU per colour, falling back to the first SKU', () => {
    const names = colorSkus(ip16).map((s) => s.colorName);
    expect(new Set(names).size).toBe(names.length);
    expect(pickSku(s24, 'does-not-exist')).toBe(s24.skus[0]);
  });

  it('uses Bg_Case artwork and no photos for the new designs', () => {
    const glass = findDesign('lilac-liquid-glass')!;
    expect(artworkUrl(glass.id)).toBe('/products/Bg_Case/02_lilac_liquid_glass.png');
    expect(productImage(`${glass.id}:x:y`)).toBe('/products/Bg_Case/02_lilac_liquid_glass.png');
    expect(productPhotos(glass.id)).toEqual([]);
    expect(artworkUrl('bloom-club')).toBe('');
    expect(DESIGNS.filter((d) => d.art).length).toBe(15);
    expect(new Set(DESIGNS.map((d) => d.id)).size).toBe(DESIGNS.length);
  });

  it('lists the 10 accessories from /products/Accessories', () => {
    expect(ACCESSORIES.length).toBe(10);
    expect(ACCESSORIES.every((a) => a.image.startsWith('/products/Accessories/'))).toBe(true);
  });

  it('reports sold-out designs as 0 stock on every SKU', () => {
    const mono = DESIGNS.find((d) => d.soldOut)!;
    for (const sku of ip16.skus) expect(variantStock(mono, sku)).toBe(0);
    expect(variantStock(bloom, ip16.skus[0])).toBe(ip16.skus[0].stockQty);
  });
});

describe('pagination', () => {
  it('lists every page when there are few', () => {
    expect(pageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses long ranges with gaps', () => {
    expect(pageList(1, 74)).toEqual([1, 2, 3, 4, null, 74]);
    expect(pageList(40, 74)).toEqual([1, null, 39, 40, 41, null, 74]);
    expect(pageList(74, 74)).toEqual([1, null, 71, 72, 73, 74]);
  });
});
