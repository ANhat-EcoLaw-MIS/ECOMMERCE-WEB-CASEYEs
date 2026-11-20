import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StaffSession } from '../../auth/staff-session';
import { ADMIN_NAV } from './admin-nav';

/** Shared admin shell (sidebar + top bar), separate from the customer ShellLayout. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  protected readonly session = inject(StaffSession);
  private readonly router = inject(Router);
  protected readonly nav = ADMIN_NAV;
  protected signOut(): void {
    void this.session.signOut().then(() => this.router.navigateByUrl('/admin/dang-nhap'));
  }
}
