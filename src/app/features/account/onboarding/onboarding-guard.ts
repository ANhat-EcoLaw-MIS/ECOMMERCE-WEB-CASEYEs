import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import { ProfileRepository } from '../services/profile.repository';
import { sanitizeReturnUrl } from '../../../shared/utils/safe-return-url';

export const onboardingGuard: CanActivateFn = (route) => {
  const auth = inject(SupabaseAuthService);
  const router = inject(Router);
  const returnUrl = sanitizeReturnUrl(route.queryParamMap.get('returnUrl'));

  if (!auth.isAuthenticated()) return router.parseUrl(returnUrl);

  const userId = auth.user()?.id;
  if (!userId) return router.parseUrl(returnUrl);

  return inject(ProfileRepository)
    .getById(userId)
    .then((result) => {
      if (result.error || !result.data) return router.parseUrl(returnUrl);

      const status = result.data.onboarding_status;
      if (status === 'pending' || status == null) return true;
      return router.parseUrl(returnUrl);
    })
    .catch(() => router.parseUrl(returnUrl));
};
