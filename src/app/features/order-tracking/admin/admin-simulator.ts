import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StaffSession } from '../../../core/auth/staff-session';
import { BTN_GHOST, BTN_PRIMARY, FIELD } from '../components/ui';
import { OrderTrackingService } from '../services/order-tracking.service';

type Kind = 'stock' | 'custom' | 'mixed';
type Payment = 'cod' | 'prepaid';
type Tier = 'standard' | 'express';

interface Scenario {
  readonly title: string;
  readonly kind: Kind;
  readonly payment: Payment;
  readonly steps: readonly string[];
}

/** Scripts the demo can follow; each uses a real order created below for a real customer account. */
const SCENARIOS: readonly Scenario[] = [
  {
    title: 'A. Khách hủy đơn COD trong 30 phút',
    kind: 'stock',
    payment: 'cod',
    steps: [
      'Tạo đơn mẫu: Hàng có sẵn + COD.',
      'Cửa sổ khách: mở đơn, bấm “Hủy đơn” → đơn chuyển Đã hủy, không phát sinh hoàn tiền.',
      'Cửa sổ admin: đơn biến khỏi hàng chờ “Chờ đóng gói”, lịch sử ghi “Khách hủy”.',
      'Biến thể: ở admin bấm tua “+31 phút” trước → khách không còn nút Hủy, chỉ còn “Yêu cầu hủy”; admin thấy nút “Đã lấy hàng, đóng gói xong”.',
    ],
  },
  {
    title: 'B. Đơn đã thanh toán: khách gửi yêu cầu hủy',
    kind: 'custom',
    payment: 'prepaid',
    steps: [
      'Tạo đơn mẫu: Thiết kế riêng + Đã thanh toán (đơn ở Chờ duyệt thiết kế).',
      'Cửa sổ khách: bấm “Yêu cầu hủy”, chọn lý do → đơn hiện “Đang chờ xử lý yêu cầu hủy”.',
      'Cửa sổ admin: hàng chờ CSKH “Yêu cầu hủy” có đơn; nút duyệt thiết kế bị khóa vì đơn đang giữ.',
      'Từ chối (nhập lý do) → khách thấy lý do, đơn chạy tiếp. Hoặc Chấp nhận → Đã hủy + phiếu hoàn 100%.',
      'Cửa sổ khách: nhập tài khoản nhận hoàn. Cửa sổ admin: hàng chờ “Duyệt hoàn tiền” → Duyệt → “Đã chuyển khoản” (nhập mã GD) → khách thấy Đã hoàn tiền.',
      'Biến thể quá hạn: tua “+1 ngày” → yêu cầu hiện QUÁ HẠN ở admin.',
    ],
  },
  {
    title: 'C. Thiết kế bị yêu cầu sửa: khách hủy, hoàn 100%',
    kind: 'custom',
    payment: 'prepaid',
    steps: [
      'Tạo đơn mẫu: Thiết kế riêng + Đã thanh toán.',
      'Cửa sổ admin: chọn nhóm vi phạm, nhập lý do, bấm “Yêu cầu sửa”.',
      'Cửa sổ khách: đơn hiện “Cần sửa thiết kế” với lý do; bấm “Hủy đơn” → Đã hủy, phiếu hoàn 100% không trừ phí.',
      'Tiếp tục hoàn tiền như kịch bản B. Biến thể: tua “+7 ngày” → hệ thống tự hủy.',
    ],
  },
  {
    title: 'D. Giao thất bại → khách hủy',
    kind: 'stock',
    payment: 'prepaid',
    steps: [
      'Tạo đơn mẫu: Hàng có sẵn + Đã thanh toán. Admin: “Đã lấy hàng, đóng gói xong”.',
      'Mô phỏng vận chuyển: “Hãng lấy hàng” → chọn nguyên nhân → “Giao thất bại” → “Hàng về kho”.',
      'Cửa sổ khách: chọn “Hủy đơn” → hoàn tiền theo lỗi (lỗi khách trừ phí ship, lỗi hãng/shop hoàn 100%); hàng có sẵn được nhập lại kho.',
      'Biến thể khiếu nại: khách bấm “Không đồng ý nguyên nhân” → admin thấy phiếu CSKH, thời hạn giữ hàng tạm dừng.',
    ],
  },
];

