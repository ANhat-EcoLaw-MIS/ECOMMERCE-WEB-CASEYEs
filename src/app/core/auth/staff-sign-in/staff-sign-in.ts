import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { sanitizeReturnUrl } from '../../../shared/utils/safe-return-url';
import { StaffSession } from '../staff-session';

/** Staff sign-in: a real Supabase account whose profiles.role is operator / cskh / admin. */
@Component({
  selector: 'app-staff-sign-in',
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-sign-in.html',
})
export class StaffSignIn {
  readonly returnUrl = input<string>();
  private readonly session = inject(StaffSession);
  private readonly router = inject(Router);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    const r = await this.session.signIn(email.trim(), password);
    this.busy.set(false);
    if (!r.ok) {
      this.error.set(r.message);
      return;
    }
    const target = sanitizeReturnUrl(this.returnUrl(), '/admin/order-tracking');
    void this.router.navigateByUrl(target.startsWith('/admin') ? target : '/admin/order-tracking');
  }
}
