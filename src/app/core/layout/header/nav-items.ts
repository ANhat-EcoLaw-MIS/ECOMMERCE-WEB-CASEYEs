export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon?: 'home';
  /** Show only the icon on desktop (the label stays available to screen readers). */
  readonly iconOnly?: boolean;
  /** Highlight only on an exact URL match (needed for '/'). */
  readonly exact?: boolean;
}

/** Single source of truth for the main navigation. Add or rename modules here. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Trang chủ', path: '/', icon: 'home', iconOnly: true, exact: true },
  { label: 'Thiết kế', path: '/design-studio' },
  { label: 'Cửa hàng', path: '/shop' },
  // Đơn hàng lives in Tài khoản (feedback 14/11): /account?tab=orders.
  { label: 'Hỗ trợ', path: '/customer-support' },
  { label: 'Test', path: '/test' },
];

