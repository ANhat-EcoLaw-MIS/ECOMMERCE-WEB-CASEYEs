import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

const SHOW_AFTER = 120; // fast (cached) navigations never show the bar
const TICK = 200;

/**
 * Thin progress bar at the very top of the page while a route (often a lazy chunk + guards) loads.
 * It creeps towards 90% while waiting, jumps to 100% when the page is ready, then fades out.
 * Mounted once in app.html.
 */
@Component({
  selector: 'app-route-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none fixed inset-x-0 top-0 z-[1001] block h-[3px]',
    role: 'progressbar',
    'aria-label': 'Đang tải trang',
    '[attr.aria-hidden]': '!active()',
    '[attr.aria-valuenow]': 'active() ? progress() : null',
  },
  styles: `
    .fill {
      height: 100%;
      transform-origin: left;
      background: linear-gradient(90deg, var(--color-brand-400), #f0a6e8, var(--color-brand-800));
      box-shadow: 0 0 10px rgb(165 140 244 / 0.8), 0 0 4px rgb(165 140 244 / 0.6);
      transition: transform 0.25s ease-out, opacity 0.3s ease 0.15s;
    }
    @media (prefers-reduced-motion: reduce) {
      .fill { transition: opacity 0.2s; }
    }
  `,
  template: `
    <div class="fill" [style.transform]="'scaleX(' + progress() / 100 + ')'" [style.opacity]="active() ? 1 : 0"></div>
  `,
})
export class RouteProgress {
  protected readonly progress = signal(0);
  protected readonly active = signal(false);
  private showTimer?: ReturnType<typeof setTimeout>;
  private tickTimer?: ReturnType<typeof setInterval>;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const sub = inject(Router).events.subscribe((e) => {
      if (e instanceof NavigationStart) this.start();
      else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) this.done();
    });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.clear();
    });
  }

  private start(): void {
    this.clear();
    this.showTimer = setTimeout(() => {
      this.progress.set(8);
      this.active.set(true);
      // Ease towards 90%: big steps first, smaller as it waits.
      this.tickTimer = setInterval(() => this.progress.update((p) => Math.min(90, p + (90 - p) * 0.12)), TICK);
    }, SHOW_AFTER);
  }

  private done(): void {
    clearTimeout(this.showTimer);
    clearInterval(this.tickTimer);
    if (!this.active()) return; // finished before it was shown
    this.progress.set(100);
    this.hideTimer = setTimeout(() => {
      this.active.set(false);
      this.hideTimer = setTimeout(() => this.progress.set(0), 350);
    }, 200);
  }

  private clear(): void {
    clearTimeout(this.showTimer);
    clearInterval(this.tickTimer);
    clearTimeout(this.hideTimer);
  }
}
