import { COLOR_REFERENCE, Palette, colorLabel, paletteNames, paletteSimilarity } from './color';
import { Concept, conceptsIn } from './lexicon';
import { editDistance, normalizeVi, tokensOf } from './normalize-vi';
import { SearchDoc, SearchHit } from './search.types';

/** Words that carry no meaning in a shopper's query. */
const STOP = new Set(['op', 'lung', 'op lung', 'cho', 'co', 'mau', 'kieu', 'cai', 'mot', 'va', 'voi', 'minh', 'toi', 'em', 'ban', 'muon', 'can', 'thich', 'de', 'la', 'cua', 'nhung', 'nhe', 'a', 'oi']);

interface Prepared {
  readonly doc: SearchDoc;
  readonly title: string;
  readonly titleTokens: readonly string[];
  readonly sub: string;
  readonly body: string;
  readonly allTokens: readonly string[];
  /** Title + subtitle/style tokens: the only place a typo may match. */
  readonly headTokens: readonly string[];
  /** Concepts from words + main colors of the picture (used by suggestions and photo search). */
  readonly concepts: ReadonlySet<string>;
  /** Concepts from words only (keyword search stays precise). */
  readonly textConcepts: ReadonlySet<string>;
}

const cache = new WeakMap<SearchDoc, Prepared>();

function prepare(doc: SearchDoc): Prepared {
  let p = cache.get(doc);
  if (!p) {
    const title = normalizeVi(doc.title);
    const sub = normalizeVi(`${doc.subtitle ?? ''} ${doc.style ?? ''}`);
    const body = normalizeVi(doc.text ?? '');
    const words = conceptsIn(`${doc.title} ${doc.subtitle ?? ''} ${doc.style ?? ''} ${doc.text ?? ''}`).map((c) => c.id);
    p = {
      doc,
      title,
      titleTokens: title.split(' '),
      sub,
      body,
      allTokens: `${title} ${sub} ${body}`.split(' ').filter(Boolean),
      headTokens: `${title} ${sub}`.split(' ').filter(Boolean),
      textConcepts: new Set(words),
      // plus the 2 main color names seen in the picture (same names a photo gets)
      concepts: new Set([...words, ...paletteNames(doc.palette ?? []).slice(0, 2)]),
    };
    cache.set(doc, p);
  }
  return p;
}

/** Points for one query word in one document (0 = not found). */
function wordScore(p: Prepared, word: string): number {
  // Prefix match ("lav" → lavender) only from 4 letters: without accents, short Vietnamese
  // syllables are prefixes of many others ("hoa" ⊂ "hoan", "hoat").
  const needle = word.length >= 4 ? ' ' + word : ' ' + word + ' ';
  const inField = (field: string) => (' ' + field + ' ').includes(needle);
  if (p.titleTokens.includes(word)) return 6;
  if (inField(p.title)) return 5; // prefix of a title word
  if (inField(p.sub)) return 3;
  if (inField(p.body)) return 2;
  // One typo on longer words (FR-SRCH-04), only against the title and tags: matching typos inside
  // long descriptions let everyday words ("nhau" ≈ "nhat") hit almost every product.
  if (word.length >= 4 && p.headTokens.some((t) => t.length >= 4 && editDistance(t, word, 1) <= 1)) return 1.5;
  return 0;
}

/**
 * Text search: most query words must be found; title beats tags beats description; matching
 * concepts (synonyms) count too, so "dẻo" finds TPU cases and "meo" finds kittens.
 */
export function rankByText(docs: readonly SearchDoc[], query: string): SearchHit[] {
  const words = tokensOf(query).filter((w) => !STOP.has(w));
  const concepts = conceptsIn(query);
  if (!words.length && !concepts.length) return [];
  const phrase = normalizeVi(query);
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const p = prepare(doc);
    let matched = 0;
    let score = 0;
    for (const w of words) {
      const s = wordScore(p, w);
      if (s > 0) matched++;
      score += s;
    }
    const conceptHits = concepts.filter((c) => p.textConcepts.has(c.id));
    score += conceptHits.length * 3;
    // A picture that looks like the color asked adds a little, but never makes a result on its own.
    score += concepts.filter((c) => !p.textConcepts.has(c.id) && p.concepts.has(c.id)).length;
    const needed = Math.max(1, Math.ceil(words.length * 0.6));
    if (matched < needed && conceptHits.length === 0) continue;
    if (phrase.length > 2 && (' ' + p.title + ' ').includes(phrase.length >= 4 ? ' ' + phrase : ` ${phrase} `)) score += 6;
    score += (doc.boost ?? 0) * 0.5;
    if (doc.outOfStock) score -= 2;
    if (score > 0) hits.push({ doc, score, reasons: conceptHits.map((c) => c.label) });
  }
  return hits.sort((a, b) => b.score - a.score);
}

