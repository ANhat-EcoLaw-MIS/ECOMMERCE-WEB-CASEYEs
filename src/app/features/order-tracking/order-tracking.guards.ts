import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import { DemoSettings } from './services/demo-settings';

/**
 * Customer pages need a logged-in user (UC-OT-01 AF 1.1: login, then come back).
 * When the simulator's "demo customer" switch is on (admin area), the demo customer is used instead.
 */
export const customerGuard: CanActivateFn = (_route, state) => {
  if (inject(SupabaseAuthService).isAuthenticated() || inject(DemoSettings).enabled()) return true;
  return inject(Router).createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
