import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page flex flex-col items-center gap-6 py-24 text-center">
      <h1 class="font-display text-4xl font-extrabold tracking-tight text-ink">Không tìm thấy trang</h1>
      <p class="text-ink-soft">Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.</p>
      <a routerLink="/" class="inline-flex h-12 items-center rounded-pill bg-brand-800 px-6 font-bold text-white">Về trang chủ</a>
    </section>
  `,
})
export class NotFound {}
