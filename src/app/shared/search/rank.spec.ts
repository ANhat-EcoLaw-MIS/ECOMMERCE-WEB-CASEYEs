import { conceptsIn, deviceIn, orderCodeIn } from './lexicon';
import { normalizeVi } from './normalize-vi';
import { colorOf, rankByColor, rankByText, suggestByDescription } from './rank';
import { SearchDoc } from './search.types';

const docs: SearchDoc[] = [
  { id: 'kitten', type: 'template', title: 'Dreamy Kitten', subtitle: 'Mèo mộng mơ', text: '#pastel #cute #mèo_con #dreamy', link: '/a', color: [236, 220, 250] },
  { id: 'sakura', type: 'template', title: 'Sakura Night', subtitle: 'Hoa anh đào', text: '#hoa_lá #japan #night', link: '/b', boost: 2 },
  { id: 'noir', type: 'product', title: 'Noir Muse', subtitle: 'After Hours', text: 'Đen Minimal Art Hybrid TPU', style: 'Cá tính', link: '/c', color: [45, 39, 53] },
  { id: 'lilac', type: 'product', title: 'Lavender Daydream', subtitle: 'Soft Intentions', text: 'Tím Minimal Hoa TPU chống sốc', style: 'Pastel', link: '/d' },
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

  it('ranks by color and reads template gradients', () => {
    expect(rankByColor(docs, [40, 35, 50])[0].doc.id).toBe('noir');
    expect(colorOf('linear-gradient(180deg, #fdf4ff 0%, #ede9fe 100%)')).toEqual([253, 244, 255]);
  });

  it('concepts are found in product text', () => {
    expect(conceptsIn('Đen Minimal Art').map((c) => c.id)).toEqual(expect.arrayContaining(['den', 'toi-gian', 'nghe-thuat']));
  });
});
