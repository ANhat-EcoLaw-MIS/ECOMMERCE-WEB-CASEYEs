import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ProfileSetupPreferences } from '../../models/account.model';
import { ALL_DEVICE_OPTIONS, STYLE_PRESETS, findDeviceOption } from '../../onboarding/onboarding-presets';

/** Same style vocabulary as the onboarding wizard (profiles.preferences stores these labels). */
const STYLE_OPTIONS: readonly string[] = STYLE_PRESETS.map((preset) => preset.label);
const DEFAULT_DEVICE_NAME = ALL_DEVICE_OPTIONS[0]?.name ?? '';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  selector: 'app-onboarding-modal',
  templateUrl: './onboarding-modal.html',
})
export class OnboardingModal {
  private readonly formBuilder = inject(FormBuilder);
  readonly initialDevice = input(DEFAULT_DEVICE_NAME);
  readonly initialStyles = input<string[]>([]);
  readonly closed = output<void>();
  readonly saved = output<ProfileSetupPreferences>();
  /** The phone models the Shop and Design Studio sell (see DEVICE_CATALOG). */
  protected readonly deviceOptions = ALL_DEVICE_OPTIONS;
  protected readonly styleOptions = STYLE_OPTIONS;
  protected readonly form = this.formBuilder.nonNullable.group({
    deviceType: [DEFAULT_DEVICE_NAME, Validators.required],
    styles: this.formBuilder.nonNullable.control<string[]>([]),
  });

  private readonly inputsEffect = effect(() => {
    this.form.patchValue({
      // A device saved earlier that is no longer sold falls back to the first one on offer.
      deviceType: findDeviceOption(this.initialDevice())?.name ?? DEFAULT_DEVICE_NAME,
      styles: this.initialStyles(),
    });
  });

  protected close(): void {
    this.closed.emit();
  }

  protected toggleStyle(style: string, checked: boolean): void {
    const selected = this.form.controls.styles.value;
    this.form.controls.styles.setValue(
      checked ? [...selected, style] : selected.filter((item) => item !== style),
    );
  }

  protected isStyleSelected(style: string): boolean {
    return this.form.controls.styles.value.includes(style);
  }

  protected onStyleChange(style: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.toggleStyle(style, checked);
  }

  protected save(): void {
    if (this.form.invalid) return;
    this.saved.emit({
      deviceType: this.form.controls.deviceType.value,
      stylePreferences: this.form.controls.styles.value,
    });
    this.closed.emit();
  }
}
