import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Skeleton } from '../../../../shared/ui/loading/skeleton';

/**
 * Order-shaped skeletons built from the shared <app-skeleton>:
 * - `card`: one row of the order list (header, item, action bar).
 * - `detail`: the order detail page (status hero, timeline, items | summary aside).
 */
@Component({
  selector: 'app-order-skeleton',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', role: 'status', 'aria-busy': 'true', '[attr.aria-label]': 'label()' },
  template: `
    @if (variant() === 'detail') {
      <div class="mt-3 grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <div class="space-y-5 lg:col-span-8">
          <!-- Status hero -->
          <div class="rounded-card border border-line bg-surface-alt p-5 shadow-soft sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 space-y-2.5">
                <app-skeleton w="9rem" h="0.8rem" />
                <app-skeleton w="60%" h="1.6rem" />
                <app-skeleton w="40%" h="0.85rem" />
              </div>
              <app-skeleton w="7rem" h="1.75rem" radius="999px" />
            </div>
            <div class="mt-6 flex gap-3">
              <app-skeleton w="10rem" h="2.75rem" radius="999px" />
              <app-skeleton w="8rem" h="2.75rem" radius="999px" />
            </div>
          </div>
          <!-- Timeline -->
          <div class="rounded-card border border-line bg-surface-alt p-5 shadow-soft sm:p-6">
            <app-skeleton w="8rem" h="1rem" />
            <div class="mt-5 space-y-5">
              @for (i of steps; track i) {
                <div class="flex items-start gap-3">
                  <app-skeleton w="1.25rem" h="1.25rem" circle />
                  <div class="flex-1 space-y-2">
                    <app-skeleton [w]="i % 2 ? '45%' : '60%'" h="0.9rem" />
                    <app-skeleton w="30%" h="0.75rem" />
                  </div>
                </div>
              }
            </div>
          </div>
          <!-- Items -->
          <div class="rounded-card border border-line bg-surface-alt p-5 shadow-soft sm:p-6">
            @for (i of [0, 1]; track i) {
              <div class="flex gap-4 py-3" [class.border-t]="i > 0" [class.border-line]="i > 0">
                <app-skeleton w="4.5rem" h="9.5rem" radius="0.9rem" />
                <div class="flex-1 space-y-2.5 pt-1">
                  <app-skeleton w="70%" h="1rem" />
                  <app-skeleton w="40%" h="0.8rem" />
                  <app-skeleton w="25%" h="0.9rem" />
                </div>
              </div>
            }
          </div>
        </div>
        <!-- Summary -->
        <aside class="space-y-5 lg:col-span-4">
          <div class="space-y-3 rounded-card border border-line bg-surface-alt p-5 shadow-soft">
            <app-skeleton w="7rem" h="1rem" />
            @for (i of [0, 1, 2, 3]; track i) {
              <div class="flex justify-between gap-4">
                <app-skeleton w="40%" h="0.85rem" />
                <app-skeleton w="25%" h="0.85rem" />
              </div>
            }
            <div class="border-t border-line pt-3">
              <app-skeleton w="50%" h="1.25rem" />
            </div>
          </div>
          <div class="space-y-2.5 rounded-card border border-line bg-surface-alt p-5 shadow-soft">
            <app-skeleton w="6rem" h="1rem" />
            <app-skeleton h="0.85rem" />
            <app-skeleton w="70%" h="0.85rem" />
          </div>
        </aside>
      </div>
    } @else {
      <div class="flex flex-col gap-5">
        @for (i of rows(); track i) {
          <div class="overflow-hidden rounded-card border border-line bg-surface-alt shadow-soft">
            <div class="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <div class="space-y-2">
                <app-skeleton w="10rem" h="1rem" />
                <app-skeleton w="6rem" h="0.75rem" />
              </div>
              <app-skeleton w="6.5rem" h="1.5rem" radius="999px" />
            </div>
            <div class="flex gap-4 px-5 py-4">
              <app-skeleton w="3rem" h="6rem" radius="0.75rem" />
              <div class="flex-1 space-y-2.5 pt-1">
                <app-skeleton [w]="i % 2 ? '55%' : '75%'" h="1rem" />
                <app-skeleton w="35%" h="0.8rem" />
                <app-skeleton w="20%" h="0.9rem" />
              </div>
            </div>
            <div class="flex justify-end gap-3 border-t border-line bg-surface px-5 py-3">
              <app-skeleton w="7rem" h="2.75rem" radius="999px" />
              <app-skeleton w="9rem" h="2.75rem" radius="999px" />
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class OrderSkeleton {
  readonly variant = input<'card' | 'detail'>('card');
  readonly count = input(3);
  readonly label = input('Đang tải đơn hàng');
  protected readonly rows = computed(() => Array.from({ length: this.count() }, (_, i) => i));
  protected readonly steps = [0, 1, 2, 3];
}
