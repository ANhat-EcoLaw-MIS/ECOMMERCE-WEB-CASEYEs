import { Injectable, computed, inject, signal } from '@angular/core';
import type { AuthError, Session } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase.client';
import { Result, ok, fail } from './supabase.types';

/** Data type of a successful SDK response; `null` for responses without data (e.g. signOut). */
type DataOf<R> = R extends { data: infer D } ? NonNullable<D> : null;

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly db = inject(SUPABASE_CLIENT);

  private readonly _session = signal<Session | null>(null);
  readonly session = this._session.asReadonly();
  readonly user = computed(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly loading = signal(true);

  /** Called once at startup (provideAppInitializer) so guards see the restored session. */
  async init(): Promise<void> {
    const { data } = await this.db.auth.getSession();
    this._session.set(data.session);
    // Keep this callback synchronous: awaiting Supabase calls in here can deadlock the client.
    this.db.auth.onAuthStateChange((_event, session) => this._session.set(session));
    this.loading.set(false);
  }

  signUp(input: { email: string; password: string }) {
    return this.wrap(this.db.auth.signUp(input));
  }
  signIn(input: { email: string; password: string }) {
    return this.wrap(this.db.auth.signInWithPassword(input));
  }
  signInWithGoogle() {
    return this.wrap(this.db.auth.signInWithOAuth({ provider: 'google' }));
  }
  resetPassword(email: string) {
    return this.wrap(
      this.db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` }),
    );
  }
  updatePassword(password: string) {
    return this.wrap(this.db.auth.updateUser({ password }));
  }
  signOut() {
    return this.wrap(this.db.auth.signOut());
  }

  /** Converts any Supabase auth response into Result<T>; never throws. */
  private async wrap<R extends { error: AuthError | null }>(
    request: PromiseLike<R>,
  ): Promise<Result<DataOf<R>>> {
    try {
      const res = await request;
      if (res.error) return fail(res.error);
      return ok(('data' in res ? res.data : null) as DataOf<R>);
    } catch (e) {
      return fail({ message: e instanceof Error ? e.message : 'Unexpected error' });
    }
  }
}
