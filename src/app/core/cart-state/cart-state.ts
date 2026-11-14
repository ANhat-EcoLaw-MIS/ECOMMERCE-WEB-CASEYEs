import { Injectable, computed, effect, signal } from '@angular/core';
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
const STORAGE_KEY = 'caseye_cart_v2';
const SAVED_KEY = 'caseye_saved_v2';
function restore(key: string): CartItem[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item.id === 'string' && Number.isFinite(item.unitPrice) && Number.isFinite(item.quantity)).map((item) => ({ ...item, stock: Number.isFinite(item.stock) ? item.stock : 99, custom: !!item.custom })) : [];
  } catch { return []; }
}
@Injectable({ providedIn: 'root' })
export class CartState {
  readonly items = signal<readonly CartItem[]>(restore(STORAGE_KEY));
  readonly saved = signal<readonly CartItem[]>(restore(SAVED_KEY));
  readonly animationPulse = signal(0);
  readonly itemCount = computed(() => this.items().reduce((n, item) => n + item.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((n, item) => n + item.unitPrice * item.quantity, 0));
  readonly shipping = computed(() => this.subtotal() === 0 || this.subtotal() >= 500000 ? 0 : 30000);
  readonly hasStockIssues = computed(() => this.items().some((item) => item.quantity > item.stock));

  constructor() {
    effect(() => { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items())); });
    effect(() => { if (typeof localStorage !== 'undefined') localStorage.setItem(SAVED_KEY, JSON.stringify(this.saved())); });
    if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) this.items.set(restore(STORAGE_KEY));
      if (event.key === SAVED_KEY) this.saved.set(restore(SAVED_KEY));
    });
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
