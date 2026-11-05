import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { AccountState } from './services/account-state';
import { AccountToast } from './services/account-toast';
import { DesignsTab } from './components/designs-tab/designs-tab';
import { OnboardingModal } from './components/onboarding-modal/onboarding-modal';
import { OrdersTab } from './components/orders-tab/orders-tab';
import { ProfileTab } from './components/profile-tab/profile-tab';
import { SecurityTab } from './components/security-tab/security-tab';
import { DESIGNS, ORDERS, type OnboardingPreferences, type TabId } from './models/account.model';
import { ToastList } from './components/toast-list/toast-list';

const TABS: { id: TabId; label: string; icon: string; count: 'designs' | 'orders' | null }[] = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: '◉', count: null },
  { id: 'designs', label: 'Thiết kế của tôi', icon: '◇', count: 'designs' },
  { id: 'orders', label: 'Đơn hàng', icon: '▣', count: 'orders' },
  { id: 'security', label: 'Bảo mật & Cài đặt', icon: '⌑', count: null },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DesignsTab, OnboardingModal, OrdersTab, ProfileTab, SecurityTab, ToastList],
  selector: 'app-account',
  styleUrl: './account.scss',
  templateUrl: './account.html',
})
export class Account implements OnInit {
  protected readonly accountState = inject(AccountState);
  protected readonly toast = inject(AccountToast);
  protected readonly tabs = TABS;
  protected readonly activeTab = signal<TabId>('profile');
  protected readonly designCount = computed(() => DESIGNS.length);
  protected readonly orderCount = computed(() => ORDERS.length);
  protected readonly onboardingBannerVisible = signal(true);
  protected readonly onboardingVisible = signal(false);
  protected readonly deletionPending = signal(false);

  ngOnInit(): void {
    void this.accountState.load();
  }

  protected async dismissOnboarding(): Promise<void> {
    this.onboardingBannerVisible.set(false);
    // TODO: no column yet: persist the onboarding-dismissed flag.
    this.toast.show('Đã bỏ qua phần thiết lập sở thích.', 'info');
  }

  protected async saveOnboarding(preferences: OnboardingPreferences): Promise<void> {
    const profile = this.accountState.profile();
    const saved = await this.accountState.save({
      fullName: profile?.display_name ?? '',
      deviceType: preferences.deviceType,
      stylePreferences: preferences.stylePreferences,
    });
    this.onboardingVisible.set(false);
    this.toast.show(
      saved ? 'Hồ sơ sở thích đã được cá nhân hóa thành công!' : this.accountState.error() ?? 'Không thể lưu sở thích.',
      saved ? 'success' : 'info',
    );
    // TODO: no column yet: persist the selected case material.
  }

  protected cancelDeletion(): void {
    this.deletionPending.set(false);
    this.toast.show('Đã khôi phục tài khoản thành công! Lệnh xóa đã bị hủy bỏ.', 'success');
  }
}
