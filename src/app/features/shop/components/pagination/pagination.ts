import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Page list with ellipses: 1 2 3 … 74 (Figma pagination pill). */
export function pageList(page: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= count - 2) [count - 3, count - 2, count - 1].forEach((p) => set.add(p));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (count() > 1) {
      <nav aria-label="Phân trang" class="flex justify-center">
        <ul class="flex items-center gap-1 rounded-pill border border-line bg-white p-1.5">
          <li>
            <button type="button" (click)="go.emit(page() - 1)" [disabled]="page() <= 1" aria-label="Trang trước" class="grid size-10 place-items-center rounded-full text-ink hover:bg-surface-container-low disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-400">‹</button>
          </li>
          @for (p of pages(); track $index) {
            <li>
              @if (p === null) {
                <span class="grid size-10 place-items-center text-ink-soft" aria-hidden="true">…</span>
              } @else {
                <button
                  type="button"
                  (click)="go.emit(p)"
                  [attr.aria-current]="p === page() ? 'page' : null"
                  class="grid size-10 place-items-center rounded-full text-sm font-medium text-ink hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-brand-400 aria-[current=page]:bg-brand-800 aria-[current=page]:text-white"
                >
                  {{ p }}
                </button>
              }
            </li>
          }
          <li>
            <button type="button" (click)="go.emit(page() + 1)" [disabled]="page() >= count()" aria-label="Trang sau" class="grid size-10 place-items-center rounded-full text-ink hover:bg-surface-container-low disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-400">›</button>
          </li>
        </ul>
      </nav>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly count = input.required<number>();
  readonly go = output<number>();
  protected readonly pages = computed(() => pageList(this.page(), this.count()));
}
