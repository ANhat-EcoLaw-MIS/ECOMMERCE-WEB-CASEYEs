import { Injectable, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import { CartDrawerState } from './cart-drawer-state';
import type { PhoneCaseTone } from '../../shared/ui/phone-case-mock/phone-case-mock';

export interface CartItem {
  readonly id: string;
  readonly name: string;
  readonly model: string;
  readonly finish: string;
  readonly tone: PhoneCaseTone;
  readonly caption: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly stock: number;
  readonly custom: boolean;
  readonly snapshot?: string;
}
/**
 * Carts are stored per account: `caseye_cart_v2:<userId>`. The un-suffixed keys are the guest cart
 * (and where carts lived before they were per account), so nothing saved earlier is lost.
 */
const STORAGE_KEY = 'caseye_cart_v2';
const SAVED_KEY = 'caseye_saved_v2';
const keyFor = (base: string, owner: string | null) => (owner ? `${base}:${owner}` : base);
function restore(key: string): CartItem[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item.id === 'string' && Number.isFinite(item.unitPrice) && Number.isFinite(item.quantity)).map((item) => ({ ...item, stock: Number.isFinite(item.stock) ? item.stock : 99, custom: !!item.custom })) : [];
  } catch { return []; }
}
function persist(key: string, value: readonly CartItem[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value.length) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    // Storage full or disabled: the cart still works for this page view.
  }
}

/** Adds `extra` into `base`, summing quantities of the same line (capped at 99). */
function merge(base: readonly CartItem[], extra: readonly CartItem[]): CartItem[] {
  const out = [...base];
  for (const item of extra) {
    const i = out.findIndex((o) => o.id === item.id);
    if (i >= 0) out[i] = { ...out[i], quantity: Math.min(99, out[i].quantity + item.quantity) };
    else out.push(item);
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class CartState {
  private readonly auth = inject(SupabaseAuthService);
  private readonly drawer = inject(CartDrawerState);
  /** Whose cart is shown: the signed-in user's id, or null for the guest cart. */
  private readonly owner = computed(() => this.auth.user()?.id ?? null);

  /** Re-read from storage whenever the owner changes (login, logout, account switch). */
  readonly items = linkedSignal<string | null, readonly CartItem[]>({
    source: this.owner,
    computation: (owner) => this.load(STORAGE_KEY, owner),
  });
  readonly saved = linkedSignal<string | null, readonly CartItem[]>({
    source: this.owner,
    computation: (owner) => this.load(SAVED_KEY, owner),
  });
  readonly animationPulse = signal(0);
  readonly itemCount = computed(() => this.items().reduce((n, item) => n + item.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((n, item) => n + item.unitPrice * item.quantity, 0));
  // No shipping fee here: Thanh toán (Checkout) owns shipping fees and delivery options.
  readonly hasStockIssues = computed(() => this.items().some((item) => item.quantity > item.stock));

  constructor() {
    // Save each list under the current owner's key (items are already re-loaded when the owner changes).
    effect(() => persist(keyFor(STORAGE_KEY, this.owner()), this.items()));
    effect(() => persist(keyFor(SAVED_KEY, this.owner()), this.saved()));

    // Logging out (or switching account) must not leave the previous cart open on screen.
    let previous: string | null | undefined;
    effect(() => {
      const owner = this.owner();
      if (previous !== undefined && previous !== owner) untracked(() => this.drawer.close());
      previous = owner;
    });

    // Keep other tabs of the same account in sync.
    if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
      const owner = untracked(this.owner);
      if (event.key === keyFor(STORAGE_KEY, owner)) this.items.set(restore(event.key));
      if (event.key === keyFor(SAVED_KEY, owner)) this.saved.set(restore(event.key));
    });
  }

  /**
   * Cart for an owner. On sign-in, whatever was in the guest cart is merged into the account's
   * cart and the guest cart is cleared, so items added before logging in are kept.
   */
  private load(base: string, owner: string | null): CartItem[] {
    if (!owner) return restore(base);
    const own = restore(keyFor(base, owner));
    const guest = restore(base);
    if (!guest.length) return own;
    persist(base, []);
    return merge(own, guest);
  }
  add(item: CartItem): void {
    this.items.update((items) => {
      const old = items.find((other) => other.id === item.id);
      return old ? items.map((existing) => existing.id === item.id ? { ...existing, quantity: existing.quantity + item.quantity } : existing) : [...items, item];
    });
    this.animationPulse.update((n) => n + 1);
  }
  increase(id: string): void { this.items.update((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item)); }
  decrease(id: string): void { this.items.update((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item)); }
  remove(id: string): void { this.items.update((items) => items.filter((item) => item.id !== id)); }
  /** Undo for remove(): puts the line back where it was (merges if it was re-added meanwhile). */
  restore(item: CartItem, index: number): void {
    this.items.update((items) => {
      if (items.some((other) => other.id === item.id)) return items.map((o) => (o.id === item.id ? { ...o, quantity: Math.min(99, o.quantity + item.quantity) } : o));
      const next = [...items];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
  }
  saveForLater(id: string): void {
    const item = this.items().find((candidate) => candidate.id === id);
    if (!item) return;
    this.saved.update((saved) => [...saved.filter((other) => other.id !== id), item]);
    this.remove(id);
  }
  moveToCart(id: string): void {
    const item = this.saved().find((candidate) => candidate.id === id);
    if (!item) return;
    this.saved.update((saved) => saved.filter((candidate) => candidate.id !== id));
    this.add(item);
  }
  removeSaved(id: string): void { this.saved.update((saved) => saved.filter((candidate) => candidate.id !== id)); }
}
