import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import { CartState, type CartItem } from '../../core/cart-state/cart-state';
import { NotificationManager } from '../../shared/ui/notification/notification.manager';
import { Cart } from './cart';

const line = (id: string, name: string, quantity: number): CartItem => ({
  id,
  name,
  model: 'iPhone 16 Pro',
  finish: 'In UV bền màu · Tím Lilac',
  tone: 'lilac',
  caption: '',
  unitPrice: 300_000,
  quantity,
  stock: 10,
  custom: false,
});

describe('Cart', () => {
  let fixture: ComponentFixture<Cart>;
  let cart: CartState;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Cart],
      providers: [
        provideRouter([]),
        { provide: SupabaseAuthService, useValue: { user: signal({ id: 'u1' }), isAuthenticated: signal(true), signOut: () => Promise.resolve({ data: null, error: null }) } },
      ],
    }).compileComponents();
    cart = TestBed.inject(CartState);
    cart.add(line('cosmic-orbit:iphone-16-pro:sku-a', 'Cosmic Orbit', 1));
    cart.add(line('sakura-silk:iphone-16-pro:sku-b', 'Sakura Silk', 2));
    fixture = TestBed.createComponent(Cart);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders each line with a clear remove button', () => {
    expect(el().textContent).toContain('Cosmic Orbit');
    expect(el().querySelector('[aria-label="Xóa Cosmic Orbit khỏi giỏ hàng"]')).not.toBeNull();
    expect(el().querySelector('[aria-label="Xóa Sakura Silk khỏi giỏ hàng"]')).not.toBeNull();
  });

  it('removes a line from the cart page and offers undo', () => {
    el().querySelector<HTMLButtonElement>('[aria-label="Xóa Sakura Silk khỏi giỏ hàng"]')!.click();
    fixture.detectChanges();
    expect(cart.items().map((i) => i.name)).toEqual(['Cosmic Orbit']);

    const toast = TestBed.inject(NotificationManager).notifications().at(-1)!;
    expect(toast.actionLabel).toBe('Hoàn tác');
    TestBed.inject(NotificationManager).triggerAction(toast.id);
    expect(cart.items().map((i) => i.name)).toEqual(['Cosmic Orbit', 'Sakura Silk']);
    expect(cart.itemCount()).toBe(3);
  });

  it('"−" at quantity 1 removes the line instead of being disabled', () => {
    const minus = el().querySelector<HTMLButtonElement>('[aria-label="Xóa Cosmic Orbit khỏi giỏ"]')!;
    expect(minus.disabled).toBe(false);
    minus.click();
    fixture.detectChanges();
    expect(cart.items().map((i) => i.name)).toEqual(['Sakura Silk']);
  });

  it('shows the empty-cart state after removing every product', () => {
    for (const item of cart.items()) cart.remove(item.id);
    fixture.detectChanges();
    expect(el().textContent).toContain('Giỏ hàng của bạn đang trống');
  });
});
