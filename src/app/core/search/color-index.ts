import { Injectable, signal } from '@angular/core';
import { Palette, mixPalettes, paletteFromCss, paletteOfImage } from '../../shared/search/color';
import { SearchDoc } from '../../shared/search/search.types';

const CACHE_KEY = 'caseyes.search.palette.v2';
/** Middle of a product photo, where the case stands. */
const CASE_AREA = { x: 0.3, y: 0.15, w: 0.4, h: 0.7 };

/**
 * Reads the main colors of every case / template picture once (48×48 sample, in the browser) so
 * "Tìm bằng ảnh" and the color part of "Gợi ý theo mô tả" compare real pictures, not hand-typed
 * colors. Results are kept per image URL in localStorage; a new picture is read on first use.
 *
 * Scale: ~1 ms per picture, a few hundred pictures stay instant. With thousands of products the
 * palette should be computed once at upload time and stored with the product (see BRD/SRD §B5).
 */
@Injectable({ providedIn: 'root' })
export class ColorIndex {
  /** image URL → palette */
  private readonly palettes = signal<ReadonlyMap<string, Palette>>(new Map(Object.entries(readCache())));
  private readonly pending = new Map<string, Promise<void>>();

  /** The document with the palette of its picture (template: artwork 70% + background 30%). */
  withPalette(doc: SearchDoc): SearchDoc {
    const fromImage = doc.image ? this.palettes().get(doc.image) : undefined;
    if (!fromImage?.length) return doc;
    const palette = doc.background ? mixPalettes([{ palette: fromImage, w: 0.7 }, { palette: paletteFromCss(doc.background), w: 0.3 }]) : fromImage;
    return { ...doc, palette };
  }

  /** Reads the pictures not read yet. Resolves when all are done (failures are skipped). */
  async ensure(docs: readonly SearchDoc[]): Promise<void> {
    if (typeof document === 'undefined') return;
    const todo = new Map<string, boolean>();
    for (const d of docs) if (d.image && !this.palettes().has(d.image)) todo.set(d.image, d.type === 'product');
    await Promise.all([...todo].map(([url, isPhoto]) => this.read(url, isPhoto)));
  }

  /** Product photo: the case (middle, 75%) counts more than the studio background (25%). */
  private read(url: string, isPhoto: boolean): Promise<void> {
    let job = this.pending.get(url);
    if (!job) {
      job = loadImage(url)
        .then(async (img) =>
          isPhoto
            ? mixPalettes([{ palette: await paletteOfImage(img, CASE_AREA), w: 0.75 }, { palette: await paletteOfImage(img), w: 0.25 }])
            : paletteOfImage(img),
        )
        .then((palette) => {
          if (!palette.length) return;
          const next = new Map(this.palettes());
          next.set(url, palette);
          this.palettes.set(next);
          writeCache(next);
        })
        .catch(() => undefined);
      this.pending.set(url, job);
    }
    return job;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  return img.decode().then(() => img);
}

function readCache(): Record<string, Palette> {
  try {
    const v: unknown = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(CACHE_KEY)) || '{}');
    return v && typeof v === 'object' ? (v as Record<string, Palette>) : {};
  } catch {
    return {};
  }
}

function writeCache(map: ReadonlyMap<string, Palette>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    /* storage full: palettes are read again next time */
  }
}
