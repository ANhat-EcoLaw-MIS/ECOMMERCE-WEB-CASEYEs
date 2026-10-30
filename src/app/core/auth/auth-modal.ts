import { Injectable, signal } from '@angular/core';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

@Injectable({ providedIn: 'root' })
export class AuthModal {
  /** null = closed */
  readonly mode = signal<AuthMode | null>(null);

  open(mode: AuthMode = 'login'): void {
    this.mode.set(mode);
  }
  close(): void {
    this.mode.set(null);
  }
}
