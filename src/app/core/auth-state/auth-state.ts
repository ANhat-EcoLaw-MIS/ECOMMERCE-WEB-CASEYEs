import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

/** UI preview only. Replace with your team's server-validated auth/session API before production. */
@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly key = 'caseye_demo_authenticated';
  readonly loggedIn = signal(typeof sessionStorage !== 'undefined' && sessionStorage.getItem(this.key) === 'yes');
  constructor(private readonly router: Router) {}
  requireLogin(returnUrl = '/shop'): boolean {
    if (this.loggedIn()) return true;
    void this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
    return false;
  }
  demoLogin(): void {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(this.key, 'yes');
    this.loggedIn.set(true);
  }
  logout(): void {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(this.key);
    this.loggedIn.set(false);
  }
}
