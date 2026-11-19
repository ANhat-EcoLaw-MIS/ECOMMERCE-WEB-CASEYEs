import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SupabaseAuthService } from '../../../../core/supabase/supabase-auth.service';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { AccountState } from '../../services/account-state';
import { SignoutTab } from './signout-tab';

describe('SignoutTab', () => {
  let signOutCalls = 0;
  let result: { data: null; error: null | { code: string; message: string } } = { data: null, error: null };

  beforeEach(async () => {
    signOutCalls = 0;
    result = { data: null, error: null };
    await TestBed.configureTestingModule({
      imports: [SignoutTab],
      providers: [
        provideRouter([]),
        {
          provide: SupabaseAuthService,
          useValue: {
            user: signal({ email: 'demo@caseye.vn' }),
            signOut: () => {
              signOutCalls++;
              return Promise.resolve(result);
            },
          },
        },
        { provide: AccountState, useValue: { profile: signal(null) } },
      ],
    }).compileComponents();
  });

  const buttons = (el: HTMLElement) => Array.from(el.querySelectorAll('button'));

  it('shows the signed-in email and signs out, goes home and notifies', async () => {
    const fixture = TestBed.createComponent(SignoutTab);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('demo@caseye.vn');

    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    buttons(el).find((b) => b.textContent?.includes('Đăng xuất'))!.click();
    await fixture.whenStable();

    expect(signOutCalls).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(TestBed.inject(NotificationManager).notifications()[0]?.title).toBe('Đăng xuất thành công');
  });

  it('shows an error and stays when sign-out fails', async () => {
    result = { data: null, error: { code: '500', message: 'offline' } };
    const fixture = TestBed.createComponent(SignoutTab);
    await fixture.whenStable();
    buttons(fixture.nativeElement).find((b) => b.textContent?.includes('Đăng xuất'))!.click();
    await fixture.whenStable();
    expect(TestBed.inject(NotificationManager).notifications()[0]?.variant).toBe('error');
  });

  it('"Ở lại" emits cancelled', async () => {
    const fixture = TestBed.createComponent(SignoutTab);
    await fixture.whenStable();
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));
    buttons(fixture.nativeElement).find((b) => b.textContent?.includes('Ở lại'))!.click();
    expect(cancelled).toBe(true);
  });
});
