import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Dashed box that marks "content goes here".
 * Delete its usage once the real section/page is built.
 */
@Component({
  selector: 'app-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-brand-400 bg-brand-50 p-6 text-center"
      [style.min-height]="minHeight()"
    >
      <p class="font-display text-base font-bold text-brand-800">{{ label() }}</p>
      @if (hint()) {
        <p class="max-w-prose text-sm text-ink-soft">{{ hint() }}</p>
      }
    </div>
  `,
})
export class Placeholder {
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly minHeight = input('12rem');
}
