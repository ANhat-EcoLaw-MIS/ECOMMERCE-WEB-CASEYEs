import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { STAFF_SUPABASE_CLIENT } from '../supabase/supabase.client';
import { StaffAuthService } from './staff-auth';

/** Back-office roles (BRD v8): each sees only its own actions. */
export type StaffRole = 'Operator' | 'CSKH' | 'Admin';

export const STAFF_ROLES: readonly { key: StaffRole; label: string; hint: string }[] = [
  { key: 'Operator', label: 'Operator', hint: 'Xưởng in: duyệt thiết kế, đưa vào sản xuất, đóng gói' },
  { key: 'CSKH', label: 'CSKH', hint: 'Yêu cầu hủy đơn, sự cố sau giao hàng' },
  { key: 'Admin', label: 'Admin', hint: 'Xác nhận hoàn tiền' },
];

const DB_ROLE: Record<string, StaffRole> = { operator: 'Operator', cskh: 'CSKH', admin: 'Admin' };
const VIEW_KEY = 'caseyes.staff.view.v1';

/**
 * Staff session = a real Supabase sign-in whose profiles.role is operator / cskh / admin.
 * It runs on its own client/session (StaffAuthService), never the customer's, so signing in to
 * /admin does not change who is signed in on the storefront.
 *
 * An admin can do everything (M8) and switches the admin screens between the three views;
 * operator and cskh see only their own view.
 */
@Injectable({ providedIn: 'root' })
export class StaffSession {
  private readonly injector = inject(Injector);
  /**
   * Staff auth and client are created on first use. Customer pages also hold a StaffSession
   * (order tracking reads the current role), and must never create or restore the staff session.
   */
  private get auth(): StaffAuthService {
    return this.injector.get(StaffAuthService);
  }
  private get db() {
    return this.injector.get(STAFF_SUPABASE_CLIENT);
  }

  /** Role stored in profiles.role for the signed-in user (null = customer or signed out). */
  private readonly _dbRole = signal<StaffRole | null>(null);
  private readonly _view = signal<StaffRole | null>(readView());
  private loadedFor: string | null = null;
  private pending: Promise<StaffRole | null> | null = null;

  readonly dbRole = this._dbRole.asReadonly();
  readonly signedIn = computed(() => this.auth.isAuthenticated() && this._dbRole() !== null);
  readonly canSwitchView = computed(() => this._dbRole() === 'Admin');
  /** Role whose screens and buttons are shown. */
  readonly role = computed<StaffRole | null>(() => {
    const db = this._dbRole();
    if (!db) return null;
    return db === 'Admin' ? (this._view() ?? 'Admin') : db;
  });
  readonly email = computed(() => this.auth.user()?.email ?? '');

  /**
   * Reads profiles.role of the signed-in staff user (cached per user). The staff user only changes
   * through signIn/signOut below (its session is not shared with the storefront), and the admin
   * guard calls this on every admin navigation.
   */
  async refresh(): Promise<StaffRole | null> {
    await this.auth.ready;
    return this.readRole();
  }

  private readRole(): Promise<StaffRole | null> {
    const id = this.auth.user()?.id ?? null;
    if (id === this.loadedFor && !this.pending) return Promise.resolve(this._dbRole());
    this.loadedFor = id;
    if (!id) {
      this._dbRole.set(null);
      return Promise.resolve(null);
    }
    this.pending = (async () => {
      const { data } = await this.db.from('profiles').select('role').eq('id', id).maybeSingle();
      const role = DB_ROLE[(data as { role?: string } | null)?.role ?? ''] ?? null;
      this._dbRole.set(role);
      this.pending = null;
      return role;
    })();
    return this.pending;
  }

  async signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
    const r = await this.auth.signIn({ email, password });
    if (r.error) return { ok: false, message: 'Email hoặc mật khẩu chưa đúng.' };
    this.loadedFor = null;
    const role = await this.refresh();
    if (!role) {
      await this.auth.signOut();
      return { ok: false, message: 'Tài khoản này không có quyền nhân viên.' };
    }
    return { ok: true };
  }

  /** Admin only: which back-office view to show. */
  setView(view: StaffRole): void {
    if (!this.canSwitchView()) return;
    this._view.set(view);
    localStorage.setItem(VIEW_KEY, view);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this._dbRole.set(null);
    this.loadedFor = null;
  }
}

function readView(): StaffRole | null {
  if (typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(VIEW_KEY);
  return v === 'Operator' || v === 'CSKH' || v === 'Admin' ? v : null;
}
