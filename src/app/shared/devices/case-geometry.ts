import type { CaseType, PhoneModel } from './devices';

/**
 * Camera module shapes, derived from `CameraCutout` data (never from model ids):
 * - `ring`: one circular module (borderRadius ≥ 999), e.g. Xiaomi 14 Ultra.
 * - `column`: tall, narrow strip of separate lenses, e.g. Galaxy S24.
 * - `island`: rounded-square island with a lens grid, e.g. iPhone Pro.
 */
export type CutoutShape = 'ring' | 'column' | 'island';

export interface Lens {
  /** Centre and diameter, in % of the cutout box (diameter relative to the box width). */
  readonly x: number;
  readonly y: number;
  readonly d: number;
}

/** Width / height of the printable back. */
export function aspectRatio(model: PhoneModel): number {
  return model.printWidthMm / model.printHeightMm;
}

export function cutoutShape(model: PhoneModel): CutoutShape {
  const c = model.safeZoneMask.cameraCutout;
  if (c.borderRadius >= 999) return 'ring';
  // Compare in mm so the result does not depend on the device's aspect ratio.
  const wMm = (c.widthPercent / 100) * model.printWidthMm;
  const hMm = (c.heightPercent / 100) * model.printHeightMm;
  return hMm > wMm * 1.6 ? 'column' : 'island';
}

/** Cutout box as CSS percentages of the case back. */
export function cutoutBox(model: PhoneModel): { left: number; top: number; width: number; height: number } {
  const c = model.safeZoneMask.cameraCutout;
  return { left: c.xPercent, top: c.yPercent, width: c.widthPercent, height: c.heightPercent };
}

/**
 * Corner radius of the cutout as a % of the cutout width.
 * Studio radii are in px of a 300px-wide case viewport.
 */
export function cutoutRadius(model: PhoneModel): number {
  const c = model.safeZoneMask.cameraCutout;
  if (c.borderRadius >= 999) return 50;
  const widthPx = (c.widthPercent / 100) * 300;
  return Math.min(50, (c.borderRadius / widthPx) * 100);
}

/** Lens layout inside the cutout box. */
export function lenses(model: PhoneModel): Lens[] {
  const n = Math.max(1, model.safeZoneMask.cameraCutout.lensCount);
  switch (cutoutShape(model)) {
    case 'column': {
      const step = 100 / n;
      return Array.from({ length: n }, (_, i) => ({ x: 50, y: step * (i + 0.5), d: 84 }));
    }
    case 'ring': {
      const pos = [[32, 32], [68, 32], [32, 68], [68, 68]];
      return pos.slice(0, Math.min(n, 4)).map(([x, y]) => ({ x, y, d: 30 }));
    }
    default: {
      // iPhone-style triangle (3) or 2×2 grid.
      const pos = n === 3 ? [[28, 28], [28, 72], [72, 50]] : [[28, 28], [72, 28], [28, 72], [72, 72]];
      return pos.slice(0, Math.min(n, 4)).map(([x, y]) => ({ x, y, d: 40 }));
    }
  }
}

/** Visible rim thickness per case type, as % of the case width. */
export function rimWidth(caseType: CaseType): number {
  switch (caseType) {
    case 'tough':
    case 'magsafe':
      return 4;
    case 'snap':
      return 2;
    case 'clear':
      return 2.5;
    default:
      return 3;
  }
}

/** Outer corner radius of the case, as % of the case width (studio: 50px on 300px). */
export const CASE_CORNER_RADIUS = 16.7;

/** Readable foreground (ink or white) for a hex background. */
export function contrastInk(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return '#0A0A0A';
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#0A0A0A' : '#FFFFFF';
}
