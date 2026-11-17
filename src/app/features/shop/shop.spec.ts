import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import { Shop } from './shop';
import { ShopFilters } from './services/shop-filters';

describe('Shop', () => {
  let fixture: ComponentFixture<Shop>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shop],
      providers: [
        provideRouter([{ path: 'shop', component: Shop }]),
        // Integration: add-to-cart checks the real Supabase session.
        { provide: SupabaseAuthService, useValue: { user: signal(null), isAuthenticated: signal(true), signOut: () => Promise.resolve({ data: null, error: null }) } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
  });

  async function open(url: string): Promise<ShopFilters> {
    await router.navigateByUrl(url);
    fixture = TestBed.createComponent(Shop);
    await fixture.whenStable();
    return fixture.debugElement.injector.get(ShopFilters);
  }

  it('renders one card per design for the default device', async () => {
    const f = await open('/shop');
    expect(f.device().id).toBe('iphone-15-pro-max');
    expect(fixture.nativeElement.querySelectorAll('app-product-card').length).toBe(f.pageItems().length);
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('iPhone 15 Pro Max');
  });

  it('reads device, colour and sort from the URL', async () => {
    const f = await open('/shop?model=iphone-16-pro&color=Tím Lilac&sort=low');
    expect(f.device().id).toBe('iphone-16-pro');
    expect(f.color()).toBe('Tím Lilac');
    expect(f.sku()?.colorName).toBe('Tím Lilac');
    expect(f.sort()).toBe('low');
  });

  it('shows no case-type control', async () => {
    await open('/shop');
    expect(fixture.nativeElement.textContent).not.toContain('Loại ốp');
  });

  it('ignores invalid params', async () => {
    const f = await open('/shop?model=nokia&color=nope&page=99');
    expect(f.device().id).toBe('iphone-15-pro-max');
    expect(f.color()).toBeNull();
    // Out-of-range pages clamp to the last page.
    expect(f.pageCount()).toBe(2);
    expect(f.page()).toBe(2);
  });

  it('writes filter changes to the URL and clears the colour when the device changes', async () => {
    const f = await open('/shop?model=iphone-16-pro&color=Tím Lilac');
    f.set({ model: 'galaxy-s24' });
    await fixture.whenStable();
    const params = router.parseUrl(router.url).queryParams;
    expect(params['model']).toBe('galaxy-s24');
    expect(params['color']).toBeUndefined();
  });
});
