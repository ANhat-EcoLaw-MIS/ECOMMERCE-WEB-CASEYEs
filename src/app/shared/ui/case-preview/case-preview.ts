import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import type { CaseType, PhoneModel } from '../../devices/devices';
import {
  aspectRatio,
  CASE_CORNER_RADIUS,
  cutoutBox,
  cutoutRadius,
  cutoutShape,
  lenses,
  rimWidth,
} from '../../devices/case-geometry';
import { fallbackArt } from '../../devices/case-art';

type ArtState = 'loading' | 'ready' | 'fallback';

/**
 * 2D case back for any studio device: artwork, data-driven camera module and a rim in the case colour.
 * Pure CSS; sizes follow the host width (container query units), so set the width from outside.
 *
 * Without artwork (or when it fails to load) the case shows a background from /products/Bg_Case,
 * picked from `seed` and blended with a tint, so cases without an image still look different.
 */
@Component({
  selector: 'app-case-preview',
  templateUrl: './case-preview.html',
  styleUrl: './case-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', '[attr.aria-label]': 'label()' },
})
export class CasePreview {
  readonly model = input.required<PhoneModel>();
  readonly artworkUrl = input<string>('');
  readonly colorHex = input<string>('#0A0A0A');
  readonly caseType = input<CaseType>('tough');
  readonly alt = input<string>('');
  /** Picks the fallback background; defaults to artwork URL + device. */
  readonly seed = input<string>('');
  /**
   * Optional CSS colour or gradient painted under the artwork (e.g. a studio template's gradient).
   * When set, a case without artwork shows this instead of the seeded fallback art.
   */
  readonly surface = input<string>('');

  protected readonly label = computed(() => this.alt() || `Ốp lưng ${this.model().name}`);
  protected readonly ratio = computed(() => aspectRatio(this.model()));
  protected readonly corner = CASE_CORNER_RADIUS;
  protected readonly rim = computed(() => rimWidth(this.caseType()));
  protected readonly shape = computed(() => cutoutShape(this.model()));
  protected readonly box = computed(() => cutoutBox(this.model()));
  /** Module corner radius in cqw (fraction of the case width). */
  protected readonly moduleRadius = computed(() => (cutoutRadius(this.model()) / 100) * this.box().width);
  protected readonly lenses = computed(() => lenses(this.model()));

  protected readonly state = signal<ArtState>('loading');
  private readonly fallback = computed(() => fallbackArt(this.seed() || `${this.artworkUrl()}|${this.model().id}|${this.colorHex()}`));
  protected readonly tint = computed(() => (this.state() === 'fallback' ? this.fallback().tint : null));
  protected readonly artwork = computed(() => {
    const url = this.state() === 'fallback' ? this.fallback().url : this.artworkUrl();
    const s = this.surface();
    const under = s ? (s.includes('gradient') ? s : `linear-gradient(${s}, ${s})`) : '';
    const layers = [url ? `url("${url}")` : '', under].filter(Boolean);
    return layers.length ? layers.join(', ') : 'none';
  });

  constructor() {
    let probe: HTMLImageElement | null = null;
    inject(DestroyRef).onDestroy(() => probe && (probe.onload = probe.onerror = null));

    // Check the artwork so a missing file falls back instead of leaving a blank case.
    effect(() => {
      const url = this.artworkUrl();
      if (probe) probe.onload = probe.onerror = null;
      if (!url) {
        this.state.set(this.surface() ? 'ready' : 'fallback');
        return;
      }
      if (typeof Image === 'undefined') {
        this.state.set('ready');
        return;
      }
      this.state.set('loading');
      probe = new Image();
      probe.decoding = 'async';
      probe.onload = () => this.state.set('ready');
      probe.onerror = () => this.state.set('fallback');
      probe.src = url;
    });
  }
}
