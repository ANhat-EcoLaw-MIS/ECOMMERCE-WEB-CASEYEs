import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchHit } from '../../../shared/search/search.types';

const VND = new Intl.NumberFormat('vi-VN');

/** Result card shared by the overlay and the results page: the case is shown whole (object-contain). */
@Component({
  selector: 'app-search-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let d = hit().doc;
    <a
      data-search-item
      [routerLink]="d.link"
      [queryParams]="d.queryParams"
      [fragment]="d.fragment"
      (click)="picked.emit()"
      class="group flex h-full flex-col rounded-2xl border border-line bg-white p-2 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-brand-400"
    >
      <span class="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl" [style.background]="d.background ?? '#f6f3fe'">
        @if (d.image) {
          <img [src]="d.image" [alt]="d.title" loading="lazy" class="h-full w-full object-contain p-1.5 transition-transform group-hover:scale-105 motion-reduce:transition-none" />
        } @else {
          <span class="text-xs font-semibold text-brand-800">CasEYE's</span>
        }
        <span class="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold" [class]="d.type === 'template' ? 'bg-brand-800 text-white' : 'bg-white/90 text-brand-900 ring-1 ring-brand-100'">
          {{ d.type === 'template' ? 'Mẫu thiết kế' : 'Có sẵn' }}
        </span>
        @if (d.outOfStock) {
          <span class="absolute bottom-1.5 left-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-white">Tạm hết</span>
        }
      </span>
      <span class="mt-2 line-clamp-1 px-1 text-sm font-semibold text-ink">{{ d.title }}</span>
      <span class="line-clamp-1 px-1 text-xs text-ink-soft">{{ d.price ? price(d.price) : d.subtitle }}</span>
      @if (showReasons() && hit().reasons.length) {
        <span class="mt-1 line-clamp-2 px-1 text-[11px] leading-snug text-brand-800">Vì hợp với: {{ hit().reasons.join(' · ') }}</span>
      }
    </a>
  `,
})
export class SearchCard {
  readonly hit = input.required<SearchHit>();
  readonly showReasons = input(false);
  readonly picked = output<void>();

  protected price(v: number): string {
    return `${VND.format(v)} ₫`;
  }
}
