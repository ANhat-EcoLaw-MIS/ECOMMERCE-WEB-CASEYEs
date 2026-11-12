import { ChangeDetectionStrategy, Component, input, output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  selector: 'app-otp-modal',
  templateUrl: './otp-modal.html',
})
export class OtpModal {
  private readonly formBuilder = inject(FormBuilder);
  readonly target = input.required<'email' | 'phone'>();
  readonly closed = output<void>();
  readonly confirmed = output<void>();
  protected readonly submitted = signal(false);
  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  protected close(): void {
    this.closed.emit();
  }

  protected confirm(): void {
    this.submitted.set(true);
    if (this.form.invalid) return;
    // TODO: real OTP verification.
    this.confirmed.emit();
    this.closed.emit();
  }
}
