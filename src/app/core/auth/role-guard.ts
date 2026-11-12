import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StaffRole, StaffSession } from './staff-session';

/** Admin area: staff only (optionally limited to some roles). Customers are sent to the staff sign-in. */
export const roleGuard =
  (roles: readonly StaffRole[] = ['Operator', 'CSKH', 'Admin']): CanActivateFn =>
  (_route, state) => {
    const role = inject(StaffSession).role();
    if (role && roles.includes(role)) return true;
    return inject(Router).createUrlTree(['/admin/dang-nhap'], { queryParams: { returnUrl: state.url } });
  };
