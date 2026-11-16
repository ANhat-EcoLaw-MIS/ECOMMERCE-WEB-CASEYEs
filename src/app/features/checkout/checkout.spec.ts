import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrderIntake } from '../../shared/services/order-intake';
import { OnboardingStatusService } from '../../core/auth/onboarding-status';
import { Checkout } from './checkout';

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        // Integration port to Quản lý đơn hàng (bound in app.config.ts in the real app).
        { provide: OnboardingStatusService, useValue: { current: () => Promise.resolve(null), skip: () => Promise.resolve(true) } },
        { provide: OrderIntake, useValue: { placeOrder: () => ({ data: { orderCode: 'CC-TEST' }, error: null }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
