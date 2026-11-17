import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { CasePreview } from '../../../../shared/ui/case-preview/case-preview';
import { BRANDS_DATA, DEVICES, minPrice, type PhoneModel } from '../../../../shared/devices/devices';

const BRAND_GROUPS = BRANDS_DATA.map((b) => ({ brand: b, devices: DEVICES.filter((d) => d.brandId === b.id) })).filter((g) => g.devices.length);

/** Device picker: chips grouped by brand, with a mini case, "from" price and scroll arrows on overflow. */
@Component({
  selector: 'app-device-chip-row',
  imports: [CasePreview],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: `
    .rail {
      scrollbar-width: none;
      mask-image: linear-gradient(90deg, transparent 0, #000 var(--fade-l, 0px), #000 calc(100% - var(--fade-r, 0px)), transparent 100%);
    }
    .rail::-webkit-scrollbar { display: none; }
    .chip[aria-checked='true'] {
      background: linear-gradient(135deg, var(--color-brand-800), var(--color-brand-600));
      box-shadow: 0 10px 24px -10px rgb(67 48 117 / 0.7);
    }
  `,
  template: `
    <div class="relative">
      @if (canLeft()) {
        <button type="button" (click)="scroll(-1)" aria-label="Cuộn trái" class="absolute left-0 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink shadow-soft hover:border-brand-400 lg:grid">‹</button>
      }
      <div
        #rail
        role="radiogroup"
        aria-label="Chọn dòng máy"
        class="rail -mx-4 flex snap-x items-stretch gap-2 overflow-x-auto scroll-smooth px-4 py-1.5 lg:mx-0 lg:px-1"
        [style.--fade-l]="canLeft() ? '32px' : '0px'"
        [style.--fade-r]="canRight() ? '32px' : '0px'"
        (scroll)="measure()"
      >
        @for (group of groups; track group.brand.id; let gi = $index) {
          @if (gi > 0) {
            <span class="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden="true"></span>
          }
          <span class="flex shrink-0 items-center pr-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{{ group.brand.name }}</span>
          @for (device of group.devices; track device.id) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="device.id === selected().id"
              (click)="choose(device, $event)"
              class="chip group flex min-h-14 shrink-0 snap-start items-center gap-3 rounded-2xl border border-line bg-white py-1.5 pl-1.5 pr-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 aria-checked:border-transparent aria-checked:text-white motion-reduce:transition-none"
            >
              <span class="grid h-11 w-9 place-items-center rounded-xl bg-surface-container-low transition-colors group-aria-checked:bg-white/15">
                <app-case-preview class="w-5" [model]="device" colorHex="#0A0A0A" caseType="snap" [seed]="device.id" [alt]="''" aria-hidden="true" />
              </span>
              <span class="flex flex-col">
                <span class="whitespace-nowrap text-sm font-semibold">{{ device.name }}</span>
                <span class="text-[11px] text-ink-soft group-aria-checked:text-white/75">Từ {{ shortPrice(device) }}</span>
              </span>
            </button>
          }
        }
      </div>
      @if (canRight()) {
        <button type="button" (click)="scroll(1)" aria-label="Cuộn phải" class="absolute right-0 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink shadow-soft hover:border-brand-400 lg:grid">›</button>
      }
    </div>
  `,
})
export class DeviceChipRow {
  readonly selected = input.required<PhoneModel>();
  readonly select = output<PhoneModel>();

  protected readonly groups = BRAND_GROUPS;
  protected readonly canLeft = signal(false);
  protected readonly canRight = signal(false);
  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.measure();
      const onResize = () => this.measure();
      window.addEventListener('resize', onResize, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    });
  }

  protected choose(device: PhoneModel, event: MouseEvent): void {
    (event.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    this.select.emit(device);
  }

  protected shortPrice(device: PhoneModel): string {
    return `${Math.round(minPrice(device) / 1000)}k`;
  }

  protected scroll(dir: 1 | -1): void {
    const el = this.rail()?.nativeElement;
    el?.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  }

  protected measure(): void {
    const el = this.rail()?.nativeElement;
    if (!el) return;
    this.canLeft.set(el.scrollLeft > 4);
    this.canRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }
}
