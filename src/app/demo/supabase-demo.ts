import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { SupabaseAuthService } from '../core/supabase/supabase-auth.service';
import { SupabaseRepository } from '../core/supabase/supabase-repository';
import { Result, Row, fail } from '../core/supabase/supabase.types';

/** A repository is just "a table name". Everything else is inherited. */
@Injectable({ providedIn: 'root' })
class ProfilesRepository extends SupabaseRepository<'profiles'> {
  protected readonly table = 'profiles';
}

interface LogEntry { id: number; time: string; label: string; ok: boolean; detail: string; }

@Component({
  selector: 'app-supabase-demo',
  imports: [JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Supabase demo</h2>

    <section>
      <h3>1. Connection</h3>
      <button (click)="checkConnection()">Test connection</button>
      @if (connected() === null) { <span>not tested yet</span> }
      @else if (connected()) { <span class="good">● connected</span> }
      @else { <span class="bad">● failed (see log)</span> }
    </section>

    <section>
      <h3>2. Authentication</h3>
      <input #email type="email" placeholder="email" />
      <input #pw type="password" placeholder="password (min 6 chars)" />
      <button (click)="signUp(email.value, pw.value)">Sign up</button>
      <button (click)="signIn(email.value, pw.value)">Sign in</button>
      <button (click)="signOut()">Sign out</button>
      @if (auth.isAuthenticated()) {
        <p>Signed in as <b>{{ auth.user()?.email }}</b></p>
      } @else {
        <p>Not signed in</p>
      }
    </section>

    <section>
      <h3>3. Database operations (table: profiles)</h3>
      <p>
        <button (click)="readMyProfile()">Read my profile</button>
        <button (click)="listProfiles()">List all profiles</button>
      </p>
      <p>
        <input #name placeholder="display name" />
        <input #device placeholder="device, e.g. iPhone 15" />
        <button (click)="updateProfile(name.value, device.value)">Update my profile</button>
      </p>
      <p>
        <button (click)="tryChangeStatus()">Try to change my own status</button>
        <small>(should be BLOCKED by the database)</small>
      </p>
      <pre>{{ profile() | json }}</pre>
    </section>

    <section>
      <h3>Log (newest first)</h3>
      @for (entry of logs(); track entry.id) {
        <div [class.good]="entry.ok" [class.bad]="!entry.ok">
          {{ entry.time }} · <b>{{ entry.label }}</b> · {{ entry.detail }}
        </div>
      }
    </section>
  `,
  styles: `
    section { margin: 0 0 1.5rem; }
    input { margin-right: .4rem; padding: .3rem; }
    button { margin-right: .4rem; }
    pre { background: #f4f4f4; padding: .6rem; min-height: 3rem; }
    .good { color: #1a7f37; }
    .bad { color: #cf222e; }
  `,
})
export class SupabaseDemo {
  protected readonly auth = inject(SupabaseAuthService);
  private readonly profiles = inject(ProfilesRepository);

  protected readonly connected = signal<boolean | null>(null);
  protected readonly profile = signal<Row<'profiles'> | null>(null);
  protected readonly logs = signal<LogEntry[]>([]);
  private counter = 0;

  constructor() {
    void this.checkConnection(); // test the connection as soon as the page opens
  }

  // ---------- 1. connection ----------
  async checkConnection() {
    // No special health service needed: if a normal query succeeds, the connection works.
    const r = await this.profiles.list();
    this.connected.set(r.error === null);
    this.log('Connection', r, 'Supabase answered');
  }

  // ---------- 2. authentication ----------
  async signUp(email: string, password: string) {
    const r = await this.auth.signUp({ email, password });
    this.log('Sign up', r, 'Account created (if "Confirm email" is ON, check your inbox first)');
  }

  async signIn(email: string, password: string) {
    const r = await this.auth.signIn({ email, password });
    this.log('Sign in', r, 'Signed in');
    const userId = r.data?.user?.id;
    if (userId) await this.loadProfile(userId);
  }

  async signOut() {
    const r = await this.auth.signOut();
    this.profile.set(null);
    this.log('Sign out', r, 'Signed out');
  }

  // ---------- 3. database ----------
  async readMyProfile() {
    const id = this.auth.user()?.id;
    if (!id) return this.log('Read my profile', fail({ message: 'Sign in first' }));
    await this.loadProfile(id);
  }

  async listProfiles() {
    const r = await this.profiles.list();
    // Row Level Security: you should only ever see YOUR row (or 0 rows when signed out)
    this.log('List all profiles', r, `${r.data?.length ?? 0} row(s) visible to you`);
  }

  async updateProfile(displayName: string, deviceType: string) {
    const id = this.auth.user()?.id;
    if (!id) return this.log('Update profile', fail({ message: 'Sign in first' }));
    const r = await this.profiles.update(id, { display_name: displayName, device_type: deviceType });
    if (r.error === null) this.profile.set(r.data);
    this.log('Update profile', r, 'Saved');
  }

  async tryChangeStatus() {
    const id = this.auth.user()?.id;
    if (!id) return this.log('Change status', fail({ message: 'Sign in first' }));
    // Same value as today (ACTIVE) so nothing breaks even if the protection were missing.
    const r = await this.profiles.update(id, { status: 'ACTIVE' });
    this.log('Change status', r, '', true);
  }

  // ---------- helpers ----------
  private async loadProfile(userId: string) {
    const r = await this.profiles.getById(userId);
    this.profile.set(r.data);
    this.log('Read my profile', r, r.data ? 'Profile loaded' : 'No profile row found for this user');
  }

  /** expectError = true flips the colours: a failure is the GOOD outcome (protection works). */
  private log(label: string, r: Result<unknown>, okDetail = 'OK', expectError = false) {
    const failed = r.error !== null;
    const entry: LogEntry = {
      id: ++this.counter,
      time: new Date().toLocaleTimeString(),
      label,
      ok: expectError ? failed : !failed,
      detail: expectError
        ? failed ? `Blocked as expected: ${r.error!.message}` : 'WARNING: change was ALLOWED, check your column grants'
        : failed ? r.error!.message : okDetail,
    };
    this.logs.update((list) => [entry, ...list]);
  }
}
