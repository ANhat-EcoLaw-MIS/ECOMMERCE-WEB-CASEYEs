import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import { CustomerSupport } from './customer-support';

describe('CustomerSupport', () => {
  let component: CustomerSupport;
  let fixture: ComponentFixture<CustomerSupport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerSupport],
      providers: [
        provideRouter([]),
        { provide: SupabaseAuthService, useValue: { isAuthenticated: signal(false), user: signal(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerSupport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
