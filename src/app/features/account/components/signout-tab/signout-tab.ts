import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { injectSignOut } from '../../../../core/auth/sign-out';
import { SupabaseAuthService } from '../../../../core/supabase/supabase-auth.service';
import { AccountState } from '../../services/account-state';

/**
 * "Đăng xuất" tab. The header's account dropdown is disabled on /account,
 * so signing out from the account page happens here.
 */
@Component({
  selector: 'app-signout-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="overflow-hidden rounded-card border border-line bg-surface-alt shadow-soft" aria-labelledby="signout-title">
      <div class="h-1.5 bg-linear-90 from-brand-800 via-brand-400 to-[#f9a8d4]" aria-hidden="true"></div>
      <div class="flex flex-col items-center gap-6 px-6 py-10 text-center sm:px-10 sm:py-14">
        <span class="grid size-16 place-items-center rounded-full bg-brand-50 text-brand-800 ring-8 ring-brand-50/60" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-7">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" />
          </svg>
        </span>

        <div class="max-w-md">
          <h2 id="signout-title" class="font-display text-xl font-bold text-ink sm:text-2xl">Đăng xuất khỏi CasEYE's?</h2>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">
            Bạn đang đăng nhập với
            <span class="font-semibold text-ink">{{ email() }}</span>.
            Giỏ hàng và thiết kế đã lưu vẫn được giữ cho tài khoản này, lần sau đăng nhập là thấy lại ngay.
          </p>
        </div>

        <div class="flex w-full max-w-sm flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            (click)="cancelled.emit()"
            [disabled]="busy()"
            class="min-h-12 flex-1 rounded-pill border border-line bg-white px-6 text-sm font-semibold text-ink transition-colors hover:bg-surface-container-low disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-400"
          >
            Ở lại
          </button>
          <button
            type="button"
            (click)="confirm()"
            [disabled]="busy()"
            class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-pill bg-danger px-6 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-[#b91c1c] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            @if (busy()) {
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-4 animate-spin"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" class="opacity-25" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
              Đang đăng xuất…
            } @else {
              Đăng xuất
            }
          </button>
        </div>
      </div>
    </section>
  `,
})
export class SignoutTab {
  /** "Ở lại": the account page goes back to the profile tab. */
  readonly cancelled = output<void>();

  private readonly auth = inject(SupabaseAuthService);
  private readonly accountState = inject(AccountState);
  private readonly signOut = injectSignOut();

  protected readonly busy = signal(false);
  protected readonly email = computed(
    () => this.auth.user()?.email ?? this.accountState.profile()?.display_name ?? 'tài khoản của bạn',
  );

  protected async confirm(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    const ok = await this.signOut();
    if (!ok) this.busy.set(false);
  }
}
