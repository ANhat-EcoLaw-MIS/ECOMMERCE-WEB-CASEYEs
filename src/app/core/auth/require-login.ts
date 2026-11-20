import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';

/**
 * For actions that need a signed-in customer (add to cart, open the cart…). Call in an injection
 * context; the returned function checks the real Supabase session and otherwise sends the user to
 * the sign-in page with a returnUrl, the same way authGuard does.
 */
export function injectRequireLogin(): (returnUrl: string) => boolean {
  const auth = inject(SupabaseAuthService);
  const router = inject(Router);
  return (returnUrl: string) => {
    if (auth.isAuthenticated()) return true;
    void router.navigateByUrl(router.createUrlTree(['/auth/login'], { queryParams: { returnUrl } }));
    return false;
  };
}
