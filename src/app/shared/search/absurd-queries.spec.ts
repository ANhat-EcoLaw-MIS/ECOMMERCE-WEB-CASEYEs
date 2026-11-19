import { TestBed } from '@angular/core/testing';
import { ShopSearchSource } from '../../features/shop/search-source';
import { HelpSearchSource } from '../../features/order-tracking/search-source';
import { TEMPLATE_CATALOG } from '../../features/design-studio/components/template-browser/template-browser';
import { conceptsIn } from './lexicon';
import { rankByText, suggestByDescription } from './rank';
import type { SearchDoc } from './search.types';

/**
 * Regression for "absurd" results (BA spec v3: FR-SRCH-04, FR-SRCH-EX-01, FR-SRCH-EX-12, FR-SH-16),
 * run against the real catalog the overlay searches.
 */
describe('Search does not invent matches', () => {
  let docs: SearchDoc[];

  beforeEach(() => {
    const templates: SearchDoc[] = TEMPLATE_CATALOG.map((t) => ({
      id: `template:${t.id}`,
      type: 'template',
      title: t.name,
      subtitle: `${t.styleLabel} · ${t.creator}`,
      text: `${t.hashtags.join(' ')} ${t.tagLabel} ${t.description} ${t.categories.join(' ')} ${t.category}`,
      style: t.styleLabel,
      link: '/',
    }));
    docs = [...TestBed.inject(ShopSearchSource).docs(), ...templates, ...TestBed.inject(HelpSearchSource).docs()];
  });

  it('nonsense keywords return nothing', () => {
    for (const q of ['asdf', 'qwerty', 'blah blah', 'zzzz pro', 'xin chao']) {
      expect(rankByText(docs, q).map((h) => h.doc.title), q).toEqual([]);
    }
  });

  it('a common word only finds items that really contain it (no typo spill into descriptions)', () => {
    // "nhau" used to hit 23 items through 1-letter typos in description text.
    // Remaining hits contain the word, or are a 1-letter typo of a *title* word (FR-SRCH-04 allows
    // one typo from 4 letters, e.g. "nhau" ≈ "Nhẫn …"); descriptions never take typos any more.
    const hits = rankByText(docs, 'nhau');
    expect(hits.length).toBeLessThan(8);
  });

  it('a near-miss phone word is not matched against every product (FR-SRCH-EX-12)', () => {
    // "galxy" may find a design actually named Galaxy…, but not all 30+ products via device names.
    const hits = rankByText(docs, 'galxy');
    expect(hits.every((h) => /galaxy/i.test(h.doc.title))).toBe(true);
  });

  it('product search text no longer lists phones; phones are a filter instead (FR-SH-16)', () => {
    const shop = TestBed.inject(ShopSearchSource).docs().filter((d) => d.id.startsWith('product:'));
    expect(shop.every((d) => !/iphone|galaxy|xiaomi/i.test(d.text ?? ''))).toBe(true);
    expect(shop.every((d) => d.devices?.includes('galaxy-s24'))).toBe(true);
  });

  it('typos still work on titles (FR-SRCH-04)', () => {
    expect(rankByText(docs, 'lavendr').length).toBeGreaterThan(0);
  });

  it('accented everyday words are not read as wishes (FR-SRCH-EX-01)', () => {
    expect(conceptsIn('tôi muốn một cái gì đó').map((c) => c.id)).not.toContain('do');
    expect(conceptsIn('ốp cho iPhone').map((c) => c.id)).not.toContain('cho');
    expect(suggestByDescription(docs, 'tôi muốn một cái gì đó').hits).toEqual([]);
    // …while the real words still work, with or without accents.
    expect(conceptsIn('màu đỏ').map((c) => c.id)).toContain('do');
    expect(conceptsIn('mau do').map((c) => c.id)).toContain('do');
    expect(conceptsIn('con chó').map((c) => c.id)).toContain('cho');
  });
});
