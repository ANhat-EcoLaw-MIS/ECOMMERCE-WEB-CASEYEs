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
  readonly concepts: ReadonlySet<string>;
}

const cache = new WeakMap<SearchDoc, Prepared>();

function prepare(doc: SearchDoc): Prepared {
  let p = cache.get(doc);
  if (!p) {
    const title = normalizeVi(doc.title);
    const sub = normalizeVi(`${doc.subtitle ?? ''} ${doc.style ?? ''}`);
    const body = normalizeVi(doc.text ?? '');
    p = {
      doc,
      title,
      titleTokens: title.split(' '),
      sub,
      body,
      allTokens: `${title} ${sub} ${body}`.split(' ').filter(Boolean),
      concepts: new Set(conceptsIn(`${doc.title} ${doc.subtitle ?? ''} ${doc.style ?? ''} ${doc.text ?? ''}`).map((c) => c.id)),
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
  // one typo on longer words
  if (word.length >= 4 && p.allTokens.some((t) => t.length >= 4 && editDistance(t, word, 1) <= 1)) return 1.5;
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
    const conceptHits = concepts.filter((c) => p.concepts.has(c.id));
    score += conceptHits.length * 3;
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

/**
 * "Gợi ý theo mô tả": read colors, styles, themes, occasions and materials from a free-text
 * description and rank cases/templates by how many of them they match. Runs in the browser
 * (no external AI); every suggestion explains which wishes it matches.
 */
export function suggestByDescription(docs: readonly SearchDoc[], description: string): { concepts: Concept[]; hits: SearchHit[] } {
  const concepts = conceptsIn(description);
  const textHits = new Map(rankByText(docs, description).map((h) => [h.doc, h.score]));
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const p = prepare(doc);
    const matched = concepts.filter((c) => p.concepts.has(c.id));
    // "quà / cặp đôi / gen z" fit any design, they only add a little when other wishes match
    const strong = matched.filter((c) => c.group !== 'occasion');
    let score = matched.reduce((s, c) => s + GROUP_WEIGHT[c.group], 0) + (textHits.get(doc) ?? 0) * 0.3;
    if (!strong.length && !textHits.has(doc)) continue;
    score += (doc.boost ?? 0) * 0.4;
    if (doc.outOfStock) score -= 2;
    hits.push({ doc, score, reasons: matched.map((c) => c.label) });
  }
  return { concepts, hits: hits.sort((a, b) => b.score - a.score) };
}

/** "Tìm bằng ảnh": order documents by distance to the photo's average color. */
export function rankByColor(docs: readonly SearchDoc[], rgb: readonly [number, number, number]): SearchHit[] {
  const dist = (c: readonly [number, number, number]) => (c[0] - rgb[0]) ** 2 * 0.299 + (c[1] - rgb[1]) ** 2 * 0.587 + (c[2] - rgb[2]) ** 2 * 0.114;
  return docs
    .filter((d) => d.color)
    .map((doc) => ({ doc, score: -dist(doc.color!), reasons: [] }))
    .sort((a, b) => b.score - a.score);
}

/** Average color of an image file (64×64 sample, transparent pixels ignored). */
export async function averageColor(file: File): Promise<[number, number, number]> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, 64, 64);
  bitmap.close();
  const px = ctx.getImageData(0, 0, 64, 64).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 80) continue;
    r += px[i];
    g += px[i + 1];
    b += px[i + 2];
    n++;
  }
  if (!n) throw new Error('transparent');
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/** First hex color of a CSS gradient/color string (template backgrounds). */
export function colorOf(css: string | undefined): [number, number, number] | undefined {
  const m = css?.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (!m) return undefined;
  const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
