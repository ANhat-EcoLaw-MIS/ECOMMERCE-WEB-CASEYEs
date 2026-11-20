import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OrderIntake } from '../../shared/services/order-intake';
import { OnboardingStatusService } from '../../core/auth/onboarding-status';
import { Checkout, catalogRefFor } from './checkout';
import { CheckoutAddressBook } from './services/checkout-address';

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        // The cart is per account, so CartState reads the signed-in user.
        { provide: SupabaseAuthService, useValue: { user: signal(null), isAuthenticated: signal(false), signOut: () => Promise.resolve({ data: null, error: null }) } },
        // Integration port to Quản lý đơn hàng (bound in app.config.ts in the real app).
        { provide: OnboardingStatusService, useValue: { current: () => Promise.resolve(null), skip: () => Promise.resolve(true) } },
        { provide: OrderIntake, useValue: { placeOrder: () => ({ data: { orderCode: 'CC-TEST' }, error: null }) } },
        // Address book (table `addresses`): a customer with one saved address.
        {
          provide: CheckoutAddressBook,
          useValue: {
            load: () => Promise.resolve({ fullName: 'Lê Test', phone: '0912345678', streetAddress: '1 Lê Lợi, Bến Nghé, Quận 1, TP. HCM', isDefault: true, isVerified: true }),
            save: (a: unknown) => Promise.resolve({ data: a, error: null }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the customer\'s saved address, never a hard-coded recipient', async () => {
    await fixture.whenStable();
    expect(component.checkoutService.address().fullName).toBe('Lê Test');
    expect(component.checkoutService.hasAddress()).toBe(true);
  });

  it('gives every checkout session its own checkout_ref (Spec B6/B8)', () => {
    const service = component.checkoutService;
    const first = service.activeOrder();
    expect(first?.checkoutRef).toMatch(/^ck-/);
    service.markPlaced('CC-261120-0001');
    expect(service.activeOrder()?.placedOrderCode).toBe('CC-261120-0001');
    service.startNewSession();
    expect(service.placedOrderCode()).toBeNull();
    const second = service.createNewOrder();
    expect(second.checkoutRef).toBeTruthy();
    expect(second.checkoutRef).not.toBe(first?.checkoutRef);
  });
});

describe('Checkout — reloading the success page', () => {
  const placedOrder = {
    id: 'ck-saved', checkoutRef: 'ck-saved', orderCode: 'CE-89421', transactionId: 'TXN-1', createdAt: '2026-11-20T10:00:00.000Z',
    placedOrderCode: 'CC-261120-0042',
    items: [{ id: 'accessory-ring-holder', designCode: 'accessory-ring-holder', productType: 'IN_STOCK', name: 'Nhẫn giữ từ tính', device: 'Phụ kiện', price: 79000, quantity: 1, imageUrl: '/x.png' }],
    address: { fullName: 'Lê Test', phone: '0912345678', streetAddress: '1 Lê Lợi' },
    shippingMethod: { id: 'standard', name: 'Tiêu chuẩn', price: 30000, estimatedDelivery: '2-4 ngày' },
    paymentMethod: 'cod', paymentMethodTitle: 'COD', giftPackage: { enabled: false }, voucher: null, shipperNote: '',
    subtotal: 79000, shippingFee: 30000, giftPrice: 0, discountAmount: 0, totalAmount: 109000,
    orderStatus: 'confirmed', paymentStatus: 'pending', productionStatus: 'printing', shippingStatus: 'pending', loyaltyStars: 480, stages: [],
  };
  const placeOrder = vi.fn();

  beforeEach(async () => {
    sessionStorage.setItem('caseeye_active_checkout_order', JSON.stringify(placedOrder));
    // A line left unticked during the partial purchase is still in the guest cart.
    localStorage.setItem('caseye_cart_v2', JSON.stringify([{ id: 'accessory-flower-charm', name: 'Charm hoa', model: 'Phụ kiện', finish: 'Charm', tone: 'lilac', caption: '', unitPrice: 29000, quantity: 1, stock: 30, custom: false }]));
    placeOrder.mockReset();
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ step: 'success' }) }, queryParams: of({ step: 'success' }) } },
        { provide: SupabaseAuthService, useValue: { user: signal(null), isAuthenticated: signal(false), signOut: () => Promise.resolve({ data: null, error: null }) } },
        { provide: OnboardingStatusService, useValue: { current: () => Promise.resolve(null), skip: () => Promise.resolve(true) } },
        { provide: OrderIntake, useValue: { placeOrder } },
        { provide: CheckoutAddressBook, useValue: { load: () => Promise.resolve({ fullName: 'Someone Else', phone: '0900000000', streetAddress: 'Khác' }), save: () => Promise.resolve({ data: null, error: null }) } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('keeps showing the placed order, not the cart leftovers or form defaults', async () => {
    const fixture = TestBed.createComponent(Checkout);
    await fixture.whenStable();
    const service = fixture.componentInstance.checkoutService;
    const order = service.activeOrder()!;
    expect(fixture.componentInstance.currentStep()).toBe('success');
    expect(service.placedOrderCode()).toBe('CC-261120-0042');
    expect(order.checkoutRef).toBe('ck-saved');
    expect(order.items.map((i) => i.designCode)).toEqual(['accessory-ring-holder']);
    expect(order.totalAmount).toBe(109000);
    expect(order.paymentMethod).toBe('cod');
    expect(order.address.fullName).toBe('Lê Test');
    expect(placeOrder).not.toHaveBeenCalled();
  });
});

describe('catalogRefFor', () => {
  it('reads artwork, model and SKU from a shop line id', () => {
    expect(catalogRefFor('lavender-haze:iphone-15-pro-max:sku-ip15pm-titanium', false)).toEqual({
      productSlug: 'lavender-haze',
      modelSlug: 'iphone-15-pro-max',
      skuId: 'sku-ip15pm-titanium',
    });
  });

  it('reads the slug of an accessory', () => {
    expect(catalogRefFor('accessory-ring-holder', false)).toEqual({ productSlug: 'accessory-ring-holder' });
  });

  it('reads the studio SKU of a custom design line', () => {
    expect(catalogRefFor('design:sku-ip16p-lilac:m3x9', true)).toEqual({ skuId: 'sku-ip16p-lilac' });
    expect(catalogRefFor('design:iphone-16-pro:m3x9', true)).toBeUndefined();
  });
});
