import { Injectable, computed, signal } from '@angular/core';

/** Back-office roles (BRD v8): each sees only its own actions. */
export type StaffRole = 'Operator' | 'CSKH' | 'Admin';

export const STAFF_ROLES: readonly { key: StaffRole; label: string; hint: string }[] = [
  { key: 'Operator', label: 'Operator', hint: 'Xưởng in: duyệt thiết kế, chốt mẻ, đóng gói' },
  { key: 'CSKH', label: 'CSKH', hint: 'Yêu cầu hủy đơn, khiếu nại, đối soát giao thất bại' },
  { key: 'Admin', label: 'Admin', hint: 'Xác nhận hoàn tiền' },
];

const STORAGE_KEY = 'caseyes.staff.v1';

function read(): StaffRole | null {
  if (typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'Operator' || v === 'CSKH' || v === 'Admin' ? v : null;
}

/**
 * Staff session for the admin area. Demo only: `profiles` has no role column yet (MIS-10),
 * so the role is picked on /admin/dang-nhap and kept in localStorage. Replace with profiles.role.
 */
@Injectable({ providedIn: 'root' })
export class StaffSession {
  private readonly _role = signal<StaffRole | null>(read());
  readonly role = this._role.asReadonly();
  readonly signedIn = computed(() => this._role() !== null);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) this._role.set(read());
      });
    }
  }

  signIn(role: StaffRole): void {
    this._role.set(role);
    localStorage.setItem(STORAGE_KEY, role);
  }

  signOut(): void {
    this._role.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }
}
