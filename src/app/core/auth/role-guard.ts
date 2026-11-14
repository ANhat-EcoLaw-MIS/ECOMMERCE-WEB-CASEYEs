import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import { StaffRole, StaffSession } from './staff-session';

/**
 * Admin area: a real signed-in account whose profiles.role is a staff role (admin passes every
 * check). Everyone else goes to the staff sign-in page.
 */
export const roleGuard =
  (roles: readonly StaffRole[] = ['Operator', 'CSKH', 'Admin']): CanActivateFn =>
  async (_route, state) => {
    const router = inject(Router);
    const session = inject(StaffSession);
    const toSignIn = router.createUrlTree(['/admin/dang-nhap'], { queryParams: { returnUrl: state.url } });
    if (!inject(SupabaseAuthService).isAuthenticated()) return toSignIn;
    const role = await session.refresh();
    if (role && (role === 'Admin' || roles.includes(role))) return true;
    return toSignIn;
  };
