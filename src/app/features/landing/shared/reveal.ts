import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Fades + lifts an element in the first time it scrolls into view.
 * Add `appReveal` (optionally `[revealDelay]="ms"`); styles live in landing.scss (`.reveal`, `.is-revealed`).
 */
@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal', '[style.--reveal-delay]': "revealDelay() + 'ms'" },
})
export class Reveal {
  readonly revealDelay = input(0);

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        el.classList.add('is-revealed');
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            el.classList.add('is-revealed');
            io.disconnect();
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
      );
      io.observe(el);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
