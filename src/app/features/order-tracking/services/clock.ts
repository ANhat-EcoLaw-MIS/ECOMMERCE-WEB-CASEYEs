import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SyncChannel } from './sync-channel';

const STORAGE_KEY = 'casecraft.ot.clock.v1';
const TICK_MS = 15_000;

/**
 * Overridable clock (prompt §5.5). Every time rule in Epic 5 reads `now()` from here so the
 * Demo Console can fast-forward 30 minutes, 72 hours, 7 or 14 days without waiting.
 * The offset is persisted in localStorage and broadcast to other tabs.
 */
@Injectable({ providedIn: 'root' })
export class Clock {
  private readonly sync = inject(SyncChannel);
  private readonly _offsetMs = signal(this.readOffset());
  /** Re-evaluated on a timer so time-based rules (cancel window) refresh in the UI. */
  private readonly _tick = signal(Date.now());

  readonly offsetMs = this._offsetMs.asReadonly();

  constructor() {
    const timer = setInterval(() => this._tick.set(Date.now()), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    this.sync.on('clock', () => this._offsetMs.set(this.readOffset()));
  }

  /** Reactive current time (use inside computed()). */
  readonly nowSignal = (): Date => {
    this._tick();
    return new Date(Date.now() + this._offsetMs());
  };

  /** Non-reactive current time for services. */
  now(): Date {
    return new Date(Date.now() + this._offsetMs());
  }

  nowIso(): string {
    return this.now().toISOString();
  }

  advance(ms: number): void {
    this.setOffset(this._offsetMs() + ms);
  }

  /** Jump to a specific local time today (e.g. 16:00 for the batch). */
  jumpToTodayAt(hour: number, minute = 0): void {
    const target = this.now();
    target.setHours(hour, minute, 0, 0);
    this.setOffset(target.getTime() - Date.now());
  }

  reset(): void {
    this.setOffset(0);
  }

  private setOffset(ms: number): void {
    this._offsetMs.set(ms);
    localStorage.setItem(STORAGE_KEY, String(ms));
    this._tick.set(Date.now());
    this.sync.post('clock');
  }

  private readOffset(): number {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  }
}
