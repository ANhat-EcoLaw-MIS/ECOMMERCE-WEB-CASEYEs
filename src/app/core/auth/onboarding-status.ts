import { Injectable, Injector, inject } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';

export type OnboardingStatus = 'pending' | 'completed' | 'skipped';

/**
 * Read / skip the signed-in user's onboarding from any function (Checkout asks before sending
 * the customer to onboarding). Same rule as Account's ProfileRepository: only a pending
 * profile can be skipped.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingStatusService {
  private readonly auth = inject(SupabaseAuthService);
  private readonly injector = inject(Injector);
  private get db() {
    return this.injector.get(SUPABASE_CLIENT);
  }

  async current(): Promise<OnboardingStatus | null> {
    const id = this.auth.user()?.id;
    if (!id) return null;
    const { data } = await this.db.from('profiles').select('onboarding_status').eq('id', id).maybeSingle();
    const status = (data as { onboarding_status?: string } | null)?.onboarding_status;
    return status === 'pending' || status === 'completed' || status === 'skipped' ? status : null;
  }

  async skip(): Promise<boolean> {
    const id = this.auth.user()?.id;
    if (!id) return false;
    const { error } = await this.db.from('profiles').update({ onboarding_status: 'skipped' }).eq('id', id).eq('onboarding_status', 'pending');
    return !error;
  }
}
