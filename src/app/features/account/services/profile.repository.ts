import { inject, Injectable } from '@angular/core';
import type { Database } from '../../../core/supabase/database.types';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { SupabaseRepository } from '../../../core/supabase/supabase-repository';
import { fail, ok } from '../../../core/supabase/supabase.types';
import type { Result } from '../../../core/supabase/supabase.types';
import type { OnboardingPreferences, OnboardingStatus, Profile } from '../models/account.model';

export type { Profile } from '../models/account.model';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const isOnboardingStatus = (status: string): status is OnboardingStatus =>
  status === 'pending' || status === 'completed' || status === 'skipped';

const toProfile = (row: ProfileRow): Profile | null =>
  isOnboardingStatus(row.onboarding_status)
    ? { ...row, onboarding_status: row.onboarding_status }
    : null;

@Injectable({ providedIn: 'root' })
export class ProfileRepository extends SupabaseRepository<'profiles'> {
  protected override readonly table = 'profiles';
  private readonly client = inject(SUPABASE_CLIENT);

  override async getById(id: string): Promise<Result<Profile | null>> {
    const result = await super.getById(id);
    if (result.error) return result;
    if (!result.data) return ok(null);

    const profile = toProfile(result.data);
    return profile ? ok(profile) : fail({ message: 'Hồ sơ có trạng thái thiết lập không hợp lệ.' });
  }

  override async update(
    id: string,
    values: Database['public']['Tables']['profiles']['Update'],
  ): Promise<Result<Profile>> {
    const result = await super.update(id, values);
    if (result.error) return result;

    const profile = toProfile(result.data);
    return profile ? ok(profile) : fail({ message: 'Hồ sơ có trạng thái thiết lập không hợp lệ.' });
  }

  async markOnboardingPending(userId: string): Promise<Result<Profile>> {
    const { data, error } = await this.client
      .from('profiles')
      .update({ onboarding_status: 'pending' })
      .eq('id', userId)
      .eq('onboarding_status', 'pending')
      .select('*')
      .maybeSingle();

    if (error) return fail(error);
    if (!data) return fail({ message: 'not-pending', code: 'not-pending' });
    const profile = toProfile(data);
    return profile ? ok(profile) : fail({ message: 'Hồ sơ có trạng thái thiết lập không hợp lệ.' });
  }

  async completeOnboarding(
    userId: string,
    preferences: OnboardingPreferences,
    currentPreferences: readonly string[],
  ): Promise<Result<Profile>> {
    const mergedPreferences = new Set(currentPreferences);
    if (preferences.deviceBrand) {
      mergedPreferences.add(`device-brand:${preferences.deviceBrand}`);
    }
    if (preferences.styleKey) mergedPreferences.add(`style:${preferences.styleKey}`);

    const updates: Database['public']['Tables']['profiles']['Update'] = {
      display_name: preferences.displayName.trim(),
      device_type: preferences.deviceModel,
      preferences: [...mergedPreferences],
      onboarding_status: 'completed',
    };
    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .eq('onboarding_status', 'pending')
      .select('*')
      .maybeSingle();

    if (error) return fail(error);
    if (!data) return fail({ message: 'not-pending', code: 'not-pending' });
    const profile = toProfile(data);
    return profile ? ok(profile) : fail({ message: 'Hồ sơ có trạng thái thiết lập không hợp lệ.' });
  }

  async skipOnboarding(userId: string): Promise<Result<Profile>> {
    const { data, error } = await this.client
      .from('profiles')
      .update({ onboarding_status: 'skipped' })
      .eq('id', userId)
      .eq('onboarding_status', 'pending')
      .select('*')
      .maybeSingle();

    if (error) return fail(error);
    if (!data) return fail({ message: 'not-pending', code: 'not-pending' });
    const profile = toProfile(data);
    return profile ? ok(profile) : fail({ message: 'Hồ sơ có trạng thái thiết lập không hợp lệ.' });
  }
}
