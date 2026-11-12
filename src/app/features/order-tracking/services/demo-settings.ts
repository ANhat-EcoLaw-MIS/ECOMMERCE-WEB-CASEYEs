import { Injectable, computed, inject, signal } from '@angular/core';
import { TargetService } from '../models/order-tracking.model';
import { StaffSession } from '../../../core/auth/staff-session';
import { SyncChannel } from './sync-channel';

/** Back-office roles (v8), now owned by the admin area's StaffSession. */
export type { StaffRole as DemoRole } from '../../../core/auth/staff-session';
import type { StaffRole as DemoRole } from '../../../core/auth/staff-session';

export interface DemoState {
  readonly enabled: boolean;
  readonly role: DemoRole;
  /** Simulated outage per external module (FR-OT-EX-12). */
  readonly down: Readonly<Record<TargetService, boolean>>;
  /** Simulated network loss while sending a complaint (FR-OT-EX-07). */
  readonly networkDown: boolean;
  /** Simulated failure when loading the order list (UC-OT-01 exception 2.2). */
  readonly loadError: boolean;
}

const STORAGE_KEY = 'casecraft.ot.demo.v1';

const DEFAULT_STATE: DemoState = {
  enabled: false,
  role: 'Operator',
  down: { Shopping: false, Loyalty: false, Notification: false, CustomerService: false, Payment: false },
  networkDown: false,
  loadError: false,
};

/**
 * Simulator settings (admin area only). `enabled` lets the customer pages run with the demo
 * customer when nobody is signed in; it is switched on from /admin/order-tracking/simulator.
 */
@Injectable({ providedIn: 'root' })
export class DemoSettings {
  private readonly sync = inject(SyncChannel);
  private readonly staff = inject(StaffSession);
  private readonly _state = signal<DemoState>(this.read());

  readonly state = this._state.asReadonly();
  readonly enabled = computed(() => this._state().enabled);
  /** Role of the signed-in staff member (admin area). */
  readonly role = computed<DemoRole>(() => this.staff.role() ?? 'Operator');
  readonly isAdmin = computed(() => this.staff.role() === 'Admin');
  readonly isOperator = computed(() => this.staff.role() === 'Operator');
  readonly isCskh = computed(() => this.staff.role() === 'CSKH');

  constructor() {
    this.sync.on('demo', () => this._state.set(this.read()));
  }

  patch(change: Partial<DemoState>): void {
    if (change.role) this.staff.signIn(change.role);
    const next = { ...this._state(), ...change };
    this._state.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    this.sync.post('demo');
  }

  setDown(target: TargetService, down: boolean): void {
    this.patch({ down: { ...this._state().down, [target]: down } });
  }

  isDown(target: TargetService): boolean {
    return this._state().down[target];
  }

  private read(): DemoState {
    try {
      const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw) as Partial<DemoState>;
      return { ...DEFAULT_STATE, ...parsed, down: { ...DEFAULT_STATE.down, ...parsed.down } };
    } catch {
      return DEFAULT_STATE;
    }
  }
}
