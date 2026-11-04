import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import { DemoSettings } from './services/demo-settings';

/**
 * Customer pages need a logged-in user (UC-OT-01 AF 1.1: login, then come back).
 * In demo mode (`?demo=1`) a demo customer is used so the flow can be shown without an account.
 */
export const customerGuard: CanActivateFn = (route, state) => {
  const demo = inject(DemoSettings);
  demo.applyQueryFlag(route.queryParamMap.get('demo'));
  if (inject(SupabaseAuthService).isAuthenticated() || demo.enabled()) return true;
  return inject(Router).createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/** The Demo Console is a testing tool, reachable only after opening a page with `?demo=1`. */
export const demoGuard: CanActivateFn = (route) => {
  const demo = inject(DemoSettings);
  demo.applyQueryFlag(route.queryParamMap.get('demo'));
  return demo.enabled() ? true : inject(Router).createUrlTree(['/order-tracking']);
};
