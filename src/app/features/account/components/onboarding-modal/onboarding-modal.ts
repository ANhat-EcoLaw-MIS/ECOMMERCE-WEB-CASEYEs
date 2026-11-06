import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ProfileSetupPreferences } from '../../models/account.model';

const STYLE_OPTIONS = ['Y2K Cyberpunk', 'Goth Y2K', 'Tối giản', 'Dễ thương', 'Vintage'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  selector: 'app-onboarding-modal',
  templateUrl: './onboarding-modal.html',
})
export class OnboardingModal {
  private readonly formBuilder = inject(FormBuilder);
  readonly initialDevice = input('iPhone 15 Pro Max');
  readonly initialStyles = input<string[]>([]);
  readonly initialMaterial = input('Chống sốc viền nhôm Matt');
  readonly closed = output<void>();
  readonly saved = output<ProfileSetupPreferences>();
  protected readonly styleOptions = STYLE_OPTIONS;
  protected readonly form = this.formBuilder.nonNullable.group({
    deviceType: ['iPhone 15 Pro Max', Validators.required],
    styles: this.formBuilder.nonNullable.control<string[]>([]),
    material: ['Chống sốc viền nhôm Matt', Validators.required],
  });

  private readonly inputsEffect = effect(() => {
    this.form.patchValue({
      deviceType: this.initialDevice(),
      styles: this.initialStyles(),
      material: this.initialMaterial(),
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
      caseMaterial: this.form.controls.material.value,
    });
    this.closed.emit();
  }
}
