import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthModal } from '../auth/auth-modal';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';

/**
 * Integration: Shop's auth facade now reads the real Supabase session (it was a sessionStorage
 * demo). Kept so Shop / Support Chat code keeps compiling; new code should use SupabaseAuthService.
 */
@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly supabase = inject(SupabaseAuthService);
  private readonly router = inject(Router);
  private readonly authModal = inject(AuthModal);

  readonly loggedIn = computed(() => this.supabase.isAuthenticated());

  requireLogin(returnUrl = '/shop'): boolean {
    if (this.loggedIn()) return true;
    void this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
    return false;
  }

  /** Opens the real sign-in dialog (the demo login is gone). */
  demoLogin(): void {
    this.authModal.open('login');
  }

  logout(): void {
    void this.supabase.signOut();
  }
}
