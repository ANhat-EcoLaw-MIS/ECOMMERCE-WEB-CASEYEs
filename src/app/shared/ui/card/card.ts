import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.html'
})
export class CardComponent {
  interactive = input(false);

  computedClasses = computed(() => {
    const base = 'bg-surface-alt rounded-card shadow-soft border border-line transition-all duration-300 ease-out p-6';
    const interactiveStyles = 'hover:-translate-y-1 hover:shadow-lift cursor-pointer';

    return this.interactive() ? `${base} ${interactiveStyles}` : base;
  });
}
