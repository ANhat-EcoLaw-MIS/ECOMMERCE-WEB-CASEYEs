import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ProfileSetupPreferences } from '../../models/account.model';
import { CaseCard } from '../../onboarding/components/case-card/case-card';
import { createMarqueeRows, type MarqueeRow } from '../../onboarding/marquee-cases';

const STYLE_OPTIONS = ['Y2K Cyberpunk', 'Goth Y2K', 'Tối giản', 'Dễ thương', 'Vintage'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseCard, ReactiveFormsModule, RouterLink],
  selector: 'app-onboarding-modal',
  templateUrl: './onboarding-modal.html',
})
export class OnboardingModal {
  private readonly formBuilder = inject(FormBuilder);
  readonly initialDevice = input('iPhone 15 Pro Max');
  readonly initialStyles = input<string[]>([]);
  readonly closed = output<void>();
  readonly saved = output<ProfileSetupPreferences>();
  protected readonly styleOptions = STYLE_OPTIONS;
  protected readonly templateRows = signal<MarqueeRow[]>([]);
  protected readonly templatesLoading = signal(true);
  protected readonly templatesError = signal<string | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    deviceType: ['iPhone 15 Pro Max', Validators.required],
    styles: this.formBuilder.nonNullable.control<string[]>([]),
  });

  private readonly inputsEffect = effect(() => {
    this.form.patchValue({
      deviceType: this.initialDevice(),
      styles: this.initialStyles(),
    });
  });

  constructor() {
    void import('../../../design-studio/components/template-browser/template-browser')
      .then(({ TEMPLATE_CATALOG }) => {
        this.templateRows.set(createMarqueeRows(TEMPLATE_CATALOG));
        this.templatesLoading.set(false);
      })
      .catch((error: unknown) => {
        this.templatesError.set(
          error instanceof Error ? error.message : 'Không thể tải mẫu thiết kế.',
        );
        this.templatesLoading.set(false);
      });
  }

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
