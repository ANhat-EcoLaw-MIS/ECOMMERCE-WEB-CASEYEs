import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import type { Result } from '../../core/supabase/supabase.types';
import { AuthModal, type AuthMode as Mode } from '../../core/auth/auth-modal';
import { toSignal } from '@angular/core/rxjs-interop';
import { sanitizeReturnUrl } from '../../shared/utils/safe-return-url';
import { DEMO_GOOGLE_EMAIL } from '../../shared/utils/demo-user';
import { ProfileRepository } from '../account/services/profile.repository';
import { NotificationManager } from '../../shared/ui/notification/notification.manager';
import { LoadingOverlay } from '../../shared/ui/loading/loading-overlay';

const TEXT: Record<Mode, { title: string; submit: string }> = {
  login: { title: 'Đăng nhập', submit: 'Đăng nhập' },
  register: { title: 'Đăng ký', submit: 'Đăng ký' },
  forgot: { title: 'Quên mật khẩu', submit: 'Gửi liên kết' },
  reset: { title: 'Đặt lại mật khẩu', submit: 'Lưu mật khẩu mới' },
};

const PATHS: Record<Mode, string> = {
  login: 'login',
  register: 'register',
  forgot: 'forgot-password',
  reset: 'reset-password',
};

/** Supabase returns English messages; map the ones from the spec to Vietnamese. */
const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại',
  'User already registered':
    'Email này đã được đăng ký. Vui lòng đăng nhập hoặc khôi phục mật khẩu',
  'Email not confirmed': 'Vui lòng xác nhận email trước khi đăng nhập',
};

/** Stand-in for Google OAuth: use the existing demo account's password session. */
const MOCK_GOOGLE_PASSWORD = 'Mock-Google-123';

/** Form classes (brand tokens only). Tailwind scans .ts files, so these work. */
const UI = {
  label: 'mb-1 block text-sm font-medium text-ink',
  input:
    'min-h-11 w-full rounded-xl border border-line bg-surface-alt px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-brand-400',
  primary:
    'inline-flex min-h-11 w-full items-center justify-center rounded-pill bg-brand-800 px-6 font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
  secondary:
    'inline-flex min-h-11 w-full items-center justify-center rounded-pill border-[1.5px] border-brand-800 px-6 font-semibold text-brand-800 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60 motion-reduce:transition-none',
  error: 'mb-4 rounded-xl bg-brand-50 p-3 text-sm text-ink',
  notice: 'mb-4 rounded-xl bg-brand-100 p-3 text-sm text-brand-800',
  link: 'font-medium text-brand-800 underline underline-offset-2',
  hint: 'mt-1 text-sm font-medium text-brand-800/80',
  helper: 'mt-1 text-sm text-brand-800/80',
} as const;

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