@Component({
  selector: 'app-admin-simulator',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <p class="text-xs font-semibold uppercase tracking-widest text-amber-700">Chỉ dùng khi demo</p>
      <h1 class="font-display text-2xl font-extrabold text-ink">Mô phỏng đơn hàng</h1>
      <p class="mt-1 max-w-3xl text-sm text-ink-soft">
        Mọi thao tác ở đây ghi thẳng vào cơ sở dữ liệu, nên trang khách và trang admin luôn thấy cùng một dữ liệu.
        Mở 2 cửa sổ: cửa sổ thường đăng nhập tài khoản khách, cửa sổ còn lại đăng nhập admin. Sự kiện vận chuyển và
        tua thời gian nằm ngay trong chi tiết từng đơn ở trang “Đơn hàng”.
      </p>

      @if (!isAdmin()) {
        <p class="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Chỉ tài khoản Admin dùng được trang này.</p>
      } @else {
        <div class="mt-6 grid gap-4 md:grid-cols-[1fr_16rem]">
          <form class="rounded-card border border-line bg-surface-alt p-5 shadow-soft" (submit)="$event.preventDefault(); create()">
            <h2 class="font-semibold text-ink">1. Tạo đơn mẫu cho khách</h2>
            <label class="mt-3 block text-sm font-semibold text-ink" for="sim-email">Email tài khoản khách</label>
            <input id="sim-email" type="email" required [class]="field" class="mt-1" placeholder="khach@vidu.com" [value]="email()" (input)="email.set($any($event.target).value)" />
            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <label class="text-sm font-semibold text-ink">Loại hàng
                <select [class]="field" class="mt-1" [value]="kind()" (change)="kind.set($any($event.target).value)">
                  <option value="stock">Hàng có sẵn</option>
                  <option value="custom">Thiết kế riêng</option>
                  <option value="mixed">Cả hai</option>
                </select>
              </label>
              <label class="text-sm font-semibold text-ink">Thanh toán
                <select [class]="field" class="mt-1" [value]="payment()" (change)="payment.set($any($event.target).value)">
                  <option value="cod">COD</option>
                  <option value="prepaid">Đã thanh toán</option>
                </select>
              </label>
              <label class="text-sm font-semibold text-ink">Giao hàng
                <select [class]="field" class="mt-1" [value]="tier()" (change)="tier.set($any($event.target).value)">
                  <option value="standard">Tiêu chuẩn</option>
                  <option value="express">Hỏa tốc</option>
                </select>
              </label>
            </div>
            <button type="submit" [class]="btnPrimary" class="mt-4" [disabled]="busy() || !email().trim()">Tạo đơn</button>
            @if (message(); as m) {
              <p role="status" class="mt-3 rounded-xl px-3 py-2 text-sm" [class]="m.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'">{{ m.text }}</p>
            }
            @if (created().length) {
              <ul class="mt-3 flex flex-col gap-1.5 text-sm">
                @for (c of created(); track c) {
                  <li class="flex flex-wrap items-center gap-3">
                    <span class="font-semibold text-ink">{{ c }}</span>
                    <a class="text-brand-800 underline" [routerLink]="['/admin/order-tracking']" [queryParams]="{ q: c }">Xử lý ở trang admin</a>
                    <a class="text-brand-800 underline" [routerLink]="['/order-tracking', c]" target="_blank">Trang khách ↗</a>
                  </li>
                }
              </ul>
            }
          </form>

          <div class="rounded-card border border-line bg-surface-alt p-5 shadow-soft">
            <h2 class="font-semibold text-ink">2. Job hệ thống</h2>
            <p class="mt-1 text-sm text-ink-soft">Job tự chạy mỗi phút. Bấm để chạy ngay (tự hủy quá hạn, tự hoàn tất, nhắc hoàn tiền, mẻ 16:00).</p>
            <button type="button" [class]="btnGhost" class="mt-3" [disabled]="busy()" (click)="runJobs()">Chạy job ngay</button>
          </div>
        </div>

        <h2 class="mt-8 font-display text-lg font-bold text-ink">3. Kịch bản demo</h2>
        <div class="mt-3 grid gap-4 md:grid-cols-2">
          @for (s of scenarios; track s.title) {
            <article class="rounded-card border border-line bg-surface-alt p-5 shadow-soft">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-semibold text-ink">{{ s.title }}</h3>
                <button type="button" class="shrink-0 text-xs font-bold text-brand-800 underline" (click)="usePreset(s)">Dùng cấu hình này</button>
              </div>
              <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
                @for (step of s.steps; track $index) { <li>{{ step }}</li> }
              </ol>
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class AdminSimulator {
  private readonly service = inject(OrderTrackingService);
  private readonly session = inject(StaffSession);

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly field = FIELD;
  protected readonly scenarios = SCENARIOS;

  protected readonly isAdmin = computed(() => (this.session.dbRole() ?? this.session.role()) === 'Admin');
  protected readonly email = signal('');
  protected readonly kind = signal<Kind>('stock');
  protected readonly payment = signal<Payment>('cod');
  protected readonly tier = signal<Tier>('standard');
  protected readonly busy = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly created = signal<readonly string[]>([]);

  protected usePreset(s: Scenario): void {
    this.kind.set(s.kind);
    this.payment.set(s.payment);
    this.message.set({ ok: true, text: `Đã chọn cấu hình cho “${s.title}”. Nhập email khách rồi bấm Tạo đơn.` });
  }

  protected async create(): Promise<void> {
    this.busy.set(true);
    const r = await this.service.simCreateSample(this.email().trim(), this.kind(), this.payment(), this.tier());
    this.busy.set(false);
    if (r.data) {
      const code = r.data.orderCode;
      this.created.update((l) => [code, ...l]);
      this.message.set({ ok: true, text: `Đã tạo đơn ${code}. Khách thấy đơn ngay trong “Đơn hàng của tôi”.` });
    } else {
      this.message.set({ ok: false, text: r.error?.message ?? 'Không tạo được đơn.' });
    }
  }

  protected async runJobs(): Promise<void> {
    this.busy.set(true);
    const r = await this.service.simRunJobs();
    this.busy.set(false);
    this.message.set(r.error ? { ok: false, text: r.error.message } : { ok: true, text: 'Đã chạy job hệ thống.' });
  }
}
