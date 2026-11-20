/**
 * Color profile shared by "Tìm bằng ảnh" and "Gợi ý theo mô tả".
 *
 * One pipeline for both sides:
 *   picture (photo or case image) → palette (up to 4 main colors + weight)
 *                                 → color names (tím, xanh lá…) = the same color concepts as the lexicon.
 * A photo and a case are compared palette-to-palette in CIELAB (ΔE, close to how eyes judge colors),
 * and a description like "ốp xanh lá" is compared with the same case palettes through the reference
 * color of each name. Runs in the browser, no external service.
 */

export type Rgb = readonly [number, number, number];
export interface Swatch {
  readonly rgb: Rgb;
  /** Share of the picture, 0–1 (weights of one palette add up to 1). */
  readonly w: number;
}
export type Palette = readonly Swatch[];

/** Reference color of each color concept (ids from lexicon.ts). */
export const COLOR_REFERENCE: Readonly<Record<string, Rgb>> = {
  tim: [150, 110, 210],
  hong: [240, 150, 190],
  do: [210, 45, 55],
  cam: [240, 140, 50],
  vang: [240, 205, 70],
  'xanh-la': [90, 170, 100],
  'xanh-duong': [70, 130, 210],
  den: [30, 28, 36],
  trang: [245, 243, 248],
  pastel: [225, 210, 240],
};

const COLOR_LABEL: Readonly<Record<string, string>> = {
  tim: 'tím', hong: 'hồng', do: 'đỏ', cam: 'cam', vang: 'vàng', 'xanh-la': 'xanh lá',
  'xanh-duong': 'xanh dương', den: 'đen', trang: 'trắng', pastel: 'pastel',
};

export function colorLabel(id: string): string {
  return COLOR_LABEL[id] ?? id;
}

// ---------- color math ----------

function toLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** sRGB → CIELAB (D65). */
export function rgbToLab([r, g, b]: Rgb): [number, number, number] {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b);
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** Perceived difference between two colors (CIE76 ΔE: ~2 barely visible, >40 clearly different). */
export function deltaE(a: Rgb, b: Rgb): number {
  const [l1, a1, b1] = rgbToLab(a);
  const [l2, a2, b2] = rgbToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

function hsl([r, g, b]: Rgb): { h: number; s: number; l: number } {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? ((G - B) / d + (G < B ? 6 : 0)) * 60 : max === G ? ((B - R) / d + 2) * 60 : ((R - G) / d + 4) * 60;
  return { h, s, l };
}

/** Color concept ids for one color ("tím", plus "pastel" when light and soft). */
export function namesOf(rgb: Rgb): string[] {
  const { h, s, l } = hsl(rgb);
  if (l < 0.16 || (s < 0.15 && l < 0.35)) return ['den'];
  // Very light: white unless clearly tinted (light lavender cases count as tím + pastel).
  if (l > 0.95 || (l > 0.9 && s < 0.5) || (s < 0.12 && l > 0.7)) return ['trang'];
  if (s < 0.12) return [];
  const names: string[] = [];
  if (h < 12 || h >= 340) names.push(l > 0.72 ? 'hong' : 'do');
  else if (h < 40) names.push('cam');
  else if (h < 68) names.push('vang');
  else if (h < 165) names.push('xanh-la');
  else if (h < 250) names.push('xanh-duong');
  else if (h < 295) names.push('tim');
  else names.push('hong');
  if (l > 0.72 && s > 0.2) names.push('pastel');
  return names;
}

/** Color names of a palette, main colors first (swatches under 12% are ignored). */
export function paletteNames(palette: Palette): string[] {
  const score = new Map<string, number>();
  for (const sw of palette) {
    if (sw.w < 0.12) continue;
    for (const n of namesOf(sw.rgb)) score.set(n, (score.get(n) ?? 0) + sw.w);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

/**
 * How close two palettes look, 0 (nothing alike) – 1 (same colors).
 * Each main color of `query` looks for its nearest color in `target`; ΔE ≥ 45 counts as no match.
 */
export function paletteSimilarity(query: Palette, target: Palette): number {
  if (!query.length || !target.length) return 0;
  let sum = 0;
  for (const q of query) {
    const nearest = Math.min(...target.map((t) => deltaE(q.rgb, t.rgb) - Math.min(t.w, 0.5) * 6));
    sum += q.w * Math.max(0, 1 - nearest / 45);
  }
  return sum;
}

// ---------- palette extraction ----------

/**
 * Main colors of RGBA pixels: colors are grouped into buckets (32 levels per channel), the
 * biggest buckets are kept and near-identical ones (ΔE < 10) merged.
 */
export function paletteFromPixels(px: Uint8ClampedArray | readonly number[], max = 4): Palette {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  let total = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const key = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
    const bk = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bk.r += px[i]; bk.g += px[i + 1]; bk.b += px[i + 2]; bk.n++;
    buckets.set(key, bk);
    total++;
  }
  if (!total) return [];
  const merged: { rgb: Rgb; n: number }[] = [];
  for (const bk of [...buckets.values()].sort((a, b) => b.n - a.n)) {
    const rgb: Rgb = [Math.round(bk.r / bk.n), Math.round(bk.g / bk.n), Math.round(bk.b / bk.n)];
    const near = merged.find((m) => deltaE(m.rgb, rgb) < 10);
    if (near) near.n += bk.n;
    else merged.push({ rgb, n: bk.n });
  }
  const top = merged.sort((a, b) => b.n - a.n).slice(0, max).filter((m) => m.n / total >= 0.04);
  const kept = top.reduce((s, m) => s + m.n, 0);
  return top.map((m) => ({ rgb: m.rgb, w: m.n / kept }));
}

/** Palette from hex colors of a CSS gradient (template background), equal weights. */
export function paletteFromCss(css: string | undefined): Palette {
  const hexes = css?.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi) ?? [];
  const rgbs = hexes.map((h) => {
    const x = h.slice(1);
    const full = x.length === 3 ? x.split('').map((c) => c + c).join('') : x;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)] as Rgb;
  });
  return rgbs.map((rgb) => ({ rgb, w: 1 / rgbs.length }));
}

/** Mixes palettes with weights (e.g. template artwork 70% + its background 30%). */
export function mixPalettes(parts: readonly { palette: Palette; w: number }[]): Palette {
  const used = parts.filter((p) => p.palette.length);
  const total = used.reduce((s, p) => s + p.w, 0) || 1;
  return used.flatMap((p) => p.palette.map((sw) => ({ rgb: sw.rgb, w: (sw.w * p.w) / total })));
}

/**
 * Palette of a picture source (File, loaded <img>…), sampled at 48×48. Browser only.
 * `crop` (fractions of the picture) reads only a part, e.g. the middle where the case stands in a
 * product photo, so the shared studio background does not make every case look the same.
 */
export async function paletteOfImage(source: ImageBitmapSource, crop?: { x: number; y: number; w: number; h: number }): Promise<Palette> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 48;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  const c = crop ?? { x: 0, y: 0, w: 1, h: 1 };
  ctx.drawImage(bitmap, c.x * bitmap.width, c.y * bitmap.height, c.w * bitmap.width, c.h * bitmap.height, 0, 0, 48, 48);
  bitmap.close();
  return paletteFromPixels(ctx.getImageData(0, 0, 48, 48).data);
}

export function cssOf(rgb: Rgb): string {
  return `rgb(${rgb.join(', ')})`;
}
