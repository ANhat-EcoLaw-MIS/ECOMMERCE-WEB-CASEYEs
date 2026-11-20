import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountState } from '../../services/account-state';
import { AccountToast } from '../../services/account-toast';
import { ProfileRepository } from '../../services/profile.repository';
import { SupabaseAuthService } from '../../../../core/supabase/supabase-auth.service';
import { fail } from '../../../../core/supabase/supabase.types';
import type { Result } from '../../../../core/supabase/supabase.types';
import { sanitizeReturnUrl } from '../../../../shared/utils/safe-return-url';
import type { Profile } from '../../services/profile.repository';
import { OnboardingState } from './onboarding-state';
import type { OnboardingPreferences } from '../models/onboarding.model';

@Injectable()
export class OnboardingFlow {
  private readonly profileRepository = inject(ProfileRepository);
  private readonly auth = inject(SupabaseAuthService);
  private readonly accountState = inject(AccountState);
  private readonly router = inject(Router);
  private readonly toast = inject(AccountToast);
  private readonly onboardingState = inject(OnboardingState);
  private profile: Profile | null = null;
  private pendingWrite: Promise<void> = Promise.resolve();

  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);

  start(): void {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.errorMessage.set(null);
    this.pendingWrite = this.initialize(userId);
  }

  async complete(returnUrl: string | null | undefined): Promise<void> {
    if (this.busy()) return;

    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await this.pendingWrite;
      const userId = this.auth.user()?.id;
      if (!userId) {
        this.reportError('Không tìm thấy phiên đăng nhập. Đang quay lại trang trước.');
        return;
      }

      const currentProfile = this.profile ?? this.accountState.profile();
      if (!currentProfile) {
        const skipResult = await this.skipOnce(userId);
        this.reportError(
          skipResult.error
            ? 'Không thể tải hồ sơ hoặc cập nhật trạng thái thiết lập. Đang quay lại trang trước.'
            : 'Không thể tải hồ sơ; tài khoản đã được đánh dấu bỏ qua.',
        );
        if (!skipResult.error) await this.accountState.load();
        return;
      }

      let result = await this.completeOnce(userId);
      if (result.error) result = await this.completeOnce(userId);

      if (result.error) {
        const skipResult = await this.skipOnce(userId);
        const fallbackNotice = skipResult.error
          ? 'Không thể lưu hoặc cập nhật trạng thái thiết lập. Đang quay lại trang trước.'
          : 'Không thể lưu thiết lập; tài khoản đã được đánh dấu bỏ qua.';
        this.reportError(fallbackNotice);
        if (!skipResult.error) await this.accountState.load();
        return;
      }

      await this.accountState.load();
    } catch (error) {
      const completionError = this.errorText(error);
      const userId = this.auth.user()?.id;
      if (userId) {
        const skipResult = await this.skipOnce(userId);
        if (skipResult.error) {
          this.reportError(`${completionError} Không thể cập nhật trạng thái bỏ qua.`);
        } else {
          this.reportError(`${completionError} Thiết lập đã được đánh dấu bỏ qua.`);
          await this.accountState.load();
        }
      } else {
        this.reportError(completionError);
      }
    } finally {
      this.busy.set(false);
      await this.navigateBack(returnUrl);
    }
  }

  async skip(returnUrl: string | null | undefined): Promise<void> {
    if (this.busy()) return;

    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await this.pendingWrite;
      const userId = this.auth.user()?.id;
      if (!userId) {
        this.reportError('Không tìm thấy phiên đăng nhập. Đang quay lại trang trước.');
        return;
      }

      const result = await this.skipOnce(userId);
      if (result.error) {
        this.reportError('Không thể lưu trạng thái bỏ qua. Đang quay lại trang trước.');
      } else {
        await this.accountState.load();
      }
    } catch (error) {
      this.reportError(this.errorText(error));
    } finally {
      this.busy.set(false);
      await this.navigateBack(returnUrl);
    }
  }

  private async initialize(userId: string): Promise<void> {
    try {
      const profileResult = await this.profileRepository.getById(userId);
      if (profileResult.error) {
        this.errorMessage.set(profileResult.error.message);
        return;
      }
      if (!profileResult.data) {
        this.errorMessage.set('Không tìm thấy hồ sơ tài khoản.');
        return;
      }

      this.profile = profileResult.data;
      this.onboardingState.prefillName(this.profile.display_name ?? '');
    } catch (error) {
      this.errorMessage.set(this.errorText(error));
    }
  }

  private async completeOnce(userId: string): Promise<Result<Profile>> {
    try {
      const preferences: OnboardingPreferences = this.onboardingState.draft();
      return await this.profileRepository.completeOnboarding(userId, preferences);
    } catch (error) {
      return fail({ message: this.errorText(error) });
    }
  }

  private async skipOnce(userId: string): Promise<Result<Profile>> {
    try {
      return await this.profileRepository.skipOnboarding(userId);
    } catch (error) {
      return fail({ message: this.errorText(error) });
    }
  }

  private reportError(message: string): void {
    this.errorMessage.set(message);
    this.toast.show(message, 'info');
  }

  private errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Không thể lưu thiết lập tài khoản.';
  }

  private async navigateBack(returnUrl: string | null | undefined): Promise<void> {
    try {
      await this.router.navigateByUrl(sanitizeReturnUrl(returnUrl), { replaceUrl: true });
    } catch (error) {
      this.errorMessage.set(this.errorText(error));
    }
  }
}
