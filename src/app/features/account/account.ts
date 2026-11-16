import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CustomerOrderFeed } from '../../shared/services/customer-order-feed';
import { AccountState } from './services/account-state';
import { AccountToast } from './services/account-toast';
import { DesignsTab } from './components/designs-tab/designs-tab';
import { OnboardingModal } from './components/onboarding-modal/onboarding-modal';
import { OrdersTab } from './components/orders-tab/orders-tab';
import { ProfileTab } from './components/profile-tab/profile-tab';
import { SecurityTab } from './components/security-tab/security-tab';
import { StudioState } from '../design-studio/services/studio-state';
import { type ProfileSetupPreferences, type TabId } from './models/account.model';

const TABS: { id: TabId; label: string; icon: string; count: 'designs' | 'orders' | null }[] = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: '◉', count: null },
  { id: 'designs', label: 'Thiết kế của tôi', icon: '◇', count: 'designs' },
  { id: 'orders', label: 'Đơn hàng', icon: '▣', count: 'orders' },
  { id: 'security', label: 'Bảo mật & Cài đặt', icon: '⌑', count: null },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DesignsTab, OnboardingModal, OrdersTab, ProfileTab, SecurityTab],
  selector: 'app-account',
  styleUrl: './account.scss',
  templateUrl: './account.html',
})
export class Account implements OnInit {
  protected readonly accountState = inject(AccountState);
  private readonly studioState = inject(StudioState);
  protected readonly toast = inject(AccountToast);
  protected readonly tabs = TABS;
  protected readonly activeTab = signal<TabId>('profile');
  protected readonly designCount = computed(() => this.studioState.savedDesigns().length);
  // Integration: real orders from Quản lý đơn hàng; `?tab=orders` opens the orders tab.
  protected readonly orderCount = computed(() => this.orderFeed.orders().length);
  private readonly orderFeed = inject(CustomerOrderFeed);
  readonly tab = input<string>();
  protected readonly onboardingBannerVisible = signal(false);
  protected readonly onboardingVisible = signal(false);
  protected readonly deletionPending = signal(false);

  ngOnInit(): void {
    const tab = this.tab();
    if (tab && TABS.some((t) => t.id === tab)) this.activeTab.set(tab as TabId);
    void this.accountState.load().then(() => {
      const profile = this.accountState.profile();
      this.onboardingBannerVisible.set(
        profile !== null && profile.onboarding_status !== 'completed',
      );
    });
  }

  protected async dismissOnboarding(): Promise<void> {
    this.onboardingBannerVisible.set(false);
    // TODO: no column yet: persist the onboarding-dismissed flag.
    this.toast.show('Đã bỏ qua phần thiết lập sở thích.', 'info');
  }

  protected async saveOnboarding(preferences: ProfileSetupPreferences): Promise<void> {
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
  }

  protected cancelDeletion(): void {
    this.deletionPending.set(false);
    this.toast.show('Đã khôi phục tài khoản thành công! Lệnh xóa đã bị hủy bỏ.', 'success');
  }
}
