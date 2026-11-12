import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AccountState } from '../../services/account-state';
import { AccountToast } from '../../services/account-toast';
import type { ProfileFormValue, ProfileSetupPreferences } from '../../models/account.model';
import { OnboardingModal } from '../onboarding-modal/onboarding-modal';
import { OtpModal } from '../otp-modal/otp-modal';

const vietnamesePhoneValidator = (value: string): boolean => /^0\d{9}$/.test(value.replace(/\s/g, ''));
const phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  vietnamesePhoneValidator(String(control.value)) ? null : { phone: true };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, OnboardingModal, OtpModal],
  selector: 'app-profile-tab',
  templateUrl: './profile-tab.html',
})
export class ProfileTab {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly accountState = inject(AccountState);
  private readonly toast = inject(AccountToast);
  protected readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.pattern(/^\S+(?:\s+\S+)+$/)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, phoneValidator]],
    dob: [''],
    gender: [''],
  });
  protected readonly submitted = signal(false);
  protected readonly avatarPreview = signal('https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg');
  protected readonly onboardingVisible = signal(false);
  protected readonly otpTarget = signal<'email' | 'phone'>('email');
  protected readonly otpVisible = signal(false);
  protected readonly deviceType = signal('');
  protected readonly stylePreferences = signal<string[]>([]);
  protected readonly caseMaterial = signal('Chống sốc viền nhôm Matt');
  protected readonly stylesLabel = computed(() => this.stylePreferences().join(', ') || 'Đa phong cách');
  private readonly profileLoaded = signal(false);

  private readonly profileEffect = effect(() => {
    const profile = this.accountState.profile();
    if (!profile || this.profileLoaded()) return;
    this.form.patchValue({
      fullName: profile.display_name ?? '',
      email: this.accountState.email(),
      phoneNumber: '',
      dob: '',
      gender: '',
    });
    this.deviceType.set(profile.device_type ?? '');
    this.stylePreferences.set(profile.preferences);
    this.profileLoaded.set(true);
  });

  protected get fullName() {
    return this.form.controls.fullName;
  }

  protected get email() {
    return this.form.controls.email;
  }

  protected get phoneNumber() {
    return this.form.controls.phoneNumber;
  }

  protected async saveProfile(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const saved = await this.accountState.save(this.currentProfileValues());
    this.toast.show(
      saved ? 'Thông tin hồ sơ đã được lưu thành công!' : this.accountState.error() ?? 'Không thể lưu hồ sơ tài khoản.',
      saved ? 'success' : 'info',
    );
  }

  protected resetForm(): void {
    const profile = this.accountState.profile();
    this.form.reset({
      fullName: profile?.display_name ?? '',
      email: this.accountState.email(),
      phoneNumber: '',
      dob: '',
      gender: '',
    });
    this.deviceType.set(profile?.device_type ?? '');
    this.stylePreferences.set(profile?.preferences ?? []);
    this.caseMaterial.set('Chống sốc viền nhôm Matt');
    this.submitted.set(false);
  }

  protected openOtp(target: 'email' | 'phone'): void {
    this.otpTarget.set(target);
    this.otpVisible.set(true);
  }

  protected onOtpConfirmed(): void {
    // TODO: no column yet: email and phone are not stored in profiles.
    this.toast.show('Xác thực bảo mật thành công!', 'success');
  }

  protected async savePreferences(preferences: ProfileSetupPreferences): Promise<void> {
    this.deviceType.set(preferences.deviceType);
    this.stylePreferences.set(preferences.stylePreferences);
    this.caseMaterial.set(preferences.caseMaterial);
    this.onboardingVisible.set(false);
    const saved = await this.accountState.save(this.currentProfileValues());
    this.toast.show(
      saved ? 'Hồ sơ sở thích đã được cá nhân hóa thành công!' : this.accountState.error() ?? 'Không thể lưu sở thích.',
      saved ? 'success' : 'info',
    );
  }

  protected handleAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.avatarPreview.set(reader.result);
        this.toast.show('Đã cập nhật ảnh đại diện mới!', 'success');
      }
    };
    reader.readAsDataURL(file);
    // TODO: upload avatar.
  }

  private currentProfileValues(): ProfileFormValue {
    // TODO: no column yet: email, phone number, date of birth, and gender.
    return {
      fullName: this.fullName.value,
      deviceType: this.deviceType(),
      stylePreferences: this.stylePreferences(),
    };
  }
}
