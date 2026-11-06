import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderCard } from './components/order-card/order-card';
import { ORDER_TABS, OrderTab, matchesTab } from './domain/timeline';
import { OrderStatus } from './models/order-tracking.model';
import { OrderTrackingService } from './services/order-tracking.service';

/** FR-OT-03 "Lịch sử đơn hàng": entry page of Quản lý đơn hàng (Profile's tab links here). */
@Component({
  selector: 'app-order-tracking',
  imports: [RouterLink, OrderCard],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTracking {
  private readonly orders = inject(OrderTrackingService);

  protected readonly tabs = ORDER_TABS;
  protected readonly activeTab = signal<OrderTab>('all');
  protected readonly query = signal('');
  protected readonly loadError = signal<string | null>(null);
  protected readonly customerName = computed(() => this.orders.customer().name);

  protected readonly counts = computed(() => {
    const list = this.orders.myOrders();
    return Object.fromEntries(
      ORDER_TABS.map((t) => [t.key, list.filter((o) => matchesTab(o.status, t.key)).length]),
    ) as Record<OrderTab, number>;
  });

  protected readonly visible = computed(() => {
    const q = this.query().trim().toUpperCase().replace(/^#/, '');
    return this.orders
      .myOrders()
      .filter((o) => matchesTab(o.status, this.activeTab()))
      .filter((o) => !q || o.orderCode.toUpperCase().includes(q));
  });

  protected readonly hasFilter = computed(() => this.activeTab() !== 'all' || this.query().trim() !== '');

  constructor() {
    this.reload();
  }

  protected isAction(status: OrderStatus): boolean {
    return matchesTab(status, 'action');
  }

  protected reload(): void {
    const r = this.orders.load();
    this.loadError.set(r.error ? r.error.message : null);
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.activeTab.set('all');
    this.query.set('');
  }
}
