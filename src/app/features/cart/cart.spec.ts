import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import { provideRouter } from '@angular/router';

import { CartState } from '../../core/cart-state/cart-state';
import { Cart } from './cart';

describe('Cart', () => {
  let component: Cart;
  let fixture: ComponentFixture<Cart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cart],
      providers: [provideRouter([]), { provide: SupabaseAuthService, useValue: { user: signal(null), isAuthenticated: signal(true), signOut: () => Promise.resolve({ data: null, error: null }) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Cart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the sample products and keeps the header count in sync with quantity changes', () => {
    const cart = TestBed.inject(CartState);
    fixture.detectChanges();

    expect(cart.itemCount()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Giỏ hàng của bạn');
    expect(fixture.nativeElement.textContent).toContain('Ốp Bloom in the clouds');

    const increaseButton = fixture.nativeElement.querySelector(
      '[aria-label="Tăng số lượng Ốp Bloom in the clouds"]',
    ) as HTMLButtonElement;
    increaseButton.click();
    fixture.detectChanges();

    expect(cart.itemCount()).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Bạn đang có 3 sản phẩm trong giỏ.');
  });

  it('shows the empty-cart state after removing every product', () => {
    const cart = TestBed.inject(CartState);
    cart.remove('bloom-01');
    cart.remove('lavender-02');

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Giỏ hàng đang trống');
  });
});
