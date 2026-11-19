import { Injectable, InjectionToken, computed, effect, inject, signal } from '@angular/core';
import { Swatch, cssOf, paletteOfImage } from '../../shared/search/color';
import { deviceIn, orderCodeIn } from '../../shared/search/lexicon';
import { DEVICES } from '../../shared/devices/devices';
import { rankByImage, rankByText, suggestByDescription } from '../../shared/search/rank';
import { ColorIndex } from './color-index';
import { SearchDoc, SearchHit } from '../../shared/search/search.types';

/** A function's searchable things. Registered in app.config.ts, so core never imports features. */
export interface SearchSource {
  readonly id: string;
  /** May read signals (e.g. catalog loaded from Supabase). */
  docs(): readonly SearchDoc[];
}

export const SEARCH_SOURCES = new InjectionToken<readonly SearchSource[]>('SEARCH_SOURCES');

export type SearchMode = 'text' | 'suggest';

export interface GroupedResults {
  readonly query: string;
  /** Phone model read from the query, when CasEYE's sells cases for it. */
  readonly device: string | null;
  /** Phone model read from the query that is not sold ("Chưa có ốp cho …"). */
  readonly unsoldDevice: string | null;
  readonly orderCode: string | null;
  readonly templates: readonly SearchHit[];
  readonly products: readonly SearchHit[];
  readonly help: readonly SearchHit[];
  readonly total: number;
}

/** Shown before typing (team list, replaced later by the most searched words). */
export const POPULAR_KEYWORDS: readonly string[] = ['Mèo', 'Hoa lá', 'Tối giản', 'Y2K', 'Typography', 'Dẻo chống sốc', 'Quà tặng', 'Phong cảnh'];
/** The phones CasEYE's sells (same list as Shop, Design Studio and onboarding). */
export const POPULAR_DEVICES: readonly string[] = DEVICES.map((m) => m.name);
const isSold = (slug: string) => DEVICES.some((m) => m.id === slug);
export const SUGGEST_EXAMPLES: readonly string[] = [
  'Ốp tím pastel có mèo',
  'Quà sinh nhật cho bạn thích game',
  'Tối giản đen trắng',
  'Phong cảnh Nhật Bản nhẹ nhàng',
];

export interface ImageResult {
  readonly preview: string;
  /** Main colors of the photo, biggest first (shown as dots). */
  readonly palette: readonly { css: string; w: number }[];
  readonly names: readonly string[];
  readonly hits: readonly SearchHit[];
  readonly nearest: readonly SearchHit[];
}

function swatchView(sw: Swatch): { css: string; w: number } {
  return { css: cssOf(sw.rgb), w: sw.w };
}

const RECENT_KEY = 'caseyes.search.recent.v1';
const LOG_KEY = 'caseyes.search.log.v1';

