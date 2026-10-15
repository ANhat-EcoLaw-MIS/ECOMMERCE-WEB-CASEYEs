import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.html'
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'hero'>('primary');
  disabled = input(false);

  private readonly baseClasses = 'px-6 py-3 rounded-pill font-body font-medium transition-all duration-200 ease-out flex items-center justify-center min-h-[44px] min-w-[44px]';

  combinedClasses = computed(() => {
    let variantClasses = '';

    switch (this.variant()) {
      case 'primary':
        variantClasses = 'bg-brand-800 text-surface-alt hover:-translate-y-0.5 hover:shadow-glow';
        break;
      case 'secondary':
        variantClasses = 'bg-transparent border-[1.5px] border-brand-800 text-brand-800 hover:bg-brand-50';
        break;
      case 'hero':
        variantClasses = 'bg-[image:var(--grad-primary)] text-surface-alt hover:-translate-y-0.5 hover:shadow-glow border-none';
        break;
    }

    return `${this.baseClasses} ${variantClasses}`;
  });
}
