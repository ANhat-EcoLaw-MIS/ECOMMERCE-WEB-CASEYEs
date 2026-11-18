import { Injectable, Signal, inject, signal } from '@angular/core';
import {
  InboxMessage,
  Order,
  OutboundEvent,
  PolicyConsent,
  RetryQueueItem,
  WebhookEvent,
} from '../models/order-tracking.model';
import { SyncChannel } from './sync-channel';
import { resolveProductImage } from '../../shop/catalog';

/** Everything Quản lý đơn hàng persists. Mirrors docs/order-management-migration.sql. */
export interface OrderTrackingDb {
  readonly version: 2;
  orders: Order[];
  consents: PolicyConsent[];
  webhookEvents: WebhookEvent[];
  retryQueue: RetryQueueItem[];
  inbox: InboxMessage[];
  outbound: OutboundEvent[];
  /** Processed operation keys (FR-OT-EX-06 idempotency). */
  idempotencyKeys: string[];
  orderSeq: number;
}

export function emptyDb(): OrderTrackingDb {
  return {
    version: 2,
    orders: [],
    consents: [],
    webhookEvents: [],
    retryQueue: [],
    inbox: [],
    outbound: [],
    idempotencyKeys: [],
    orderSeq: 0,
  };
}

/**
 * Repository boundary (decision A). The service only talks to this abstract class, so the
 * localStorage mock can later be replaced by a Supabase implementation where `transact`
 * becomes a Postgres function (RPC) running in one transaction.
 */
@Injectable({ providedIn: 'root', useFactory: () => new LocalStorageOrderRepository() })
export abstract class OrderRepository {
  abstract readonly state: Signal<OrderTrackingDb>;
  /**
   * Runs `fn` on a fresh draft read from storage and persists it when `fn` returns.
   * Throwing inside `fn` aborts without writing (all-or-nothing).
   */
  abstract transact<T>(fn: (db: OrderTrackingDb) => T): T;
  abstract reload(): void;
  abstract reset(): void;
}

const STORAGE_KEY = 'casecraft.ot.db.v2';
const MAX_KEYS = 500;

export class LocalStorageOrderRepository extends OrderRepository {
  private readonly sync = inject(SyncChannel);
  private readonly _state = signal<OrderTrackingDb>(this.read());
  override readonly state = this._state.asReadonly();

  constructor() {
    super();
    this.sync.on('db', () => this.reload());
  }

  override transact<T>(fn: (db: OrderTrackingDb) => T): T {
    // Re-read first so a change made by another tab is seen (optimistic concurrency).
    const draft = structuredClone(this.read());
    const result = fn(draft);
    draft.idempotencyKeys = draft.idempotencyKeys.slice(-MAX_KEYS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    this._state.set(draft);
    this.sync.post('db');
    return result;
  }

  override reload(): void {
    this._state.set(this.read());
  }

  override reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._state.set(emptyDb());
    this.sync.post('db');
  }

  private read(): OrderTrackingDb {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyDb();
      const parsed = JSON.parse(raw) as OrderTrackingDb;
      return parsed.version === 2 ? withCurrentImages({ ...emptyDb(), ...parsed }) : emptyDb();
    } catch {
      return emptyDb();
    }
  }
}

/** Maps item images saved before the asset change to the pictures the shop shows today. */
function withCurrentImages(db: OrderTrackingDb): OrderTrackingDb {
  return {
    ...db,
    orders: db.orders.map((o) => ({
      ...o,
      items: o.items.map((i) => ({
        ...i,
        // Only legacy /products/*.webp paths change; studio previews and other URLs are kept.
        imageUrl: resolveProductImage(i.imageUrl, i.isCustom ? undefined : i.productName),
        design: i.design ? { ...i.design, previewUrl: resolveProductImage(i.design.previewUrl) } : undefined,
      })),
    })),
  };
}
