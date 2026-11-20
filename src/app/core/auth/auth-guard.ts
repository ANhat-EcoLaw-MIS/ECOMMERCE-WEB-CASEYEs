import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';

export const authGuard: CanActivateFn = (_route, state) =>
  inject(SupabaseAuthService).isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
