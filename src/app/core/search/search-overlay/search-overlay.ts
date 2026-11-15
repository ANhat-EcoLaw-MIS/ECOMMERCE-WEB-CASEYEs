import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { POPULAR_DEVICES, POPULAR_KEYWORDS, SUGGEST_EXAMPLES, SearchMode, SearchService } from '../search.service';
import { SearchCard } from '../search-card/search-card';

/**
 * Site-wide search overlay (opened from the header search button or Ctrl+K).
 * Three ways to search, one box: words · "Gợi ý theo mô tả" · photo.
 */
@Component({
  selector: 'app-search-overlay',
  imports: [RouterLink, SearchCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-overlay.html',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class SearchOverlay {
  protected readonly search = inject(SearchService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly input = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('box');

  protected readonly popular = POPULAR_KEYWORDS;
  protected readonly devices = POPULAR_DEVICES;
  protected readonly examples = SUGGEST_EXAMPLES;

  /** Query after a short pause (150 ms) so results do not flicker while typing. */
  private readonly settled = signal('');
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly results = computed(() => this.search.search(this.settled()));
  protected readonly suggestion = computed(() => (this.settled().trim().length >= 3 ? this.search.suggest(this.settled()) : null));
  protected readonly hot = computed(() =>
    this.search.docs().filter((d) => d.type === 'template' && (d.boost ?? 0) >= 2).slice(0, 4).map((doc) => ({ doc, score: 0, reasons: [] })),
  );

  constructor() {
    // Focus the box and sync the query each time the overlay opens.
    effect(() => {
      if (!this.search.isOpen()) return;
      this.settled.set(this.search.query());
      this.search.mode();
      setTimeout(() => this.input()?.nativeElement.focus());
    });

    // Lock the page behind while open: one scrollbar (the overlay's), the page does not move.
    effect(() => {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      if (this.search.isOpen()) {
        const gap = window.innerWidth - root.clientWidth;
        root.style.overflow = 'hidden';
        root.style.paddingRight = gap > 0 ? `${gap}px` : '';
      } else {
        root.style.overflow = '';
        root.style.paddingRight = '';
      }
    });
    inject(DestroyRef).onDestroy(() => {
      if (typeof document !== 'undefined') document.documentElement.style.overflow = document.documentElement.style.paddingRight = '';
    });
  }

  protected onInput(value: string): void {
    this.search.query.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.settled.set(value), 150);
  }

  protected setMode(mode: SearchMode): void {
    this.search.mode.set(mode);
    this.search.clearImage();
  }

  protected useWord(word: string): void {
    this.search.query.set(word);
    this.settled.set(word);
  }

  /** Enter: open the full results page (text) or keep the suggestions (description). */
  protected submit(): void {
    const q = this.search.query().trim();
    if (!q) return;
    if (this.search.mode() === 'suggest') {
      this.settled.set(q);
      this.search.log(q, this.suggestion()?.hits.length ?? 0, 'suggest');
      return;
    }
    const code = this.results().orderCode;
    this.search.remember(q);
    this.search.log(q, this.results().total, 'text');
    this.search.close();
    if (code) void this.router.navigate(['/order-tracking', code]);
    else void this.router.navigate(['/tim-kiem'], { queryParams: { q } });
  }

  /** Any result link was followed. */
  protected picked(): void {
    const q = this.search.query().trim();
    if (q) {
      this.search.remember(q);
      this.search.log(q, this.search.mode() === 'suggest' ? (this.suggestion()?.hits.length ?? 0) : this.results().total, this.search.mode());
    }
    this.search.close();
  }

  /** "Tự thiết kế với ý tưởng này": Design Studio receives the description. */
  protected designFromIdea(): void {
    const idea = this.search.query().trim();
    this.picked();
    void this.router.navigate(['/design-studio/templates'], { queryParams: idea ? { y: idea } : {} });
  }

  /** No case of the photo's tones: Design Studio with the tones as the idea. */
  protected designFromImage(names: readonly string[]): void {
    this.search.close();
    void this.router.navigate(['/design-studio/templates'], { queryParams: names.length ? { y: `Ốp tông ${names.join(', ')}` } : {} });
  }

  protected async pickImage(event: Event): Promise<void> {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = '';
    await this.search.searchByImage(file);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.search.isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.search.close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    // Arrow keys move between results (and back to the box).
    const items = [...(this.host.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-search-item]')];
    if (!items.length) return;
    event.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? (i + 1) % items.length : i <= 0 ? -1 : i - 1;
    if (next < 0) this.input()?.nativeElement.focus();
    else items[next].focus();
  }
}
