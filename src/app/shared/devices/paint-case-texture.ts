import type { CaseType, PhoneModel } from './devices';
import { fallbackArt } from './case-art';
import { aspectRatio, CASE_CORNER_RADIUS, cutoutBox, cutoutRadius, cutoutShape, lenses, rimWidth } from './case-geometry';

export interface CaseTextureOptions {
  /** Flat artwork printed on the back (cover-fitted). */
  readonly artworkUrl: string;
  /** Case colour: rim, bumper and camera bezel. */
  readonly colorHex: string;
  readonly caseType: CaseType;
  /** Picks the fallback background when there is no artwork (same seed as the 2D preview). */
  readonly seed?: string;
  /** Texture width in px (height follows the device aspect ratio). */
  readonly width?: number;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  let p = imageCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(url);
        reject(new Error(`Cannot load ${url}`));
      };
      img.src = url;
    });
    imageCache.set(url, p);
  }
  return p;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** Camera path in canvas px (adds sub-paths; caller fills or strokes). */
function cameraPath(ctx: CanvasRenderingContext2D, model: PhoneModel, W: number, H: number, grow = 0): void {
  const box = cutoutBox(model);
  const x = (box.left / 100) * W - grow;
  const y = (box.top / 100) * H - grow;
  const w = (box.width / 100) * W + grow * 2;
  const h = (box.height / 100) * H + grow * 2;
  const shape = cutoutShape(model);
  if (shape === 'column') {
    for (const l of lenses(model)) {
      const r = ((l.d / 100) * w) / 2;
      const cx = x + (l.x / 100) * w;
      const cy = y + (l.y / 100) * h;
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  } else if (shape === 'ring') {
    const r = Math.min(w, h) / 2;
    ctx.moveTo(x + w / 2 + r, y + h / 2);
    ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
  } else {
    roundRect(ctx, x, y, w, h, (cutoutRadius(model) / 100) * w);
  }
}

/**
 * Paints the case back (artwork, camera cut-out, rim) onto `canvas`.
 * Extracted from the studio's `sync3dTexture`, limited to a single image artwork.
 */
export async function paintCaseTexture(
  canvas: HTMLCanvasElement,
  model: PhoneModel,
  opts: CaseTextureOptions,
): Promise<void> {
  const W = opts.width ?? 600;
  const H = Math.round(W / aspectRatio(model));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const corner = (CASE_CORNER_RADIUS / 100) * W;
  const rim = (rimWidth(opts.caseType) / 100) * W;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, H, corner);
  ctx.clip();

  ctx.fillStyle = opts.colorHex;
  ctx.fillRect(0, 0, W, H);

  // Missing artwork → the same seeded Bg_Case background + tint the 2D preview uses.
  const fb = fallbackArt(opts.seed || `${opts.artworkUrl}|${model.id}|${opts.colorHex}`);
  let tint: string | null = null;
  try {
    const img = opts.artworkUrl
      ? await loadImage(opts.artworkUrl).catch(() => ((tint = fb.tint), loadImage(fb.url)))
      : ((tint = fb.tint), await loadImage(fb.url));
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.globalAlpha = opts.caseType === 'clear' ? 0.9 : 1;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
    if (tint) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  } catch {
    // Keep the solid case colour when the artwork is missing.
  }

  // MagSafe ring.
  if (opts.caseType === 'magsafe') {
    ctx.lineWidth = W * 0.018;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.55, W * 0.24, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Camera cut-out through the print.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  cameraPath(ctx, model, W, H);
  ctx.fill();
  ctx.restore();

  // Rim and camera bezel in the case colour.
  ctx.strokeStyle = opts.colorHex;
  ctx.lineWidth = rim * 2;
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, H, corner);
  ctx.stroke();

  ctx.lineWidth = W * 0.02;
  ctx.beginPath();
  cameraPath(ctx, model, W, H, W * 0.005);
  ctx.stroke();

  ctx.restore();
}
