// acc: duc - mk: ducduc!1234

import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import type { Result } from '../../core/supabase/supabase.types';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

const TEXT: Record<Mode, { title: string; submit: string }> = {
  login: { title: 'Đăng nhập', submit: 'Đăng nhập' },
  register: { title: 'Đăng ký', submit: 'Đăng ký' },
  forgot: { title: 'Quên mật khẩu', submit: 'Gửi liên kết' },
  reset: { title: 'Đặt lại mật khẩu', submit: 'Lưu mật khẩu mới' },
};

/** Supabase returns English messages; map the ones from the spec to Vietnamese. */
const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại',
  'User already registered':
    'Email này đã được đăng ký. Vui lòng đăng nhập hoặc khôi phục mật khẩu',
  'Email not confirmed': 'Vui lòng xác nhận email trước khi đăng nhập',
};

/** Stand-in for Google OAuth: one fixed demo account, created on first use. */
const MOCK_GOOGLE = { email: 'google.demo.user@gmail.com', password: 'Mock-Google-123' };

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
} as const;

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auth {
  private readonly auth = inject(SupabaseAuthService);
  private readonly router = inject(Router);

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
  protected readonly linkInvalid = computed(
    () => this.mode() === 'reset' && !this.auth.isAuthenticated(),
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: '',
    password: '',
    confirmPassword: '',
  });

  protected async submit(): Promise<void> {
    const { email, password, confirmPassword } = this.form.getRawValue();
    const problem = this.validate(email, password, confirmPassword);
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.start();
    await this.finish(await this.request(email, password));
  }

  protected async google(): Promise<void> {
    this.start();
    let res: Result<object> = await this.auth.signIn(MOCK_GOOGLE);
    if (res.error) res = await this.auth.signUp(MOCK_GOOGLE); // first time: create the account
    await this.finish(res);
  }

  private request(email: string, password: string): Promise<Result<object>> {
    switch (this.mode()) {
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

  private async finish(res: Result<object>): Promise<void> {
    this.loading.set(false);
    if (res.error) {
      this.error.set(ERRORS[res.error.message] ?? 'Đã có lỗi xảy ra. Vui lòng thử lại sau');
      return;
    }
    switch (this.mode()) {
      case 'login':
        await this.router.navigateByUrl(this.safeReturnUrl());
        break;
      case 'register': {
        const signedIn = 'session' in res.data && res.data.session !== null;
        if (signedIn) await this.router.navigateByUrl('/'); // '/onboarding' once you build it
        else this.notice.set('Vui lòng kiểm tra email và nhấn vào liên kết để kích hoạt tài khoản.');
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

  private validate(email: string, password: string, confirm: string): string | null {
    const mode = this.mode();
    if (this.needsEmail() && !/^\S+@\S+\.\S+$/.test(email)) return 'Vui lòng nhập email hợp lệ.';
    if (mode === 'login' && !password) return 'Vui lòng nhập mật khẩu.';
    if (this.needsConfirm()) {
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password))
        return 'Mật khẩu cần ít nhất 8 ký tự, gồm cả chữ và số.';
      if (password !== confirm) return 'Mật khẩu nhập lại không khớp.';
    }
    return null;
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
}
