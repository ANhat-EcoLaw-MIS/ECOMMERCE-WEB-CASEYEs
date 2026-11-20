import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { Skeleton } from './skeleton';

/**
 * How the wait is shown. Pick by what the user is waiting for:
 * - `spinner` / `dots`: a short action inside a known area (button, small panel), < ~2s.
 * - `skeleton`: content that is loading into a known layout (profile, lists, cards). Keeps layout stable.
 * - `bar`: indeterminate top progress (page/route/background refresh) that should not block.
 * - `overlay`: a blocking step the user must not interrupt (sign-up hand-off, payment). Prefer the
 *   `LoadingOverlay` service, which shows this globally with delay/min-duration handling.
 */
export type LoadingVariant = 'spinner' | 'dots' | 'skeleton' | 'bar' | 'overlay';

/** Ready-made skeleton layouts. Use `<app-skeleton>` directly for anything custom. */
export type SkeletonPreset = 'lines' | 'card' | 'list' | 'grid' | 'profile' | 'form';

@Component({
  selector: 'app-loading',
  imports: [Skeleton],
  templateUrl: './loading.html',
  styleUrl: './loading.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
    'aria-busy': 'true',
    '[class]': 'hostClass()',
    '[attr.aria-label]': 'label() || defaultLabel',
    '[attr.aria-valuenow]': 'percent()',
  },
})
export class Loading implements OnInit {
  readonly variant = input<LoadingVariant>('spinner');
  /** Visible text (spinner/dots/overlay) and screen-reader label. */
  readonly label = input('');
  /** Secondary line for the overlay card. */
  readonly message = input('');
  readonly preset = input<SkeletonPreset>('lines');
  /** Repeats for list/grid/lines presets. */
  readonly count = input(3);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** 0–1 for a determinate `bar` (e.g. download progress); null = indeterminate. */
  readonly value = input<number | null>(null);
  protected readonly percent = computed(() => {
    const v = this.value();
    return v == null ? null : Math.round(Math.min(1, Math.max(0, v)) * 100);
  });
  /**
   * Wait this long before showing anything (ms). Fast loads then never flash a loader.
   * Skeletons default to 0 (they replace content in place); spinners to 150ms.
   */
  readonly delay = input<number | null>(null);

  protected readonly defaultLabel = 'Đang tải';
  protected readonly items = computed(() => Array.from({ length: Math.max(1, this.count()) }, (_, i) => i));
  protected readonly visible = signal(false);
  protected readonly hostClass = computed(() => `loading loading--${this.variant()} loading--${this.size()}`);

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const wait = this.delay() ?? (this.variant() === 'skeleton' || this.variant() === 'overlay' ? 0 : 150);
    if (wait <= 0) {
      this.visible.set(true);
      return;
    }
    const t = setTimeout(() => this.visible.set(true), wait);
    this.destroyRef.onDestroy(() => clearTimeout(t));
  }
}
