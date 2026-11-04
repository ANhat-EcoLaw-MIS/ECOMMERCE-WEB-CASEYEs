import { Injectable, computed, inject, signal } from '@angular/core';
import { TargetService } from '../models/order-tracking.model';
import { SyncChannel } from './sync-channel';

export type DemoRole = 'Admin' | 'Operator';

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
 * Demo Console settings. Only a testing tool: enabled by opening any page with `?demo=1`,
 * never shown to customers otherwise (v5 FR-OT-07).
 */
@Injectable({ providedIn: 'root' })
export class DemoSettings {
  private readonly sync = inject(SyncChannel);
  private readonly _state = signal<DemoState>(this.read());

  readonly state = this._state.asReadonly();
  readonly enabled = computed(() => this._state().enabled);
  readonly role = computed(() => this._state().role);
  readonly isAdmin = computed(() => this._state().role === 'Admin');

  constructor() {
    this.sync.on('demo', () => this._state.set(this.read()));
  }

  /** Called with the `demo` query param of the current URL. */
  applyQueryFlag(flag: string | null): void {
    if (flag === '1') this.patch({ enabled: true });
    else if (flag === '0') this.patch({ enabled: false });
  }

  patch(change: Partial<DemoState>): void {
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
