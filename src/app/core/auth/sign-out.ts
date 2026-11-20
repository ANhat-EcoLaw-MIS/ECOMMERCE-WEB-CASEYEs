import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import { NotificationManager } from '../../shared/ui/notification/notification.manager';

/**
 * Customer sign-out used by the header dropdown and the account page's "Đăng xuất" tab.
 * Call in an injection context; the returned function signs out, goes home and notifies.
 * Resolves to true on success.
 */
export function injectSignOut(): () => Promise<boolean> {
  const auth = inject(SupabaseAuthService);
  const router = inject(Router);
  const notifications = inject(NotificationManager);

  return async () => {
    const r = await auth.signOut();
    if (r.error) {
      notifications.show({
        variant: 'error',
        title: 'Gặp chút lỗi rồi!',
        message: `${r.error.code}: ${r.error.message} - Hãy liên hệ với chăm sóc khách hàng để được hỗ trợ sớm nhất.`,
      });
      return false;
    }
    await router.navigate(['/']);
    notifications.show({
      variant: 'success',
      title: 'Đăng xuất thành công',
      message: 'Hẹn gặp lại bạn sớm nhé!',
    });
    return true;
  };
}
