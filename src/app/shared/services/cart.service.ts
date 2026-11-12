import { Injectable, computed, signal } from '@angular/core';
import { CartItem } from '../models/cart.model';

const STORAGE_KEY = 'caseyes.cart.v1';

function load(): CartItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as CartItem[]).filter((i) => i && typeof i.id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Single cart for the whole site (Shop and Design Studio add, Giỏ hàng shows, Thanh toán reads).
 * Kept in localStorage until the Cart team moves it to Supabase.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>(load());
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().reduce((s, i) => s + i.quantity, 0));
  readonly hasCustom = computed(() => this._items().some((i) => i.productType === 'CUSTOM'));
  readonly subtotal = computed(() => this._items().reduce((s, i) => s + i.unitPrice * i.quantity, 0));

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) this._items.set(load());
      });
    }
  }

  add(item: Omit<CartItem, 'id' | 'addedAt'> & { id?: string }): CartItem {
    const full: CartItem = { ...item, id: item.id ?? `ci-${Date.now().toString(36)}`, addedAt: new Date().toISOString() };
    this.save([...this._items().filter((i) => i.id !== full.id), full]);
    return full;
  }

  remove(id: string): void {
    this.save(this._items().filter((i) => i.id !== id));
  }

  clear(): void {
    this.save([]);
  }

  private save(items: CartItem[]): void {
    this._items.set(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota exceeded (large design previews): keep the in-memory cart.
    }
  }
}