type Field = 'email' | 'password' | 'confirmPassword';
const UNTOUCHED: Record<Field, boolean> = { email: false, password: false, confirmPassword: false };
const ALL_TOUCHED: Record<Field, boolean> = { email: true, password: true, confirmPassword: true };

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth.html',
  styleUrl:'./auth.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auth {
  readonly embedded = input(false); // true when shown inside the modal
  readonly success = output<void>(); // login or register finished
  readonly modeChange = output<Mode>(); // user clicked "Đăng ký", "Quên mật khẩu"...
  private readonly auth = inject(SupabaseAuthService);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly authModal = inject(AuthModal);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationManager);
  private readonly overlay = inject(LoadingOverlay);

  readonly mode = input.required<Mode>(); // from route data
  readonly returnUrl = input<string>(); // ?returnUrl=/design-studio
  readonly done = input<string>(); // ?done=1 after a successful password reset

  protected readonly ui = UI;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly text = computed(() => TEXT[this.mode()]);
  protected readonly needsEmail = computed(() => this.mode() !== 'reset');
  protected readonly needsPassword = computed(() => this.mode() !== 'forgot');
  protected readonly needsConfirm = computed(() => ['register', 'reset'].includes(this.mode()));
  protected readonly showGoogle = computed(() => ['login', 'register'].includes(this.mode()));
  /** The reset link signs the user in; no session means the link is expired or invalid. */

  constructor() {
    effect(() => {
      this.mode();
      untracked(() => {
        this.form.reset();
        this.error.set(null);
        this.notice.set(null);
      });
    });
    untracked(() => {
      this.form.reset();
      this.touched.set(UNTOUCHED);
      this.error.set(null);
      this.notice.set(null);
    });
  }

  protected go(mode: Mode): void {
    if (this.embedded()) this.modeChange.emit(mode);
    else void this.router.navigate(['/auth', PATHS[mode]]);
  }

  private async leave(url: string): Promise<void> {
    if (this.embedded()) this.success.emit();
    else await this.router.navigateByUrl(url);
  }

  protected readonly linkInvalid = computed(
    () => this.mode() === 'reset' && !this.auth.isAuthenticated(),
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: '',
    password: '',
    confirmPassword: '',
  });
  protected readonly touched = signal(UNTOUCHED);
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly hints = computed(() => {
    const { email = '', password = '', confirmPassword = '' } = this.values();
    const t = this.touched();
    const strong = this.needsConfirm(); // register or reset
    return {
      email:
        t.email && this.needsEmail() && !EMAIL_RE.test(email) ? 'Vui lòng nhập email hợp lệ.' : null,
      password:
        t.password && this.mode() === 'login' && !password
          ? 'Vui lòng nhập mật khẩu.'
          : t.password && strong && !PASSWORD_RE.test(password)
            ? 'Mật khẩu cần ít nhất 8 ký tự, gồm cả chữ và số.'
            : null,
      confirmPassword:
        t.confirmPassword && strong && confirmPassword !== password
          ? 'Mật khẩu nhập lại không khớp.'
          : null,
    };
  });
  protected touch(field: Field): void {
    this.touched.update((t) => ({ ...t, [field]: true }));
  }

  protected async submit(): Promise<void> {
    this.touched.set(ALL_TOUCHED); // reveal every problem at once
    if (Object.values(this.hints()).some(Boolean)) return;
    const mode = this.mode();
    const { email, password } = this.form.getRawValue();
    this.start();
    await this.finish(await this.request(mode, email, password), mode);
  }

  protected async google(): Promise<void> {
    const mode = this.mode();
    this.start();
    // MOCK: Resolve Google sign-in directly to the existing demo user's password session.
    const res: Result<object> = await this.auth.signIn({
      email: DEMO_GOOGLE_EMAIL,
      password: MOCK_GOOGLE_PASSWORD,
    });
    if (res.error) {
      this.loading.set(false);
      this.error.set(
        'Không thể đăng nhập tài khoản Google demo. Vui lòng xác nhận tài khoản đã tồn tại và được cấu hình trong Supabase Auth.',
      );
      return;
    }
    if (mode === 'login') {
      this.loading.set(false);
      this.notifyLoggedIn();
      await this.leave(this.safeReturnUrl());
      return;
    }
    if (mode === 'register') {
      const userId = this.auth.user()?.id;
      if (!userId) {
        this.loading.set(false);
        this.error.set('Không thể xác định tài khoản Google demo. Vui lòng đăng nhập lại.');
        return;
      }

      // MOCK: A new demo signup clears the previously recorded onboarding data.
      const reset = await this.profileRepository.resetOnboardingData(userId);
      if (reset.error) {
        this.loading.set(false);
        this.error.set(`Không thể đặt lại dữ liệu thiết lập: ${reset.error.message}`);
        return;
      }
      this.loading.set(false);
      await this.leaveForOnboarding(true);
      return;
    }
    await this.finish(res, mode);
  }

  private request(mode: Mode, email: string, password: string): Promise<Result<object>> {
    switch (mode) {
      case 'login':
        return this.auth.signIn({ email, password });
      case 'register':
        return this.auth.signUp({ email, password });
      case 'forgot':
        return this.auth.resetPassword(email);
      case 'reset':
        return this.auth.updatePassword(password);
    }
  }

  private async finish(
    res: Result<object>,
    mode: Mode,
    signupFlow = mode === 'register',
  ): Promise<void> {
    this.loading.set(false);
    if (res.error) {
      this.error.set(ERRORS[res.error.message] ?? 'Đã có lỗi xảy ra. Vui lòng thử lại sau');
      return;
    }
    switch (mode) {
      case 'login':
        this.notifyLoggedIn();
        await this.leave(this.safeReturnUrl());
        break;
      case 'register': {
        const signedIn = 'session' in res.data && res.data.session !== null;
        if (signedIn && signupFlow) await this.leaveForOnboarding(true);
        else if (signedIn) await this.leave(this.safeReturnUrl());
        else {
          this.notice.set('Vui lòng kiểm tra email và nhấn vào liên kết để kích hoạt tài khoản.');
          this.notifications.show({
            variant: 'success',
            title: 'Đăng ký thành công',
            message: 'Kiểm tra hộp thư và nhấn vào liên kết để kích hoạt tài khoản nhé.',
            duration: 7000,
          });
        }
        break;
      }
      case 'forgot':
        this.notice.set('Nếu email của bạn tồn tại trong hệ thống, vui lòng kiểm tra hộp thư.');
        break;
      case 'reset':
        await this.auth.signOut(); // ends the session, so the user logs in with the new password
        await this.router.navigate(['/login'], { queryParams: { done: '1' } });
        break;
    }
  }

  private notifyLoggedIn(): void {
    const email = this.auth.user()?.email;
    this.notifications.show({
      variant: 'success',
      title: 'Đăng nhập thành công',
      message: email ? `Chào mừng trở lại, ${email}!` : "Chào mừng bạn trở lại CasEYE's!",
    });
  }

  private start(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);
  }

  /** Only allow in-app paths, so ?returnUrl=https://evil.com cannot redirect away. */
  private safeReturnUrl(): string {
    const url = this.returnUrl();
    return url?.startsWith('/') && !url.startsWith('//') ? url : '/';
  }

  private async leaveForOnboarding(signupFlow = false): Promise<void> {
    const rawReturnUrl = this.embedded()
      ? this.authModal.signupReturnUrl()
      : this.returnUrl();
    const returnUrl = sanitizeReturnUrl(rawReturnUrl);
    if (this.embedded()) this.authModal.close();
    const signupParam = signupFlow ? '&flow=signup' : '';
    // Covers the lazy onboarding route + its guard, so the user sees a deliberate hand-off
    // instead of a frozen form; it closes when the onboarding page has loaded.
    if (signupFlow) {
      this.overlay.showUntilNavigation({
        title: 'Đăng ký thành công!',
        message: 'Đang chuẩn bị không gian thiết kế dành riêng cho bạn…',
        minDuration: 1200,
      });
    }
    await this.router.navigateByUrl(
      `/account/onboarding?returnUrl=${encodeURIComponent(returnUrl)}${signupParam}`,
      { replaceUrl: true },
    );
  }
}
