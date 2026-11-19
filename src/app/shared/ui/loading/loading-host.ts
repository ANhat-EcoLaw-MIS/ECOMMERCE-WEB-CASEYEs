import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Loading } from './loading';
import { LoadingOverlay } from './loading-overlay';

/** Renders the global LoadingOverlay pop-up. Mounted once in app.html. */
@Component({
  selector: 'app-loading-host',
  imports: [Loading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (overlay.active(); as a) {
      <app-loading variant="overlay" [label]="a.title" [message]="a.message ?? ''" />
    }
  `,
})
export class LoadingHost {
  protected readonly overlay = inject(LoadingOverlay);

  constructor() {
    // Lock page scroll while the pop-up blocks the screen.
    effect(() => {
      if (typeof document === 'undefined') return;
      document.documentElement.style.overflow = this.overlay.active() ? 'hidden' : '';
    });
  }
}
