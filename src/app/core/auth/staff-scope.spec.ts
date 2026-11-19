import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import { STAFF_SUPABASE_CLIENT, SUPABASE_CLIENT } from '../supabase/supabase.client';
import { StaffAuthService } from './staff-auth';
import { provideStaffScope } from './staff-scope';

/** Minimal fake of the Supabase auth client: one session per client, like the real storageKey split. */
function fakeClient(name: string) {
  let session: { user: { id: string; email: string } } | null = null;
  let listener: ((e: string, s: typeof session) => void) | null = null;
  return {
    name,
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: (cb: typeof listener) => {
        listener = cb;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        session = { user: { id: `${name}-${email}`, email } };
        listener?.('SIGNED_IN', session);
        return { data: { session }, error: null };
      },
      signOut: async () => {
        session = null;
        listener?.('SIGNED_OUT', null);
        return { error: null };
      },
    },
  };
}

describe('Customer vs staff sessions', () => {
  const customerClient = fakeClient('customer');
  const staffClient = fakeClient('staff');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: customerClient },
        { provide: STAFF_SUPABASE_CLIENT, useValue: staffClient },
      ],
    });
  });

  it('a staff sign-in does not change who is signed in on the storefront', async () => {
    const customer = TestBed.inject(SupabaseAuthService);
    const staff = TestBed.inject(StaffAuthService);
    await customer.init();
    await staff.ready;

    await customer.signIn({ email: 'khach@caseye.vn', password: 'x' });
    await staff.signIn({ email: 'admin@caseye.vn', password: 'x' });

    expect(customer.user()?.email).toBe('khach@caseye.vn');
    expect(staff.user()?.email).toBe('admin@caseye.vn');

    await staff.signOut();
    expect(staff.isAuthenticated()).toBe(false);
    expect(customer.isAuthenticated()).toBe(true);
  });

  it('inside the admin scope, the customer tokens resolve to the staff client and session', () => {
    const root = TestBed.inject(EnvironmentInjector);
    const admin = createEnvironmentInjector(provideStaffScope(), root);

    expect(admin.get(SUPABASE_CLIENT)).toBe(staffClient as never);
    expect(admin.get(SupabaseAuthService)).toBe(TestBed.inject(StaffAuthService) as never);
    // Outside /admin nothing changes.
    expect(TestBed.inject(SUPABASE_CLIENT)).toBe(customerClient as never);
    expect(TestBed.inject(SupabaseAuthService)).not.toBe(TestBed.inject(StaffAuthService) as never);
  });
});
