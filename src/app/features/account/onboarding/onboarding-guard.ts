import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import { ProfileRepository } from '../services/profile.repository';
import { sanitizeReturnUrl } from '../../../shared/utils/safe-return-url';
import { isDemoGoogleUser } from '../../../shared/utils/demo-user';

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
      const email = auth.user()?.email;
      const signupFlow = route.queryParamMap.get('flow') === 'signup';
      // MOCK: The demo user only reopens onboarding through the signup flow.
      const demoGoogleUser = isDemoGoogleUser(email);
      const shouldShowOnboarding = demoGoogleUser
        ? signupFlow
        : signupFlow || status === 'pending' || status == null;
      if (shouldShowOnboarding) return true;
      return router.parseUrl(returnUrl);
    })
    .catch(() => router.parseUrl(returnUrl));
};
