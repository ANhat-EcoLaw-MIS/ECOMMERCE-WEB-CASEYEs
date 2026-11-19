import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Account } from './account';
import { AccountState } from './services/account-state';
import { AccountToast } from './services/account-toast';
import { CustomerOrderFeed } from '../../shared/services/customer-order-feed';
import { StudioState } from '../design-studio/services/studio-state';
import { ProfileRepository } from './services/profile.repository';

describe('Account', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;
  const profile = signal({
    onboarding_status: 'completed',
    addresses: [],
    preferences: [],
    device_type: null,
    display_name: null,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        {
          provide: AccountState,
          useValue: {
            profile: profile.asReadonly(),
            loading: () => false,
            error: () => null,
            email: () => '',
            saving: () => false,
            load: () => Promise.resolve(),
            save: () => Promise.resolve(true),
          },
        },
        { provide: AccountToast, useValue: { show: () => undefined } },
        { provide: CustomerOrderFeed, useValue: { orders: () => [], loyaltyPoints: () => 0 } },
        { provide: StudioState, useValue: { savedDesigns: () => [] } },
        { provide: ProfileRepository, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides the onboarding banner when the profile is completed', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#onboarding-title')).toBeNull();
  });
});
