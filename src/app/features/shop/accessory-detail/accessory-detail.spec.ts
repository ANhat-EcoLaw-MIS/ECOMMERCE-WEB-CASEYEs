import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import { CartState } from '../../../core/cart-state/cart-state';
import { ACCESSORIES } from '../catalog';
import { ACCESSORY_DETAILS } from '../accessory-content';
import { AccessoryDetail } from './accessory-detail';

describe('AccessoryDetail', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AccessoryDetail],
      providers: [
        provideRouter([]),
        { provide: SupabaseAuthService, useValue: { user: signal({ id: 'u1' }), isAuthenticated: signal(true) } },
      ],
    }).compileComponents();
  });

  const open = async (id: string) => {
    const fixture = TestBed.createComponent(AccessoryDetail);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it('has detail content for every accessory', () => {
    for (const a of ACCESSORIES) expect(ACCESSORY_DETAILS[a.id]?.highlights.length).toBeGreaterThan(0);
  });

  it('shows the accessory with highlights and adds the chosen quantity to the cart', async () => {
    const fixture = await open('accessory-magnetic-wallet');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Ví da từ tính');
    expect(el.textContent).toContain('Đựng 3 thẻ');

    el.querySelector<HTMLButtonElement>('[aria-label="Tăng"]')!.click();
    fixture.detectChanges();
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Thêm vào giỏ'))!.click();
    expect(TestBed.inject(CartState).items()[0]).toMatchObject({ id: 'accessory-magnetic-wallet', quantity: 2 });
  });

  it('disables buying when out of stock and shows not-found for unknown ids', async () => {
    const sold = await open('accessory-astronaut-star');
    const buy = [...(sold.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes('Tạm hết hàng'));
    expect(buy?.disabled).toBe(true);

    const missing = await open('nope');
    expect((missing.nativeElement as HTMLElement).textContent).toContain('Không tìm thấy phụ kiện');
  });
});