const GROUP_WEIGHT: Record<Concept['group'], number> = { theme: 4, style: 3, color: 2.5, material: 1.5, occasion: 1 };

/** How much a document's picture looks like a named color (0–1), from its palette. */
function looksLike(doc: SearchDoc, colorId: string): number {
  const ref = COLOR_REFERENCE[colorId];
  return ref && doc.palette?.length ? paletteSimilarity([{ rgb: ref, w: 1 }], doc.palette) : 0;
}

/**
 * "Gợi ý theo mô tả": read colors, styles, themes, occasions and materials from a free-text
 * description and rank cases/templates by how many of them they match. Colors are checked twice:
 * in the words (tags) and in the picture itself (palette), the same way a photo is matched.
 * Runs in the browser (no external AI); every suggestion explains which wishes it matches.
 */
export function suggestByDescription(docs: readonly SearchDoc[], description: string): { concepts: Concept[]; hits: SearchHit[] } {
  const concepts = conceptsIn(description);
  const colors = concepts.filter((c) => c.group === 'color');
  const textHits = new Map(rankByText(docs, description).map((h) => [h.doc, h.score]));
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const p = prepare(doc);
    const matched = concepts.filter((c) => p.concepts.has(c.id));
    // "quà / cặp đôi / gen z" fit any design, they only add a little when other wishes match
    const strong = matched.filter((c) => c.group !== 'occasion');
    let score = matched.reduce((s, c) => s + GROUP_WEIGHT[c.group], 0) + (textHits.get(doc) ?? 0) * 0.3;
    // Visual color closeness (0–2 per color asked), so a purple-looking case counts as "tím" even untagged.
    score += colors.reduce((s, c) => s + 2 * looksLike(doc, c.id), 0);
    if (!strong.length && !textHits.has(doc)) continue;
    // When colors were asked, a case that matches none of them (neither tag nor look) drops back.
    if (colors.length && !colors.some((c) => p.concepts.has(c.id) || looksLike(doc, c.id) > 0.5)) score -= 3;
    score += (doc.boost ?? 0) * 0.4;
    if (doc.outOfStock) score -= 2;
    if (score > 0) hits.push({ doc, score, reasons: matched.map((c) => c.label) });
  }
  return { concepts, hits: hits.sort((a, b) => b.score - a.score) };
}

export interface ImageMatch {
  /** Color names read from the photo ("xanh lá", "trắng"…), main first. */
  readonly names: readonly string[];
  /** Cases/templates of the same tones (similarity ≥ 0.4). */
  readonly hits: readonly SearchHit[];
  /** Nearest ones, shown only when nothing is close enough. */
  readonly nearest: readonly SearchHit[];
}

/**
 * "Tìm bằng ảnh": photo palette ↔ each case's palette (ΔE in CIELAB), plus the shared color names.
 * Returns an honest split: same tones, or "nothing alike, here are the nearest".
 */
export function rankByImage(docs: readonly SearchDoc[], photo: Palette): ImageMatch {
  const names = paletteNames(photo).slice(0, 3);
  const scored = docs
    .filter((d) => d.palette?.length)
    .map((doc) => {
      const p = prepare(doc);
      const sim = paletteSimilarity(photo, doc.palette!);
      const shared = names.filter((n) => p.concepts.has(n));
      return { doc, sim, score: sim * 10 + shared.length * 1.5 + (doc.boost ?? 0) * 0.3 - (doc.outOfStock ? 2 : 0), reasons: shared.map(colorLabel) };
    })
    .sort((a, b) => b.score - a.score);
  const close = scored.filter((h) => h.sim >= 0.4);
  const strip = ({ doc, score, reasons }: (typeof scored)[number]): SearchHit => ({ doc, score, reasons });
  return {
    names: names.map(colorLabel),
    hits: close.slice(0, 12).map(strip),
    nearest: close.length ? [] : scored.slice(0, 6).map(strip),
  };
}
