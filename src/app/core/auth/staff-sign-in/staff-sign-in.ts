import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { sanitizeReturnUrl } from '../../../shared/utils/safe-return-url';
import { STAFF_ROLES, StaffRole, StaffSession } from '../staff-session';

/** Demo staff sign-in: pick a role (no real staff accounts yet, MIS-10). */
@Component({
  selector: 'app-staff-sign-in',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-sign-in.html',
})
export class StaffSignIn {
  readonly returnUrl = input<string>();
  protected readonly roles = STAFF_ROLES;
  private readonly session = inject(StaffSession);
  private readonly router = inject(Router);

  protected signIn(role: StaffRole): void {
    this.session.signIn(role);
    const target = sanitizeReturnUrl(this.returnUrl(), '/admin/order-tracking');
    void this.router.navigateByUrl(target.startsWith('/admin') ? target : '/admin/order-tracking');
  }
}
