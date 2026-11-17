import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AccountState } from '../../services/account-state';
import { AccountToast } from '../../services/account-toast';
import type { Address, ProfileFormValue, ProfileSetupPreferences } from '../../models/account.model';
import { ProfileRepository } from '../../services/profile.repository';
import { OnboardingModal } from '../onboarding-modal/onboarding-modal';
import { OtpModal } from '../otp-modal/otp-modal';
import { DEVICE_CATALOG, STYLE_PRESETS } from '../../onboarding/onboarding-presets';

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
  private readonly profileRepository = inject(ProfileRepository);
  protected readonly addressForm = this.formBuilder.nonNullable.group({
    recipient: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, phoneValidator]],
    line: ['', Validators.required],
    ward: ['', Validators.required],
    district: [''],
    city: ['', Validators.required],
    is_default: [false],
  });
  protected readonly addressFormVisible = signal(false);
  protected readonly editingAddressId = signal<string | null>(null);
  protected readonly addressSaving = signal(false);
  protected readonly addressError = signal<string | null>(null);
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
  protected readonly deviceLabel = computed(() => {
    const device = Object.values(DEVICE_CATALOG)
      .flat()
      .find((option) => option.id === this.deviceType());
    return device?.name ?? (this.deviceType() || 'Chưa thiết lập thiết bị');
  });
  protected readonly stylesLabel = computed(() => {
    const labels = this.stylePreferences()
      .map((preference) => {
        const key = preference.startsWith('style:') ? preference.slice('style:'.length) : null;
        if (preference.startsWith('device-brand:')) return null;
        return key
          ? STYLE_PRESETS.find((preset) => preset.key === key)?.label ?? null
          : preference;
      })
      .filter((label): label is string => Boolean(label));
    return labels.join(', ') || 'Đa phong cách';
  });
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
    this.onboardingVisible.set(false);
    const saved = await this.accountState.save(this.currentProfileValues());
    this.toast.show(
      saved ? 'Hồ sơ sở thích đã được cá nhân hóa thành công!' : this.accountState.error() ?? 'Không thể lưu sở thích.',
      saved ? 'success' : 'info',
    );
  }

  protected addAddress(): void {
    this.editingAddressId.set(null);
    this.addressError.set(null);
    this.addressForm.reset({
      recipient: '',
      phone: '',
      line: '',
      ward: '',
      district: '',
      city: '',
      is_default: !this.accountState.profile()?.addresses.length,
    });
    this.addressFormVisible.set(true);
  }

  protected editAddress(address: Address): void {
    this.editingAddressId.set(address.id);
    this.addressError.set(null);
    this.addressForm.patchValue({
      recipient: address.recipient,
      phone: address.phone,
      line: address.line,
      ward: address.ward,
      district: address.district ?? '',
      city: address.city,
      is_default: address.is_default,
    });
    this.addressFormVisible.set(true);
  }

  protected cancelAddressEdit(): void {
    this.addressFormVisible.set(false);
    this.editingAddressId.set(null);
    this.addressError.set(null);
  }

  protected async saveAddress(): Promise<void> {
    if (this.addressForm.invalid || this.addressSaving()) {
      this.addressForm.markAllAsTouched();
      return;
    }
    const userId = this.accountState.profile()?.id;
    if (!userId) {
      this.addressError.set('Không thể xác định hồ sơ tài khoản.');
      return;
    }

    this.addressSaving.set(true);
    this.addressError.set(null);
    const result = await this.profileRepository.saveAddress(
      userId,
      this.editingAddressId(),
      this.addressForm.getRawValue(),
    );
    if (result.error) {
      this.addressError.set(result.error.message);
    } else {
      await this.accountState.load();
      this.cancelAddressEdit();
    }
    this.addressSaving.set(false);
  }

  protected async deleteAddress(address: Address): Promise<void> {
    const userId = this.accountState.profile()?.id;
    if (!userId || this.addressSaving()) return;
    if (!window.confirm(`Xóa địa chỉ của ${address.recipient}?`)) return;
    this.addressSaving.set(true);
    this.addressError.set(null);
    const result = await this.profileRepository.removeAddress(userId, address.id);
    if (result.error) {
      this.addressError.set(result.error.message);
    } else {
      await this.accountState.load();
      if (address.is_default) {
        const nextAddress = this.accountState.profile()?.addresses[0];
        if (nextAddress) {
          const defaultResult = await this.profileRepository.setDefaultAddress(userId, nextAddress.id);
          if (defaultResult.error) this.addressError.set(defaultResult.error.message);
          await this.accountState.load();
        }
      }
    }
    this.addressSaving.set(false);
  }

  protected async setDefaultAddress(address: Address): Promise<void> {
    const userId = this.accountState.profile()?.id;
    if (!userId || address.is_default || this.addressSaving()) return;
    this.addressSaving.set(true);
    this.addressError.set(null);
    const result = await this.profileRepository.setDefaultAddress(userId, address.id);
    if (result.error) {
      this.addressError.set(result.error.message);
    } else {
      await this.accountState.load();
    }
    this.addressSaving.set(false);
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
