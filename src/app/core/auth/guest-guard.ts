import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';

export const guestGuard: CanActivateFn = () =>
  inject(SupabaseAuthService).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;
