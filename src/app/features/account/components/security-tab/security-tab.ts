import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountState } from '../../services/account-state';
import { AccountToast } from '../../services/account-toast';
import { isDemoGoogleUser } from '../../../../shared/utils/demo-user';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  selector: 'app-security-tab',
  templateUrl: './security-tab.html',
})
export class SecurityTab {
  private readonly formBuilder = inject(FormBuilder);
  private readonly accountState = inject(AccountState);
  private readonly toast = inject(AccountToast);
  protected readonly demoGoogleUser = computed(() => isDemoGoogleUser(this.accountState.email()));
  readonly deletionRequested = output<void>();
  protected readonly passwordForm = this.formBuilder.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });
  protected readonly deletionForm = this.formBuilder.nonNullable.group({
    reason: ['rarely_used', Validators.required],
    otp: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
  });
  protected readonly passwordSubmitted = signal(false);
  protected readonly deletionSubmitted = signal(false);
  protected readonly passwordSaving = signal(false);
  protected readonly twoFactorEnabled = signal(true);
  protected readonly deletionStep = signal<'idle' | 'confirm'>('idle');

  protected passwordMismatch(): boolean {
    return this.passwordForm.controls.confirmPassword.value !== this.passwordForm.controls.newPassword.value;
  }

  protected async updatePassword(): Promise<void> {
    // MOCK: Prevent password changes even if the disabled form handler is invoked directly.
    if (this.demoGoogleUser()) return;

    this.passwordSubmitted.set(true);
    if (this.passwordForm.invalid || this.passwordMismatch()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordSaving.set(true);
    const updated = await this.accountState.updatePassword(this.passwordForm.controls.newPassword.value);
    this.passwordSaving.set(false);
    if (updated) {
      this.passwordForm.reset();
      this.passwordSubmitted.set(false);
      this.toast.show('Mật khẩu của bạn đã được thay đổi an toàn!', 'success');
    } else {
      this.toast.show(this.accountState.error() ?? 'Không thể cập nhật mật khẩu.', 'info');
    }
  }

  protected toggleTwoFactor(enabled: boolean): void {
    this.twoFactorEnabled.set(enabled);
    this.toast.show(enabled ? 'Đã bật xác thực 2FA SMS.' : 'Đã tắt xác thực 2FA.', 'info');
  }

  protected startDeletion(): void {
    this.deletionStep.set('confirm');
  }

  protected cancelDeletion(): void {
    this.deletionStep.set('idle');
    this.deletionForm.reset({ reason: 'rarely_used', otp: '' });
    this.deletionSubmitted.set(false);
  }

  protected confirmDeletion(): void {
    this.deletionSubmitted.set(true);
    if (this.deletionForm.invalid) {
      this.deletionForm.controls.otp.markAsTouched();
      return;
    }
    // TODO: no column yet: account deletion state is kept in memory only.
    // TODO: real OTP verification.
    this.deletionRequested.emit();
    this.cancelDeletion();
    this.toast.show('Yêu cầu xóa tài khoản đã gửi. Bạn có 30 ngày để hủy bỏ.', 'info');
  }

  protected resendDeletionOtp(): void {
    this.toast.show('Mã OTP xác thực xóa tài khoản đã được gửi lại vào điện thoại.', 'info');
  }
}
