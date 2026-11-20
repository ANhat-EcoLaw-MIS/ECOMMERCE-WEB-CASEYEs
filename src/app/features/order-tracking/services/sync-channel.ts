import { DestroyRef, Injectable, inject } from '@angular/core';

export type SyncTopic = 'db' | 'clock' | 'demo';

const CHANNEL = 'casecraft-order-tracking';

/**
 * Cross-tab sync so the customer tab updates the moment the Demo Console acts
 * (v5 decision). BroadcastChannel first; the `storage` event is the fallback.
 */
@Injectable({ providedIn: 'root' })
export class SyncChannel {
  private readonly channel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
  private readonly handlers = new Map<SyncTopic, Set<() => void>>();

  constructor() {
    const onMessage = (e: MessageEvent<SyncTopic>) => this.emit(e.data);
    const onStorage = (e: StorageEvent) => {
      if (!e.key?.startsWith('casecraft.ot.')) return;
      if (e.key.includes('.clock.')) this.emit('clock');
      else if (e.key.includes('.demo.')) this.emit('demo');
      else this.emit('db');
    };
    this.channel?.addEventListener('message', onMessage);
    if (!this.channel && typeof window !== 'undefined') window.addEventListener('storage', onStorage);

    inject(DestroyRef).onDestroy(() => {
      this.channel?.close();
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    });
  }

  post(topic: SyncTopic): void {
    this.channel?.postMessage(topic);
  }

  on(topic: SyncTopic, handler: () => void): void {
    const set = this.handlers.get(topic) ?? new Set();
    set.add(handler);
    this.handlers.set(topic, set);
  }

  private emit(topic: SyncTopic): void {
    this.handlers.get(topic)?.forEach((h) => h());
  }
}
