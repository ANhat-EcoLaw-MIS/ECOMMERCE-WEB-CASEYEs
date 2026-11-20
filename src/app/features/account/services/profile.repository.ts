import { inject, Injectable } from '@angular/core';
import type { Database } from '../../../core/supabase/database.types';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { SupabaseRepository } from '../../../core/supabase/supabase-repository';
import { fail, ok } from '../../../core/supabase/supabase.types';
import type { Result } from '../../../core/supabase/supabase.types';
import type { Address, OnboardingPreferences, OnboardingStatus, Profile } from '../models/account.model';

export type { Profile } from '../models/account.model';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type AddressInsert = Database['public']['Tables']['addresses']['Insert'];
type AddressUpdate = Database['public']['Tables']['addresses']['Update'];

const isOnboardingStatus = (status: string): status is OnboardingStatus =>
  status === 'pending' || status === 'completed' || status === 'skipped';

const toProfile = (row: ProfileRow & { addresses: Address[] }): Profile | null =>
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

    const { data: addresses, error } = await this.client
      .from('addresses')
      .select('*')
      .eq('user_id', id);
    if (error) return fail(error);

    const profile = toProfile({ ...result.data, addresses: addresses ?? [] });
    return profile ? ok(profile) : fail({ message: 'Hồ sơ có trạng thái thiết lập không hợp lệ.' });
  }

  override async update(
    id: string,
    values: Database['public']['Tables']['profiles']['Update'],
  ): Promise<Result<Profile>> {
    const result = await super.update(id, values);
    if (result.error) return result;
    const profile = await this.getById(id);
    if (profile.error) return profile;
    return profile.data
      ? ok(profile.data)
      : fail({ message: 'Không tìm thấy hồ sơ sau khi cập nhật.' });
  }

  async resetOnboardingData(userId: string): Promise<Result<Profile>> {
    // MOCK: Clear only the demo user's recorded onboarding fields; keep the profile and related data.
    const { error } = await this.client
      .from('profiles')
      .update({
        display_name: null,
        device_type: null,
        preferences: [],
        onboarding_status: 'skipped',
      })
      .eq('id', userId);

    if (error) return fail(error);
    const profile = await this.getById(userId);
    if (profile.error) return profile;
    return profile.data ? ok(profile.data) : fail({ message: 'Không tìm thấy hồ sơ cần đặt lại.' });
  }

  async completeOnboarding(
    userId: string,
    preferences: OnboardingPreferences,
  ): Promise<Result<Profile>> {
    const updates: Database['public']['Tables']['profiles']['Update'] = {
      display_name: preferences.displayName.trim(),
      device_type: preferences.deviceName,
      preferences: preferences.stylePreferences,
      onboarding_status: 'completed',
    };
    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .maybeSingle();

    if (error) return fail(error);
    if (!data) return fail({ message: 'not-pending', code: 'not-pending' });
    const profile = await this.getById(userId);
    if (profile.error) return profile;
    return profile.data
      ? ok(profile.data)
      : fail({ message: 'Không tìm thấy hồ sơ sau khi hoàn tất thiết lập.' });
  }

  async skipOnboarding(userId: string): Promise<Result<Profile>> {
    const { error } = await this.client
      .from('profiles')
      .update({ onboarding_status: 'skipped' })
      .eq('id', userId)

    if (error) return fail(error);
    const profile = await this.getById(userId);
    if (profile.error) return profile;
    return profile.data ? ok(profile.data) : fail({ message: 'Không tìm thấy hồ sơ sau khi bỏ qua.' });
  }

  async saveAddress(
    userId: string,
    addressId: string | null,
    values: Omit<AddressInsert, 'user_id'>,
  ): Promise<Result<Address>> {
    if (values.is_default) {
      const { error } = await this.client
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
      if (error) return fail(error);
    }

    if (addressId) {
      const updates: AddressUpdate = values;
      const { data, error } = await this.client
        .from('addresses')
        .update(updates)
        .eq('id', addressId)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle();
      if (error) return fail(error);
      return data ? ok(data) : fail({ message: 'Không tìm thấy địa chỉ cần cập nhật.' });
    }

    const insert: AddressInsert = { ...values, user_id: userId };
    const { data, error } = await this.client
      .from('addresses')
      .insert(insert)
      .select('*')
      .single();
    return error ? fail(error) : ok(data);
  }

  async removeAddress(userId: string, addressId: string): Promise<Result<true>> {
    const { error } = await this.client
      .from('addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);
    return error ? fail(error) : ok(true);
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<Result<Address>> {
    const { error: clearError } = await this.client
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId);
    if (clearError) return fail(clearError);

    const { data, error } = await this.client
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) return fail(error);
    return data ? ok(data) : fail({ message: 'Không tìm thấy địa chỉ cần đặt mặc định.' });
  }
}
