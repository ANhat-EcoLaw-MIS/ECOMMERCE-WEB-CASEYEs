import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import { CartDrawerState } from './cart-drawer-state';
import { CartState, type CartItem } from './cart-state';

const item = (id: string, quantity = 1): CartItem => ({
  id,
  name: id,
  model: 'iPhone 15 Pro Max',
  finish: '',
  tone: 'lilac',
  caption: '',
  unitPrice: 100_000,
  quantity,
  stock: 10,
  custom: false,
});

describe('CartState (per account)', () => {
  const user = signal<{ id: string } | null>(null);
  let cart: CartState;
  let drawer: CartDrawerState;

  const signIn = (id: string | null) => {
    user.set(id ? { id } : null);
    TestBed.tick();
  };

  beforeEach(() => {
    localStorage.clear();
    user.set(null);
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseAuthService, useValue: { user } }],
    });
    cart = TestBed.inject(CartState);
    drawer = TestBed.inject(CartDrawerState);
  });

  it('empties the cart count when the user logs out, and restores it on login', () => {
    signIn('alice');
    cart.add(item('a', 2));
    TestBed.tick();
    expect(cart.itemCount()).toBe(2);

    signIn(null);
    expect(cart.itemCount()).toBe(0);
    expect(cart.items()).toEqual([]);

    signIn('alice');
    expect(cart.itemCount()).toBe(2);
  });

  it('keeps accounts apart', () => {
    signIn('alice');
    cart.add(item('a'));
    TestBed.tick();
    signIn('bob');
    expect(cart.itemCount()).toBe(0);
    cart.add(item('b', 3));
    TestBed.tick();
    signIn('alice');
    expect(cart.items().map((i) => i.id)).toEqual(['a']);
  });

  it('merges the guest cart into the account on sign-in, then clears the guest cart', () => {
    localStorage.setItem('caseye_cart_v2', JSON.stringify([item('g', 1)]));
    signIn('alice');
    expect(cart.items().map((i) => i.id)).toEqual(['g']);
    signIn(null);
    expect(cart.itemCount()).toBe(0);
  });

  it('closes the drawer when the user logs out', () => {
    signIn('alice');
    drawer.show();
    signIn(null);
    expect(drawer.open()).toBe(false);
  });
});
