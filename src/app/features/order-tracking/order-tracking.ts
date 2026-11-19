import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificationBell } from './components/notification-bell/notification-bell';
import { OrderCard } from './components/order-card/order-card';
import { ATTENTION_DOT } from './config/status-style';
import { fold } from './domain/actions';
import { LEGACY_TABS, ORDER_TABS, OrderTab, matchesTab } from './domain/timeline';
import { OrderTrackingService } from './services/order-tracking.service';
import { track } from './services/tracker';
import { OrderSkeleton } from './components/order-skeleton/order-skeleton';

const SEARCH_DEBOUNCE_MS = 300;
const TAB_KEYS = ORDER_TABS.map((t) => t.key);

/** FR-OT-03 "Lịch sử đơn hàng": entry page of Quản lý đơn hàng (Profile's tab links here). */
@Component({
  selector: 'app-order-tracking',
  imports: [RouterLink, OrderCard, NotificationBell, OrderSkeleton],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTracking {
  /** `?tab=` so the Back button keeps the filter (P1-1). */
  readonly tab = input<string>();

  private readonly orders = inject(OrderTrackingService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly tabs = ORDER_TABS;
  protected readonly dot = ATTENTION_DOT;
  protected readonly activeTab = computed<OrderTab>(() => {
    const t = this.tab();
    if (t && LEGACY_TABS[t]) return LEGACY_TABS[t];
    return t && (TAB_KEYS as string[]).includes(t) ? (t as OrderTab) : 'all';
  });
  /** What the customer typed; `query` follows it after 300 ms (P1-3). */
  protected readonly rawQuery = signal('');
  protected readonly query = signal('');
  private readonly reloading = signal(false);
  /** Skeleton only while orders are really on their way (no artificial delay). */
  protected readonly loading = computed(() => this.reloading() || !this.orders.ready());
  protected readonly loadError = signal<string | null>(null);
  protected readonly customerName = computed(() => this.orders.customer().name);

  protected readonly counts = computed(() => {
    const list = this.orders.myOrders();
    return Object.fromEntries(
      ORDER_TABS.map((t) => [t.key, list.filter((o) => matchesTab(o.status, t.key)).length]),
    ) as Record<OrderTab, number>;
  });

  /** Search by order code or product/design name, accent-insensitive. */
  protected readonly visible = computed(() => {
    const q = fold(this.query().trim().replace(/^#/, ''));
    return this.orders
      .myOrders()
      .filter((o) => matchesTab(o.status, this.activeTab()))
      .filter((o) => !q || fold(o.orderCode).includes(q) || o.items.some((i) => fold(i.productName).includes(q)));
  });

  protected readonly hasFilter = computed(() => this.activeTab() !== 'all' || this.query().trim() !== '');

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Skeleton keeps the layout stable while data loads (P1-3); it shows only until orders arrive.
    this.reload();
    track('order_list_viewed');

    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const value = this.rawQuery();
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.query.set(value);
        if (value.trim()) untracked(() => track('order_search', { hasResult: this.visible().length > 0 }));
      }, SEARCH_DEBOUNCE_MS);
    });
    destroyRef.onDestroy(() => clearTimeout(timer));
  }

  protected setTab(tab: OrderTab, el: HTMLElement): void {
    if (tab === this.activeTab()) return;
    track('tab_changed', { tab });
    void this.router.navigate([], { queryParams: { tab: tab === 'all' ? null : tab }, queryParamsHandling: 'merge', replaceUrl: true });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }

  protected reload(): void {
    this.reloading.set(true);
    const r = this.orders.load();
    this.loadError.set(r.error ? r.error.message : null);
    this.reloading.set(false);
  }

  protected onSearch(event: Event): void {
    this.rawQuery.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.rawQuery.set('');
    this.query.set('');
    void this.router.navigate([], { queryParams: { tab: null }, queryParamsHandling: 'merge', replaceUrl: true });
    (this.host.nativeElement.querySelector('input[type=search]') as HTMLInputElement | null)?.focus();
  }
}
