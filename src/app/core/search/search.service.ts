import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { deviceIn, orderCodeIn } from '../../shared/search/lexicon';
import { averageColor, rankByColor, rankByText, suggestByDescription } from '../../shared/search/rank';
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
  readonly device: string | null;
  readonly orderCode: string | null;
  readonly templates: readonly SearchHit[];
  readonly products: readonly SearchHit[];
  readonly help: readonly SearchHit[];
  readonly total: number;
}

/** Shown before typing (team list, replaced later by the most searched words). */
export const POPULAR_KEYWORDS: readonly string[] = ['Mèo', 'Hoa lá', 'Tối giản', 'Y2K', 'Typography', 'Dẻo chống sốc', 'Quà tặng', 'Phong cảnh'];
export const POPULAR_DEVICES: readonly string[] = ['iPhone 16 Pro Max', 'iPhone 15 Pro Max', 'iPhone 15', 'Galaxy S24'];
export const SUGGEST_EXAMPLES: readonly string[] = [
  'Ốp tím pastel có mèo',
  'Quà sinh nhật cho bạn thích game',
  'Tối giản đen trắng',
  'Phong cảnh Nhật Bản nhẹ nhàng',
];

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

  readonly docs = computed(() => this.sources.flatMap((s) => s.docs()));
  readonly isOpen = signal(false);
  readonly mode = signal<SearchMode>('text');
  readonly query = signal('');
  readonly recent = signal<readonly string[]>(readList(RECENT_KEY));
  readonly image = signal<{ preview: string; color: string; hits: readonly SearchHit[] } | null>(null);
  readonly imageMessage = signal('');
  readonly imageBusy = signal(false);

  open(mode: SearchMode = 'text', prefill = ''): void {
    this.mode.set(mode);
    if (prefill) this.query.set(prefill);
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
    const hits = text ? rankByText(this.docs(), text) : [];
    const templates = hits.filter((h) => h.doc.type === 'template');
    const products = hits.filter((h) => h.doc.type === 'product');
    // Help pages only when their own words clearly match ("hủy đơn", "hoàn tiền"…), at most 2.
    // Synonym points are left out, so "hoa" (flowers) does not bring up "hóa đơn".
    const help = hits.filter((h) => h.doc.type === 'help' && h.score - h.reasons.length * 3 >= 5).slice(0, 2);
    return { query, device: device?.name ?? null, orderCode, templates, products, help, total: templates.length + products.length + help.length };
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
      const rgb = await averageColor(file);
      const preview = URL.createObjectURL(file);
      this.image.set({ preview, color: `rgb(${rgb.join(', ')})`, hits: rankByColor(this.docs(), rgb).slice(0, 12) });
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
