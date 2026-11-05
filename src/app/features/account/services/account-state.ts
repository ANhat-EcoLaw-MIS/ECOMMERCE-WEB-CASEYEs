import { computed, inject, Injectable, signal } from '@angular/core';
import type { Database } from '../../../core/supabase/database.types';
import type { Profile } from './profile.repository';
import { ProfileRepository } from './profile.repository';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import type { ProfileFormValue } from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class AccountState {
  private readonly profileRepository = inject(ProfileRepository);
  private readonly auth = inject(SupabaseAuthService);
  private readonly _profile = signal<Profile | null>(null);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly email = computed(() => this.auth.user()?.email ?? '');

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    const userId = this.auth.user()?.id;
    if (!userId) {
      this._profile.set(null);
      this._error.set('Không thể xác định tài khoản hiện tại. Vui lòng đăng nhập lại.');
      this._loading.set(false);
      return;
    }

    try {
      const result = await this.profileRepository.getById(userId);
      if (result.error) {
        this._profile.set(null);
        this._error.set(result.error.message);
      } else if (!result.data) {
        this._profile.set(null);
        this._error.set('Không tìm thấy hồ sơ tài khoản.');
      } else {
        this._profile.set(result.data);
      }
    } catch (error) {
      this._profile.set(null);
      this._error.set(error instanceof Error ? error.message : 'Không thể tải hồ sơ tài khoản.');
    } finally {
      this._loading.set(false);
    }
  }

  async save(values: ProfileFormValue): Promise<boolean> {
    const currentProfile = this._profile();
    if (!currentProfile) {
      this._error.set('Không tìm thấy hồ sơ để cập nhật.');
      return false;
    }

    this._saving.set(true);
    this._error.set(null);
    try {
      const updates: Database['public']['Tables']['profiles']['Update'] = {
        device_type: values.deviceType || null,
        preferences: values.stylePreferences,
      };
      if (values.fullName.trim()) {
        updates.display_name = values.fullName.trim();
      }
      const result = await this.profileRepository.update(currentProfile.id, updates);
      if (result.error) {
        this._error.set(result.error.message);
        return false;
      }
      this._profile.set(result.data);
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Không thể lưu hồ sơ tài khoản.');
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  async updatePassword(password: string): Promise<boolean> {
    this._error.set(null);
    const result = await this.auth.updatePassword(password);
    if (result.error) {
      this._error.set(result.error.message);
      return false;
    }
    return true;
  }
}
