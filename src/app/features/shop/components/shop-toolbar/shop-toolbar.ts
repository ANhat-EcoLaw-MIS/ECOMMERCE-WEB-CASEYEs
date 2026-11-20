import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { ShopFilters, SORT_OPTIONS, type ShopSort, type ShopView } from '../../services/shop-filters';

/** Sticky filter / sort / view bar (Figma toolbar). Reads and writes the page's ShopFilters. */
@Component({
  selector: 'app-shop-toolbar',
  templateUrl: './shop-toolbar.html',
  styles: `
    .sort-pop { transform-origin: top right; animation: pop 0.16s ease-out; }
    @keyframes pop { from { opacity: 0; transform: translateY(-4px) scale(0.97); } }
    @media (prefers-reduced-motion: reduce) { .sort-pop { animation: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'sortOpen.set(false)',
  },
})
export class ShopToolbar {
  readonly openFilters = output<void>();

  protected readonly f = inject(ShopFilters);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly views: readonly { id: ShopView; label: string }[] = [
    { id: 'grid', label: 'Lưới 4 cột' },
    { id: 'large', label: 'Lưới lớn' },
    { id: 'list', label: 'Danh sách' },
  ];
  protected readonly viewIndex = computed(() => this.views.findIndex((v) => v.id === this.f.view()));

  protected readonly sortOpen = signal(false);
  protected readonly sortLabel = computed(() => SORT_OPTIONS.find((o) => o.id === this.f.sort())?.label ?? '');
  private readonly sortList = viewChild<ElementRef<HTMLElement>>('sortList');

  /** Removable chips for what is currently filtering the grid. */
  protected readonly chips = computed(() => {
    const out: { key: 'color' | 'style' | 'q'; label: string; hex?: string }[] = [];
    const color = this.f.colors().find((c) => c.name === this.f.color());
    if (color) out.push({ key: 'color', label: color.name, hex: color.hex });
    if (this.f.style()) out.push({ key: 'style', label: this.f.style()! });
    if (this.f.query()) out.push({ key: 'q', label: `“${this.f.query()}”` });
    return out;
  });

  protected toggleSort(): void {
    this.sortOpen.update((o) => !o);
    if (this.sortOpen()) {
      queueMicrotask(() => this.sortList()?.nativeElement.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
    }
  }

  protected chooseSort(id: ShopSort): void {
    this.sortOpen.set(false);
    this.f.set({ sort: id === 'featured' ? null : id });
  }

  /** Arrow keys move between options inside the open listbox. */
  protected onSortKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(this.sortList()?.nativeElement.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  }

  protected setView(v: ShopView): void {
    this.f.set({ view: v === 'grid' ? null : v });
  }

  protected toggleColor(name: string): void {
    this.f.set({ color: this.f.color() === name ? null : name });
  }

  protected clearChip(key: 'color' | 'style' | 'q'): void {
    this.f.set({ [key]: null });
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.sortOpen() && !this.host.nativeElement.contains(event.target as Node)) this.sortOpen.set(false);
  }
}
