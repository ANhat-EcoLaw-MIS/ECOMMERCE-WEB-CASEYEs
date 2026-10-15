import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badge.html'
})
export class BadgeComponent {
  variant = input<'default' | 'hero'>('default');

  computedClasses = computed(() => {
    const base = 'inline-flex items-center justify-center px-3 py-1 rounded-pill text-xs font-body font-medium';
    const variantStyles = this.variant() === 'hero'
      ? 'bg-[image:var(--grad-primary)] text-surface-alt'
      : 'bg-brand-100 text-brand-800';

    return `${base} ${variantStyles}`;
  });
}
