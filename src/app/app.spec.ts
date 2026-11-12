import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthDialog } from './features/auth/auth-dialog';
import { SupabaseAuthService } from './core/supabase/supabase-auth.service';

@Component({
  selector: 'app-auth-dialog',
  template: '',
})
class AuthDialogStub {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: SupabaseAuthService, useValue: { isAuthenticated: () => false } },
      ],
    })
      .overrideComponent(App, {
        remove: { imports: [AuthDialog] },
        add: { imports: [AuthDialogStub] },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
