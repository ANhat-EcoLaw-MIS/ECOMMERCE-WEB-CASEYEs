import { Injectable, computed, inject, signal } from '@angular/core';
import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase.client';
import { Result, ok, fail } from './supabase.types';
import type { Database } from './database.types';

/** Data type of a successful SDK response; `null` for responses without data (e.g. signOut). */
type DataOf<R> = R extends { data: infer D } ? NonNullable<D> : null;

/**
 * One auth session on one Supabase client. Each user role gets its own subclass bound to its own
 * client (see STAFF_SUPABASE_CLIENT), so their sessions stay independent.
 */
export abstract class AuthSession {
  protected constructor(protected readonly db: SupabaseClient<Database>) {}

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
      this.db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/reset-password` }),
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

/** Customer session (storefront, account, studio, customer order pages). Restored at startup. */
@Injectable({ providedIn: 'root' })
export class SupabaseAuthService extends AuthSession {
  constructor() {
    super(inject(SUPABASE_CLIENT));
  }
}
