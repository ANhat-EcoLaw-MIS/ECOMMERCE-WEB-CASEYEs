import { inject, type Provider } from '@angular/core';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import { STAFF_SUPABASE_CLIENT, SUPABASE_CLIENT } from '../supabase/supabase.client';
import { StaffAuthService } from './staff-auth';

/**
 * Providers for the /admin route tree (mock back office).
 *
 * Inside the admin area, code that asks for the customer's client or auth service gets the staff
 * ones instead, so shared services (e.g. order tracking) query Supabase as the signed-in staff member.
 * Services that keep per-user state must also be re-provided at the admin route (see
 * ORDER_TRACKING_ADMIN_ROUTES) so they don't reuse the customer's root instance.
 *
 * When the back office becomes its own app, this file and the staff-* files move with it.
 */
export function provideStaffScope(): Provider[] {
  return [
    { provide: SUPABASE_CLIENT, useFactory: () => inject(STAFF_SUPABASE_CLIENT) },
    { provide: SupabaseAuthService, useExisting: StaffAuthService },
  ];
}
