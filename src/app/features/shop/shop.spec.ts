import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import { Shop } from './shop';

describe('Shop', () => {
  let component: Shop;
  let fixture: ComponentFixture<Shop>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Integration: Shop checks the real Supabase session.
      providers: [{ provide: SupabaseAuthService, useValue: { user: signal(null), isAuthenticated: signal(true), signOut: () => Promise.resolve({ data: null, error: null }) } }],
      imports: [Shop],
    }).compileComponents();

    fixture = TestBed.createComponent(Shop);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
