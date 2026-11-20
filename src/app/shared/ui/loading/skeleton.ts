import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

/**
 * Skeleton primitive: one shimmering placeholder block. Compose these to mirror a real layout
 * (the `<app-loading variant="skeleton">` presets are built from it).
 *
 *   <app-skeleton w="60%" h="1rem" />           text line
 *   <app-skeleton w="5rem" h="5rem" circle />   avatar
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    class: 'skeleton block',
    '[style.width]': 'w()',
    '[style.height]': 'h()',
    '[style.border-radius]': "circle() ? '999px' : radius()",
  },
  styles: `
    :host {
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      background: var(--color-surface-container-high, #e9e7f2);
    }
    :host::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.65), transparent);
      animation: skeleton-wave 1.4s ease-in-out infinite;
    }
    @keyframes skeleton-wave {
      to { transform: translateX(100%); }
    }
    @media (prefers-reduced-motion: reduce) {
      :host::after { animation: none; }
      :host { opacity: 0.8; }
    }
  `,
  template: '',
})
export class Skeleton {
  readonly w = input('100%');
  readonly h = input('1rem');
  readonly radius = input('0.6rem');
  readonly circle = input(false, { transform: booleanAttribute });
}
