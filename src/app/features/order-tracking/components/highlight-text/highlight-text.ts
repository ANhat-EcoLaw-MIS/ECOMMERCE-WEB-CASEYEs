import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { highlight } from '../../domain/actions';

/** Renders text with the search term marked (P1-3). Uses <mark>, styled with brand tokens. */
@Component({
  selector: 'app-highlight-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (p of parts(); track $index) {@if (p.hit) {<mark class="rounded bg-brand-200 px-0.5 text-ink">{{ p.text }}</mark>} @else {{{ p.text }}}}`,
})
export class HighlightText {
  readonly text = input.required<string>();
  readonly query = input('');
  protected readonly parts = computed(() => highlight(this.text(), this.query()));
}
