import { DestroyRef, Injectable, effect, inject, untracked } from '@angular/core';
import { Clock } from './clock';
import { ScheduledJobs } from './scheduled-jobs';

const EVERY_MS = 60_000;

/**
 * Stand-in for pg_cron: runs every background job once a minute and right after the clock moves
 * (simulator time travel), so time limits are enforced even when nobody presses a button.
 * Jobs are idempotent, so several open tabs running them is safe.
 */
@Injectable({ providedIn: 'root' })
export class AutoJobs {
  private readonly jobs = inject(ScheduledJobs);
  private readonly clock = inject(Clock);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    this.runSafely();
    const timer = setInterval(() => this.runSafely(), EVERY_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  constructor() {
    // Catch up as soon as the simulated time is moved.
    effect(() => {
      this.clock.offsetMs();
      if (this.started) untracked(() => this.runSafely());
    });
  }

  private runSafely(): void {
    try {
      this.jobs.runAll();
    } catch {
      // A concurrent write from another tab: the next run retries.
    }
  }
}
