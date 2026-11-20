import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { BaseSKU, PhoneModel } from '../../../../shared/devices/devices';
import { colorSkus } from '../../catalog';

/** Colour swatches for one device (quick view and detail page). */
@Component({
  selector: 'app-variant-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <fieldset>
      <legend class="mb-2 text-sm font-semibold text-ink">Màu ốp: <span class="font-normal text-ink-soft">{{ sku().colorName }}</span></legend>
      <div class="flex flex-wrap gap-2.5">
        @for (s of colorSkus(); track s.skuId) {
          <button
            type="button"
            (click)="skuChange.emit(s)"
            [attr.aria-pressed]="s.colorName === sku().colorName"
            [attr.aria-label]="s.colorName"
            [attr.title]="s.colorName"
            class="size-9 rounded-full ring-1 ring-black/10 ring-offset-2 transition-shadow hover:ring-brand-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 aria-pressed:ring-2 aria-pressed:ring-brand-800"
            [style.background]="s.colorHex"
          ></button>
        }
      </div>
    </fieldset>
  `,
})
export class VariantPicker {
  readonly model = input.required<PhoneModel>();
  readonly sku = input.required<BaseSKU>();
  readonly skuChange = output<BaseSKU>();

  protected readonly colorSkus = computed(() => colorSkus(this.model()));
}
