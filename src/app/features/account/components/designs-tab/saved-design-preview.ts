import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import type { SavedDesignItem } from '../../../design-studio/services/studio-state';
import type { CanvasLayer } from '../../../design-studio/models/canvas-element.model';
import { DEFAULT_DEVICE, findDevice } from '../../../../shared/devices/devices';
import { cutoutBox, cutoutRadius, cutoutShape, lenses } from '../../../../shared/devices/case-geometry';

/** The Design Studio canvas is a fixed 300 × 632 px viewport; layers are stored relative to it. */
const STAGE_W = 300;
const STAGE_H = 632;

const IMAGE_FILTERS: Record<string, string> = {
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(80%) contrast(105%)',
  warm: 'sepia(25%) saturate(140%) brightness(105%)',
  cool: 'saturate(110%) hue-rotate(185deg) contrast(105%)',
  vivid: 'contrast(130%) saturate(145%)',
};

/**
 * Saved design thumbnail that looks exactly like the Design Studio canvas.
 *
 * It renders the design at the studio's native 300 × 632 px with the same layer markup
 * (position, rotation, flips, crop, filters, text box) and scales the whole stage to the
 * card width, so percentages, pixel sizes and fonts keep the proportions they had in the studio.
 */
@Component({
  selector: 'app-saved-design-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    role: 'img',
    '[attr.aria-label]': "'Bản thiết kế ' + design().name",
    '[style.aspect-ratio]': "'300 / 632'",
  },
  styles: `
    .lens {
      position: absolute;
      aspect-ratio: 1;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: radial-gradient(circle at 40% 35%, #2a2d36 0%, #121316 55%, #050607 100%);
      box-shadow: 0 0 0 3px #27272a, inset 0 1px 2px rgb(255 255 255 / 0.12);
    }
  `,
  template: `
    <div
      class="absolute left-0 top-0 origin-top-left overflow-clip rounded-[50px]"
      [style.width.px]="stageW"
      [style.height.px]="stageH"
      [style.transform]="'scale(' + scale() + ')'"
      [style.background]="design().bg"
      [style.box-shadow]="'inset 0 0 0 5px ' + rim + ', inset 0 1px 2px rgba(255,255,255,0.45)'"
    >
      @for (layer of design().layers; track layer.id) {
        @if (layer.type !== 'background') {
          <div
            class="pointer-events-none absolute"
            [style.left.%]="layer.x"
            [style.top.%]="layer.y"
            [style.z-index]="layer.zIndex"
            [style.opacity]="layer.opacity"
            [style.transform]="'translate(-50%, -50%) rotate(' + layer.rotation + 'deg)'"
          >
            <div
              class="relative block"
              [style.transform]="flip(layer)"
              [style.clip-path]="layer.type === 'text' ? 'none' : crop(layer)"
            >
              @switch (layer.type) {
                @case ('text') {
                  <div
                    class="block whitespace-pre-wrap break-words rounded px-2 py-1 leading-tight"
                    [style.width.px]="(layer.width / 100) * stageW"
                    [style.text-align]="layer.textAlign || 'center'"
                    [style.font-family]="layer.fontFamily"
                    [style.font-size.px]="layer.fontSize"
                    [style.color]="layer.textColor"
                    [style.font-weight]="layer.fontWeight ?? 'bold'"
                    [style.font-style]="layer.fontStyle ?? 'normal'"
                    [style.text-decoration]="layer.textDecoration ?? 'none'"
                  >{{ layer.content }}</div>
                }
                @case ('sticker') {
                  @if (layer.assetUrl) {
                    <img [src]="layer.assetUrl" alt="" loading="lazy" decoding="async" class="block max-w-none" [style.width.px]="(layer.width / 100) * stageW" />
                  } @else {
                    <span class="block leading-none" [style.font-size.px]="(layer.width / 100) * 120">{{ layer.name }}</span>
                  }
                }
                @case ('image') {
                  <img
                    [src]="layer.storageUrl"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    class="block max-w-none rounded-lg object-contain"
                    [style.width.px]="(layer.width / 100) * stageW"
                    [style.filter]="filter(layer.imageFilter)"
                  />
                }
              }
            </div>
          </div>
        }
      }

      <!-- Camera module from the phone's own cutout data (same as the studio and the shop). -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute z-[40]"
        [style.left.%]="box().left"
        [style.top.%]="box().top"
        [style.width.%]="box().width"
        [style.height.%]="shape() === 'ring' ? null : box().height"
        [style.aspect-ratio]="shape() === 'ring' ? '1' : null"
        [style.border-radius]="shape() === 'ring' ? '50%' : shape() === 'island' ? moduleRadius() + 'px' : null"
        [style.background]="shape() === 'column' ? null : 'linear-gradient(145deg, #1e2025 0%, #121316 50%, #0a0b0d 100%)'"
        [style.box-shadow]="shape() === 'column' ? null : '0 12px 24px -3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.12)'"
      >
        @for (lens of lenses(); track $index) {
          <span class="lens" [style.left.%]="lens.x" [style.top.%]="lens.y" [style.width.%]="lens.d"></span>
        }
      </div>

      <!-- Same glass highlight as the studio viewport. -->
      <div class="pointer-events-none absolute inset-0 z-[45] opacity-40 mix-blend-overlay" style="background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.12) 28%, transparent 52%);"></div>
      <div class="pointer-events-none absolute inset-0 z-[45] rounded-[50px] ring-1 ring-inset ring-white/30"></div>
    </div>
  `,
})
export class SavedDesignPreview {
  readonly design = input.required<SavedDesignItem>();

  protected readonly stageW = STAGE_W;
  protected readonly stageH = STAGE_H;
  /** Default studio case stroke (the saved item doesn't store a custom one). */
  protected readonly rim = '#18181b';
  protected readonly scale = signal(1);

  private readonly model = computed(() => findDevice(this.design().modelId) ?? DEFAULT_DEVICE);
  protected readonly shape = computed(() => cutoutShape(this.model()));
  protected readonly box = computed(() => cutoutBox(this.model()));
  protected readonly lenses = computed(() => lenses(this.model()));
  /** Island corner radius in stage px (studio radii are px of the 300px viewport). */
  protected readonly moduleRadius = computed(() => (cutoutRadius(this.model()) / 100) * (this.box().width / 100) * STAGE_W);

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const update = () => this.scale.set(host.clientWidth / STAGE_W || 1);
      update();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(update);
      ro.observe(host);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  protected flip(layer: CanvasLayer): string {
    return `${layer.flipH ? 'scaleX(-1) ' : ''}${layer.flipV ? 'scaleY(-1)' : ''}`.trim() || 'none';
  }

  protected crop(layer: CanvasLayer): string {
    return `inset(${layer.cropTop || 0}% ${layer.cropRight || 0}% ${layer.cropBottom || 0}% ${layer.cropLeft || 0}%)`;
  }

  protected filter(name?: string): string {
    return (name && IMAGE_FILTERS[name]) || 'none';
  }
}
