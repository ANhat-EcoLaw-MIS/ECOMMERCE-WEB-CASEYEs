import {
  computed,
  untracked,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { CaseType, PhoneModel } from '../../devices/devices';
import { paintCaseTexture } from '../../devices/paint-case-texture';
import { applyModelViewerTexture } from '../../devices/apply-model-viewer-texture';
import { CasePreview } from '../case-preview/case-preview';
import { Loading } from '../loading/loading';

/** Pulled back from model-viewer's tight auto-fit so the whole phone (and its rotation) stays in frame. */
const DEFAULT_ORBIT = '0deg 80deg 118%';

/**
 * Rotatable 3D case on the device's .glb (via <model-viewer>, loaded globally in index.html).
 * Devices without a 3D model fall back to the 2D preview.
 */
@Component({
  selector: 'app-case-viewer-3d',
  imports: [CasePreview, Loading],
  templateUrl: './case-viewer-3d.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: { class: 'block' },
})
export class CaseViewer3d {
  readonly model = input.required<PhoneModel>();
  readonly artworkUrl = input<string>('');
  readonly colorHex = input<string>('#0A0A0A');
  readonly caseType = input<CaseType>('tough');
  /** Same seed as the 2D preview, so a case without artwork gets the same fallback art in 3D. */
  readonly seed = input<string>('');

  private readonly viewer = viewChild<ElementRef<HTMLElement>>('mv');
  private readonly loaded = signal(false);
  /** Bumped to force a repaint (after load, again shortly after, and when the model becomes visible). */
  private readonly tick = signal(0);
  protected readonly syncing = signal(true);
  /** 0–1 download progress of the .glb (model-viewer `progress` event). */
  protected readonly downloaded = signal(0);
  /** The print has been applied at least once: only then is the model faded in (no bare phone flash). */
  protected readonly printed = signal(false);
  /** What the user is waiting for right now. */
  protected readonly phase = computed<'download' | 'print' | 'reprint' | null>(() =>
    !this.loaded() ? 'download' : !this.printed() ? 'print' : this.syncing() ? 'reprint' : null,
  );
  private alive = true;
  private runId = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.alive = false;
      this.timers.forEach(clearTimeout);
    });
    // A different phone means a different .glb: start the download/print phases again.
    let lastUrl: string | undefined;
    effect(() => {
      const url = this.model().model3dUrl;
      if (lastUrl !== undefined && url !== lastUrl) {
        untracked(() => {
          this.loaded.set(false);
          this.printed.set(false);
          this.downloaded.set(0);
        });
      }
      lastUrl = url;
    });
    // Repaint whenever the model has loaded, a repaint is requested or an input changes.
    effect(() => {
      const el = this.viewer()?.nativeElement;
      this.tick();
      if (!el || !this.loaded()) return;
      void this.sync(el, this.model(), this.artworkUrl(), this.colorHex(), this.caseType(), this.seed());
    });
  }

  protected onLoad(): void {
    this.resetView();
    this.loaded.set(true);
    // model-viewer can finish building its scene (environment, materials) just after "load";
    // painting again a moment later makes sure the print sticks.
    this.timers.forEach(clearTimeout);
    this.timers = [700, 1800].map((ms) => setTimeout(() => this.tick.update((t) => t + 1), ms));
  }

  protected onProgress(event: Event): void {
    const p = (event as CustomEvent<{ totalProgress?: number }>).detail?.totalProgress;
    if (typeof p === 'number') this.downloaded.set(p);
  }

  protected onVisible(): void {
    if (this.loaded()) this.tick.update((t) => t + 1);
  }

  protected resetView(): void {
    const mv = this.viewer()?.nativeElement as unknown as { cameraOrbit: string; jumpCameraToGoal?: () => void } | undefined;
    if (!mv) return;
    mv.cameraOrbit = DEFAULT_ORBIT;
    mv.jumpCameraToGoal?.();
  }

  private async sync(el: HTMLElement, model: PhoneModel, artworkUrl: string, colorHex: string, caseType: CaseType, seed: string): Promise<void> {
    const run = ++this.runId;
    this.syncing.set(true);
    const canvas = document.createElement('canvas');
    await paintCaseTexture(canvas, model, { artworkUrl, colorHex, caseType, seed });
    // A newer paint started meanwhile (e.g. the colour changed): drop this one.
    if (!this.alive || run !== this.runId) return;
    await applyModelViewerTexture(el, canvas, colorHex);
    if (this.alive && run === this.runId) {
      this.syncing.set(false);
      this.printed.set(true);
    }
  }
}
