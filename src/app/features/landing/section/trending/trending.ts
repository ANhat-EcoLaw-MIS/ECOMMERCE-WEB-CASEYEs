import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CasePreview } from '../../../../shared/ui/case-preview/case-preview';
import { DEFAULT_DEVICE } from '../../../../shared/devices/devices';
import type { TemplateCard } from '../../../design-studio/components/template-browser/template-browser';
import { Reveal, shuffle } from '../../shared/reveal';

/** Always shown in the carousel. */
const FEATURED_ID = 'tpl-creators-chibi';
const COUNT = 9;

/**
 * "Trending designs": a random pick of studio templates (always including the Chibi Creators),
 * in a horizontal snap carousel. The catalog is lazy-loaded like the onboarding marquee does.
 */
@Component({
  selector: 'app-trending',
  imports: [RouterLink, CasePreview, Reveal],
  templateUrl: './trending.html',
  styleUrl: './trending.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Trending {
  protected readonly device = DEFAULT_DEVICE;
  protected readonly items = signal<TemplateCard[]>([]);
  protected readonly failed = signal(false);
  protected readonly canPrev = signal(false);
  protected readonly canNext = signal(true);
  protected readonly placeholders = Array.from({ length: 6 }, (_, i) => i);
  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  constructor() {
    void import('../../../design-studio/components/template-browser/template-browser')
      .then(({ TEMPLATE_CATALOG }) => this.items.set(pickTrending(TEMPLATE_CATALOG)))
      .catch(() => this.failed.set(true));

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onResize = () => this.measure();
      window.addEventListener('resize', onResize, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    });
  }

  protected scroll(dir: 1 | -1): void {
    const el = this.rail()?.nativeElement;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-card]');
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * 2, behavior: 'smooth' });
  }

  protected measure(): void {
    const el = this.rail()?.nativeElement;
    if (!el) return;
    this.canPrev.set(el.scrollLeft > 4);
    this.canNext.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  protected stars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (rating >= i + 1 ? 1 : rating > i ? 0.5 : 0));
  }
}

/** Random templates (no blank canvas), with the featured design always among the first three. */
export function pickTrending(catalog: readonly TemplateCard[], count = COUNT): TemplateCard[] {
  const usable = catalog.filter((t) => !t.isBlankCanvas);
  const featured = usable.find((t) => t.id === FEATURED_ID);
  const rest = shuffle(usable.filter((t) => t.id !== FEATURED_ID)).slice(0, featured ? count - 1 : count);
  if (featured) rest.splice(Math.floor(Math.random() * Math.min(3, rest.length + 1)), 0, featured);
  return rest;
}