/**
 * Site-wide search (function "Tìm kiếm"): one box in the header for Shop cases, Design Studio
 * templates and help pages, plus "Gợi ý theo mô tả" and "Tìm bằng ảnh". Orders are only reached
 * through an order-code shortcut (the order list stays in Tài khoản).
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly sources = inject(SEARCH_SOURCES, { optional: true }) ?? [];

  private readonly colors = inject(ColorIndex);
  private readonly rawDocs = computed(() => this.sources.flatMap((s) => s.docs()));
  /** Every searchable thing, with the palette read from its picture when available. */
  readonly docs = computed(() => this.rawDocs().map((d) => this.colors.withPalette(d)));
  readonly isOpen = signal(false);
  readonly mode = signal<SearchMode>('text');
  readonly query = signal('');
  readonly recent = signal<readonly string[]>(readList(RECENT_KEY));
  readonly image = signal<ImageResult | null>(null);
  readonly imageMessage = signal('');
  readonly imageBusy = signal(false);

  constructor() {
    // Read the pictures' colors in the background while the search is open.
    effect(() => {
      if (this.isOpen()) void this.colors.ensure(this.rawDocs());
    });
  }

  /** Opens a fresh search: empty box (unless prefilled), no old photo. Past searches stay in "Tìm gần đây". */
  open(mode: SearchMode = 'text', prefill = ''): void {
    this.mode.set(mode);
    this.query.set(prefill);
    this.clearImage();
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  /** Text search, grouped for the overlay and the results page. */
  search(raw: string): GroupedResults {
    const query = raw.trim();
    const orderCode = orderCodeIn(query);
    const device = deviceIn(query);
    const text = device ? device.rest : query;
    const soldSlug = device && isSold(device.slug) ? device.slug : null;
    const hits = soldSlug ? this.forDevice(soldSlug, text) : text ? rankByText(this.docs(), text) : [];
    const templates = hits.filter((h) => h.doc.type === 'template');
    const products = hits.filter((h) => h.doc.type === 'product');
    // Help pages only when their own words clearly match ("hủy đơn", "hoàn tiền"…), at most 2.
    // Synonym points are left out, so "hoa" (flowers) does not bring up "hóa đơn".
    const help = hits.filter((h) => h.doc.type === 'help' && h.score - h.reasons.length * 3 >= 5).slice(0, 2);
    const sold = !!device && isSold(device.slug);
    return {
      query,
      device: sold ? device!.name : null,
      unsoldDevice: device && !sold ? device.name : null,
      orderCode,
      templates,
      products,
      help,
      total: templates.length + products.length + help.length,
    };
  }

  /**
   * Query that names a phone we sell ("Galaxy S24", "ốp mèo ip15 pro max"): only items made for that
   * phone, ranked by the rest of the query; with nothing else typed, all of them (most popular first).
   * Product links open on that phone (?model=).
   */
  private forDevice(slug: string, rest: string): SearchHit[] {
    const pool = this.docs()
      .filter((d) => d.type === 'help' || d.devices?.includes(slug))
      .map((d) => (d.type === 'product' ? { ...d, queryParams: { ...d.queryParams, model: slug } } : d));
    if (rest) return rankByText(pool, rest);
    return pool
      .filter((d) => d.type !== 'help')
      .map((doc) => ({ doc, score: (doc.boost ?? 0) - (doc.outOfStock ? 2 : 0), reasons: [] }))
      .sort((a, b) => b.score - a.score);
  }

  /** "Gợi ý theo mô tả" (runs in the browser, explains each suggestion). */
  suggest(description: string) {
    const r = suggestByDescription(this.docs().filter((d) => d.type !== 'help'), description);
    return { concepts: r.concepts, hits: r.hits.slice(0, 12) };
  }

  async searchByImage(file: File | undefined): Promise<boolean> {
    if (!file) return false;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5_000_000) {
      this.imageMessage.set('Chỉ nhận ảnh JPG, PNG hoặc WebP, tối đa 5 MB.');
      return false;
    }
    this.imageBusy.set(true);
    try {
      const palette = await paletteOfImage(file);
      if (!palette.length) throw new Error('empty');
      await this.colors.ensure(this.rawDocs());
      const match = rankByImage(this.docs().filter((d) => d.type !== 'help'), palette);
      this.clearImage();
      this.image.set({ preview: URL.createObjectURL(file), palette: palette.map(swatchView), ...match });
      this.imageMessage.set('');
      return true;
    } catch {
      this.imageMessage.set('Không đọc được ảnh này, bạn thử ảnh khác nhé.');
      return false;
    } finally {
      this.imageBusy.set(false);
    }
  }

  clearImage(): void {
    const img = this.image();
    if (img) URL.revokeObjectURL(img.preview);
    this.image.set(null);
    this.imageMessage.set('');
  }

  /** Keeps the last 8 searches (per browser). */
  remember(query: string): void {
    const q = query.trim();
    if (q.length < 2) return;
    const next = [q, ...this.recent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    this.recent.set(next);
    writeList(RECENT_KEY, next);
  }

  clearRecent(): void {
    this.recent.set([]);
    writeList(RECENT_KEY, []);
  }

  /** Query log without personal data (word, result count, time) for the team. */
  log(query: string, results: number, mode: SearchMode): void {
    const q = query.trim();
    if (!q) return;
    const list = readLog();
    list.push({ q, n: results, mode, at: new Date().toISOString() });
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(-300)));
    } catch {
      /* storage full: skip */
    }
  }

  /** Most searched words and words with no result (admin Insights). */
  readonly stats = computed(() => {
    this.recent(); // refresh when a search happens
    const list = readLog();
    const count = (items: typeof list) => {
      const m = new Map<string, number>();
      items.forEach((i) => m.set(i.q.toLowerCase(), (m.get(i.q.toLowerCase()) ?? 0) + 1));
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    };
    return { total: list.length, top: count(list), empty: count(list.filter((i) => i.n === 0)) };
  });
}

function readList(key: string): string[] {
  try {
    const v: unknown = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(key)) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: readonly string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function readLog(): { q: string; n: number; mode: SearchMode; at: string }[] {
  try {
    const v: unknown = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(LOG_KEY)) || '[]');
    return Array.isArray(v) ? (v as { q: string; n: number; mode: SearchMode; at: string }[]) : [];
  } catch {
    return [];
  }
}
