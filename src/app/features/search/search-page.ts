import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SearchService } from '../../core/search/search.service';
import { SearchCard } from '../../core/search/search-card/search-card';
import { SearchHit } from '../../shared/search/search.types';

type Tab = 'all' | 'template' | 'product';
type Sort = 'relevance' | 'price-asc' | 'price-desc';

/**
 * /tim-kiem?q=… : full results of the site-wide search.
 * No search box here: "Sửa tìm kiếm" reopens the header overlay, so the site keeps one box.
 */
@Component({
  selector: 'app-search-page',
  imports: [RouterLink, SearchCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-page.html',
})
export class SearchPage {
  private readonly search = inject(SearchService);
  private readonly router = inject(Router);

  /** Bound from ?q (withComponentInputBinding). */
  readonly q = input<string>('');

  protected readonly tab = signal<Tab>('all');
  protected readonly style = signal<string>('');
  protected readonly sort = signal<Sort>('relevance');

  protected readonly results = computed(() => this.search.search(this.q() ?? ''));

  /** Most common styles in the current results (at most 6 filter chips). */
  protected readonly styles = computed(() => {
    const count = new Map<string, number>();
    for (const h of [...this.results().templates, ...this.results().products]) if (h.doc.style) count.set(h.doc.style, (count.get(h.doc.style) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);
  });

  protected readonly counts = computed(() => ({
    all: this.results().templates.length + this.results().products.length,
    template: this.results().templates.length,
    product: this.results().products.length,
  }));

  protected readonly shown = computed<readonly SearchHit[]>(() => {
    const r = this.results();
    let list: SearchHit[] =
      this.tab() === 'template' ? [...r.templates] : this.tab() === 'product' ? [...r.products] : [...r.templates, ...r.products].sort((a, b) => b.score - a.score);
    if (this.style()) list = list.filter((h) => h.doc.style === this.style());
    if (this.sort() !== 'relevance') {
      const dir = this.sort() === 'price-asc' ? 1 : -1;
      // Items without a price (templates) go last, in relevance order.
      const priced = list.filter((h) => h.doc.price !== undefined).sort((a, b) => (a.doc.price! - b.doc.price!) * dir);
      list = [...priced, ...list.filter((h) => h.doc.price === undefined)];
    }
    return list;
  });

  constructor() {
    // A new query resets the filters.
    effect(() => {
      this.q();
      this.tab.set('all');
      this.style.set('');
      this.sort.set('relevance');
    });
  }

  protected setTab(t: Tab): void {
    this.tab.set(t);
    this.style.set('');
  }

  protected toggleStyle(s: string): void {
    this.style.update((cur) => (cur === s ? '' : s));
  }

  protected setSort(value: string): void {
    this.sort.set(value as Sort);
  }

  protected editSearch(): void {
    this.search.open('text', this.q() ?? '');
  }

  protected suggest(): void {
    this.search.query.set(this.q() ?? '');
    this.search.open('suggest');
  }

  protected designFromIdea(): void {
    const idea = (this.q() ?? '').trim();
    void this.router.navigate(['/design-studio/templates'], { queryParams: idea ? { y: idea } : {} });
  }
}
