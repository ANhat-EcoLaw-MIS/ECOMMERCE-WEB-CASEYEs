import {inject, Injectable, signal} from '@angular/core';
import {Router} from '@angular/router';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

@Injectable({ providedIn: 'root' })
export class AuthModal {
  /** null = closed */
  readonly mode = signal<AuthMode | null>(null);
  private readonly router=inject(Router)
  open(mode: AuthMode = 'login'): void {
    if (this.router.url.startsWith('/auth')) return;
    this.mode.set(mode);
  }
  close(): void {
    this.mode.set(null);
  }
}
