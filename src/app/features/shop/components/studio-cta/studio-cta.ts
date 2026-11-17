import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CasePreview } from '../../../../shared/ui/case-preview/case-preview';
import type { PhoneModel } from '../../../../shared/devices/devices';

/**
 * Closing "Design Studio" banner on /shop: drifting gradient, glass panels and floating cases.
 * All motion is CSS and stops under prefers-reduced-motion.
 */
@Component({
  selector: 'app-studio-cta',
  imports: [RouterLink, CasePreview],
  templateUrl: './studio-cta.html',
  styleUrl: './studio-cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[class.is-visible]': 'visible()' },
})
export class StudioCta {
  readonly device = input.required<PhoneModel>();

  protected readonly visible = signal(false);
  protected readonly cases = [
    { art: '/products/Bg_Case/02_lilac_liquid_glass.png', color: '#A58CF4' },
    { art: '/products/Bg_Case/06_galaxy_glow.png', color: '#0A0A0A' },
    { art: '/products/Bg_Case/12_purple_botanical_blossoms.png', color: '#FFFFFF' },
  ];
  protected readonly perks = ['Tải ảnh của bạn', 'Sticker & chữ', 'Xem trước 3D'];

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
    // Entrance animation once the banner scrolls into view.
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        this.visible.set(true);
        return;
      }
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            this.visible.set(true);
            io.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      io.observe(host);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
