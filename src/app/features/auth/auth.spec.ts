import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from './auth';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';

describe('Auth', () => {
  let component: Auth;
  let fixture: ComponentFixture<Auth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Auth],
      providers: [
        provideRouter([]),
        {
          provide: SupabaseAuthService,
          useValue: {
            isAuthenticated: () => false,
            signIn: () => Promise.resolve({ data: null, error: null }),
            signUp: () => Promise.resolve({ data: null, error: null }),
            resetPassword: () => Promise.resolve({ data: null, error: null }),
            updatePassword: () => Promise.resolve({ data: null, error: null }),
            signOut: () => Promise.resolve({ data: null, error: null }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Auth);
    fixture.componentRef.setInput('mode', 'login');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
