import { conceptsIn, deviceIn, orderCodeIn } from './lexicon';
import { normalizeVi } from './normalize-vi';
import { deltaE, namesOf, paletteFromCss, paletteFromPixels, paletteNames, paletteSimilarity } from './color';
import { rankByImage, rankByText, suggestByDescription } from './rank';
import { SearchDoc } from './search.types';

const docs: SearchDoc[] = [
  { id: 'kitten', type: 'template', title: 'Dreamy Kitten', subtitle: 'Mèo mộng mơ', text: '#pastel #cute #mèo_con #dreamy', link: '/a', palette: [{ rgb: [236, 220, 250], w: 0.7 }, { rgb: [190, 160, 235], w: 0.3 }] },
  { id: 'sakura', type: 'template', title: 'Sakura Night', subtitle: 'Hoa anh đào', text: '#hoa_lá #japan #night', link: '/b', boost: 2 },
  { id: 'noir', type: 'product', title: 'Noir Muse', subtitle: 'After Hours', text: 'Đen Minimal Art Hybrid TPU', style: 'Cá tính', link: '/c', palette: [{ rgb: [45, 39, 53], w: 1 }] },
  { id: 'lilac', type: 'product', title: 'Lavender Daydream', subtitle: 'Soft Intentions', text: 'Tím Minimal Hoa TPU chống sốc', style: 'Pastel', link: '/d' },
  { id: 'matcha', type: 'template', title: 'Matcha Boba', subtitle: 'Foodie', text: '#foodie', link: '/f', palette: [{ rgb: [200, 235, 190], w: 0.6 }, { rgb: [95, 160, 90], w: 0.4 }] },
  { id: 'help', type: 'help', title: 'Hủy đơn hàng', text: 'hủy đơn yêu cầu hủy hoàn tiền', link: '/e' },
];

describe('search core', () => {
  it('normalizes Vietnamese without accents', () => {
    expect(normalizeVi('Hoa Lá #Tối_Giản Đẹp')).toBe('hoa la toi gian dep');
  });

  it('finds by words without accents and with one typo', () => {
    expect(rankByText(docs, 'hoa la')[0].doc.id).toBe('sakura');
    expect(rankByText(docs, 'lavendr')[0].doc.id).toBe('lilac');
  });

  it('short words are not matched as prefixes of other syllables ("hoa" is not "hoàn")', () => {
    expect(rankByText(docs, 'hoa').map((h) => h.doc.id)).not.toContain('help');
    expect(rankByText(docs, 'lave')[0].doc.id).toBe('lilac');
  });

  it('expands synonyms: "dẻo" finds TPU cases, "mèo" finds the kitten', () => {
    expect(rankByText(docs, 'ốp dẻo').map((h) => h.doc.id)).toEqual(expect.arrayContaining(['noir', 'lilac']));
    expect(rankByText(docs, 'meo')[0].doc.id).toBe('kitten');
  });

  it('reads a phone model and an order code from the query', () => {
    expect(deviceIn('ốp mèo ip15 pro max')).toEqual({ name: 'iPhone 15 Pro Max', rest: 'op meo' });
    expect(deviceIn('ốp s24')?.name).toBe('Galaxy S24');
    expect(orderCodeIn(' cc-261115-0001 ')).toBe('CC-261115-0001');
    expect(orderCodeIn('ốp mèo')).toBeNull();
  });

  it('suggests by description and explains why', () => {
    const r = suggestByDescription(docs, 'mình muốn ốp tím pastel dễ thương có mèo để tặng bạn gái');
    expect(r.concepts.map((c) => c.id)).toEqual(expect.arrayContaining(['tim', 'pastel', 'cute', 'meo', 'qua']));
    expect(r.hits[0].doc.id).toBe('kitten');
    expect(r.hits[0].reasons).toEqual(expect.arrayContaining(['mèo', 'pastel']));
  });

  it('a description with no known wish returns nothing instead of random items', () => {
    expect(suggestByDescription(docs, 'xyz qwe').hits).toEqual([]);
  });

  it('color math: ΔE, color names, palettes', () => {
    expect(deltaE([255, 0, 0], [255, 0, 0])).toBe(0);
    expect(deltaE([150, 110, 210], [160, 120, 215])).toBeLessThan(10);
    expect(namesOf([150, 110, 210])).toEqual(['tim']);
    expect(namesOf([90, 170, 100])).toEqual(['xanh-la']);
    expect(namesOf([20, 20, 25])).toEqual(['den']);
    expect(namesOf([236, 220, 250])).toEqual(expect.arrayContaining(['pastel']));
    expect(paletteFromCss('linear-gradient(180deg, #fdf4ff 0%, #ede9fe 100%)').map((s) => s.rgb)).toEqual([[253, 244, 255], [237, 233, 254]]);
    // 3 green pixels + 1 purple pixel → green first, weight 0.75
    const px = [90, 170, 100, 255, 90, 170, 100, 255, 92, 171, 99, 255, 150, 110, 210, 255];
    const pal = paletteFromPixels(px);
    expect(paletteNames(pal)[0]).toBe('xanh-la');
    expect(pal[0].w).toBeCloseTo(0.75);
    expect(paletteSimilarity(pal, pal)).toBeGreaterThan(0.9);
  });

  it('photo search: same tones first, honest "nearest" when nothing is alike', () => {
    const green = rankByImage(docs, [{ rgb: [100, 165, 95], w: 0.7 }, { rgb: [240, 240, 235], w: 0.3 }]);
    expect(green.names[0]).toBe('xanh lá');
    expect(green.hits[0].doc.id).toBe('matcha');
    const red = rankByImage(docs, [{ rgb: [215, 30, 40], w: 1 }]);
    expect(red.hits).toEqual([]);
    expect(red.nearest.length).toBeGreaterThan(0);
  });

  it('description colors also use the picture: "xanh lá" finds the green template with no green tag', () => {
    const r = suggestByDescription(docs, 'ốp xanh lá dễ thương');
    expect(r.concepts.map((c) => c.id)).toContain('xanh-la');
    expect(r.concepts.map((c) => c.id)).not.toContain('xanh-duong');
    expect(r.hits[0].doc.id).toBe('matcha');
  });

  it('concepts are found in product text', () => {
    expect(conceptsIn('Đen Minimal Art').map((c) => c.id)).toEqual(expect.arrayContaining(['den', 'toi-gian', 'nghe-thuat']));
  });
});
