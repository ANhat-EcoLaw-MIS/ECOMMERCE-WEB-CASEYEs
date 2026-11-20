import type { Database } from '../../../core/supabase/database.types';

export type TabId = 'profile' | 'designs' | 'orders' | 'security' | 'signout';
export type OnboardingStatus = 'pending' | 'completed' | 'skipped';
export type Address = Database['public']['Tables']['addresses']['Row'];
export type Profile = Omit<Database['public']['Tables']['profiles']['Row'], 'onboarding_status'> & {
  onboarding_status: OnboardingStatus;
  addresses: Address[];
};

export interface Design {
  id: string;
  name: string;
  device: string;
  updated: string;
  price: string;
}

export interface Order {
  id: string;
  date: string;
  status: string;
  item: string;
  device: string;
  total: string;
}

export interface ProfileFormValue {
  fullName: string;
  deviceType: string;
  stylePreferences: string[];
  /** Only the profile form sends these; onboarding leaves them unchanged. */
  phone?: string;
  /** yyyy-MM-dd */
  birthDate?: string;
  gender?: string;
}

export interface ProfileSetupPreferences {
  deviceType: string;
  stylePreferences: string[];
}

export interface OnboardingPreferences {
  displayName: string;
  deviceName: string | null;
  stylePreferences: string[];
}

export const DESIGNS: Design[] = [
  { id: 'neon-cyberpunk', name: 'Neon Cyberpunk Edition', device: 'iPhone 15 Pro', updated: 'Sửa đổi lần cuối: 2 ngày trước', price: '289.000₫' },
  { id: 'butterfly-dream', name: 'Hologram Butterfly', device: 'Samsung S24 Ultra', updated: 'Sửa đổi lần cuối: 1 tuần trước', price: '269.000₫' },
  { id: 'pastel-cloud', name: 'Pastel Cloud', device: 'iPhone 14 Pro Max', updated: 'Sửa đổi lần cuối: 2 tuần trước', price: '259.000₫' },
];

export const ORDERS: Order[] = [
  { id: 'CASE-98421', date: '05/05/2026', status: 'Đang giao hàng (Dự kiến 08/05)', item: '1x Ốp Neon Cyberpunk', device: 'iPhone 15 Pro Max', total: '319.000₫' },
  { id: 'CASE-91204', date: '12/03/2026', status: 'Đã hoàn thành', item: '1x Ốp Hologram Butterfly', device: 'Samsung S24 Ultra', total: '269.000₫' },
];
