import { ChangeDetectionStrategy, Component, ElementRef, inject, output, viewChild, afterNextRender } from '@angular/core';
import { DEVICES } from '../../../../shared/devices/devices';
import { CasePreview } from '../../../../shared/ui/case-preview/case-preview';
import { STYLES } from '../../catalog';
import { ShopFilters } from '../../services/shop-filters';

/** Side sheet with every listing filter. Filters apply instantly (they live in the URL). */
@Component({
  selector: 'app-filter-drawer',
  imports: [CasePreview],
  templateUrl: './filter-drawer.html',
  styles: `
    .panel { animation: slide-in 0.28s cubic-bezier(0.2, 0.7, 0.2, 1); }
    .backdrop { animation: fade-in 0.2s ease-out; }
    @keyframes slide-in { from { transform: translateX(-100%); } }
    @keyframes fade-in { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .panel, .backdrop { animation: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class FilterDrawer {
  readonly closed = output<void>();

  protected readonly f = inject(ShopFilters);
  protected readonly devices = DEVICES;
  protected readonly styles = STYLES;
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    afterNextRender(() => this.panel()?.nativeElement.focus());
  }
}
