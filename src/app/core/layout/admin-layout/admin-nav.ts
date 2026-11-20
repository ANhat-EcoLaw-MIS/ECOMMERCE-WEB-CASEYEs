/** Admin sidebar. Other functions (CSKH, Thanh toán, Loyalty) add their admin pages here. */
export interface AdminNavItem {
  readonly label: string;
  readonly path: string;
  readonly group: string;
  /** Simulation tools are labelled so they are never mistaken for real operations. */
  readonly simulation?: boolean;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { group: 'Quản lý đơn hàng', label: 'Đơn hàng', path: '/admin/order-tracking' },
  { group: 'Quản lý đơn hàng', label: 'Mô phỏng (demo)', path: '/admin/order-tracking/simulator', simulation: true },
];
