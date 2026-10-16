import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type PhoneCaseTone = 'lilac' | 'light' | 'dark';

const TONE_CLASSES: Record<PhoneCaseTone, string> = {
  lilac: 'bg-linear-160 from-brand-100 to-brand-400 text-brand-800',
  light: 'bg-linear-160 from-white to-brand-200 text-brand-800',
  dark: 'bg-linear-160 from-ink to-brand-800 text-white',
};

/**
 * A phone case. Shows a CSS-drawn mockup until a real product image is supplied
 * through `imageSrc` (path under /public, e.g. '/mockups/good-vibes.webp').
 * Width comes from the parent; height follows the phone aspect ratio.
 */
@Component({
  selector: 'app-phone-case-mock',
  imports: [NgOptimizedImage],
  templateUrl: './phone-case-mock.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PhoneCaseMock {
  readonly tone = input<PhoneCaseTone>('lilac');
  /** Text printed on the CSS mockup (ignored when imageSrc is set). */
  readonly caption = input('');
  readonly imageSrc = input<string>();
  readonly alt = input('');
  /** Set true for the image that is the largest visible element on load (LCP). */
  readonly priority = input(false);

  protected readonly toneClass = computed(() => TONE_CLASSES[this.tone()]);
}
