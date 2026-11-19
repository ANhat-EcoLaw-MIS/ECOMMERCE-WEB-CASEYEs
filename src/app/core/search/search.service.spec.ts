import { TestBed } from '@angular/core/testing';
import { DEVICES } from '../../shared/devices/devices';
import type { SearchDoc } from '../../shared/search/search.types';
import { POPULAR_DEVICES, SEARCH_SOURCES, SearchService } from './search.service';

const ALL = DEVICES.map((m) => m.id);
const DOCS: SearchDoc[] = [
  { id: 'product:cat', type: 'product', title: 'Ốp mèo mây', text: 'mèo', link: '/shop/cat', devices: ALL, boost: 2 },
  { id: 'product:wave', type: 'product', title: 'Violet Waves', text: 'sóng tím', link: '/shop/wave', devices: ALL },
  { id: 'template:sakura', type: 'template', title: 'Tokyo Sakura', text: 'hoa anh đào', link: '/design-studio/templates', devices: ALL },
  { id: 'accessory:puck', type: 'product', title: 'Đế sạc từ tính', text: 'magsafe', link: '/shop/phu-kien/puck' },
  { id: 'help:cancel', type: 'help', title: 'Hủy đơn', text: 'hủy đơn', link: '/help' },
];

describe('SearchService · phone models', () => {
  let search: SearchService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: SEARCH_SOURCES, useValue: [{ id: 'test', docs: () => DOCS }] }],
    });
    search = TestBed.inject(SearchService);
  });

  it('lists the cases and templates for a phone when only its name is typed', () => {
    for (const query of ['Galaxy S24', 'iphone 15 pro max', 'xiaomi 14 ultra', 'ip16 pro']) {
      const r = search.search(query);
      expect(r.device).not.toBeNull();
      expect(r.products.map((h) => h.doc.id)).toEqual(['product:cat', 'product:wave']);
      expect(r.templates.map((h) => h.doc.id)).toEqual(['template:sakura']);
    }
  });

  it('opens product results on the phone that was searched', () => {
    const r = search.search('Galaxy S24');
    expect(r.products[0].doc.queryParams).toEqual({ model: 'galaxy-s24' });
  });

  it('ranks by the rest of the query within that phone', () => {
    expect(search.search('ốp mèo galaxy s24').products.map((h) => h.doc.id)).toEqual(['product:cat']);
  });

  it('suggests only the phones CasEYE\'s sells', () => {
    expect(POPULAR_DEVICES).toEqual(DEVICES.map((m) => m.name));
  });

  it('reads a sold phone from the query', () => {
    const r = search.search('ốp mèo ip15 pro max');
    expect(r.device).toBe('iPhone 15 Pro Max');
    expect(r.unsoldDevice).toBeNull();
  });

  it('says when the phone is not sold instead of filtering by it', () => {
    const r = search.search('ốp mèo ip16 pro max');
    expect(r.device).toBeNull();
    expect(r.unsoldDevice).toBe('iPhone 16 Pro Max');
  });
});
