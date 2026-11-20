import { Injectable, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, take } from 'rxjs';

export interface OverlayOptions {
  /** Main line, e.g. "Đăng ký thành công!". */
  readonly title: string;
  readonly message?: string;
  /** Don't show at all if the work finishes sooner (avoids a flash). Default 0. */
  readonly delay?: number;
  /** Once shown, stay at least this long so it doesn't flicker. Default 500ms. */
  readonly minDuration?: number;
}

interface Active extends OverlayOptions {
  readonly id: number;
}

/**
 * Global blocking loading pop-up (rendered once by <app-loading-host> in app.html).
 * Use for short steps the user must not interrupt: account hand-offs, payment, big saves.
 *
 *   const done = overlay.show({ title: 'Đang lưu…' }); await save(); done();
 *   await overlay.track(save(), { title: 'Đang lưu…' });
 *   overlay.showUntilNavigation({ title: 'Đang chuyển trang…' }); router.navigate(...)
 */
@Injectable({ providedIn: 'root' })
export class LoadingOverlay {
  private readonly router = inject(Router);
  private nextId = 0;
  private readonly _active = signal<Active | null>(null);
  readonly active = this._active.asReadonly();

  /** Shows the pop-up; returns a function that hides it (respecting delay and min duration). */
  show(options: OverlayOptions): () => void {
    const id = ++this.nextId;
    const delay = options.delay ?? 0;
    const min = options.minDuration ?? 500;
    let shownAt = 0;
    let closed = false;

    const open = () => {
      if (closed) return;
      shownAt = Date.now();
      this._active.set({ ...options, id });
    };
    const timer = delay > 0 ? setTimeout(open, delay) : (open(), undefined);

    return () => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      if (!shownAt) return; // finished before it was ever shown
      const left = Math.max(0, min - (Date.now() - shownAt));
      setTimeout(() => {
        if (this._active()?.id === id) this._active.set(null);
      }, left);
    };
  }

  /** Shows the pop-up while `work` runs. */
  async track<T>(work: Promise<T>, options: OverlayOptions): Promise<T> {
    const hide = this.show(options);
    try {
      return await work;
    } finally {
      hide();
    }
  }

  /** Shows the pop-up until the next navigation finishes (or fails), e.g. across lazy-loaded routes. */
  showUntilNavigation(options: OverlayOptions): () => void {
    const hide = this.show(options);
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
        take(1),
      )
      .subscribe(() => hide());
    return hide;
  }
}
