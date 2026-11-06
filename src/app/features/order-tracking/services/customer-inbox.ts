import { Injectable, computed, inject, signal } from '@angular/core';
import { InboxMessage } from '../models/order-tracking.model';
import { OrderTrackingService } from './order-tracking.service';
import { SyncChannel } from './sync-channel';

const READ_KEY = 'casecraft.ot.read.v1';

/**
 * In-app notifications for the current customer (P1-16). Messages come from the mock
 * Notification Service; read state is kept per browser. The header bell itself belongs to the
 * team's layout, so this list is shown inside the order pages until the header consumes it.
 */
@Injectable({ providedIn: 'root' })
export class CustomerInbox {
  private readonly orders = inject(OrderTrackingService);
  private readonly sync = inject(SyncChannel);
  private readonly _read = signal<ReadonlySet<string>>(this.readIds());

  readonly messages = computed<readonly InboxMessage[]>(() => {
    const id = this.orders.customer().id;
    return [...this.orders.db().inbox]
      .filter((m) => m.channel === 'InApp' && m.customerId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
  readonly unreadCount = computed(() => this.messages().filter((m) => !this._read().has(m.id)).length);

  constructor() {
    this.sync.on('db', () => this._read.set(this.readIds()));
  }

  isRead(id: string): boolean {
    return this._read().has(id);
  }

  markRead(id: string): void {
    this.save(new Set([...this._read(), id]));
  }

  markAllRead(): void {
    this.save(new Set([...this._read(), ...this.messages().map((m) => m.id)]));
  }

  private save(ids: Set<string>): void {
    this._read.set(ids);
    localStorage.setItem(READ_KEY, JSON.stringify({ schemaVersion: 1, ids: [...ids].slice(-500) }));
  }

  private readIds(): Set<string> {
    try {
      const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(READ_KEY);
      const parsed = raw ? (JSON.parse(raw) as { schemaVersion: number; ids: string[] }) : null;
      return new Set(parsed?.schemaVersion === 1 ? parsed.ids : []);
    } catch {
      return new Set();
    }
  }
}
