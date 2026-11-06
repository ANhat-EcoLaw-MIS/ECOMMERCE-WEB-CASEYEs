import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { OnboardingStep } from '../../models/onboarding.model';

interface StepItem {
  step: OnboardingStep;
  label: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-onboarding-stepper',
  templateUrl: './onboarding-stepper.html',
  styleUrl: './onboarding-stepper.scss',
})
export class OnboardingStepper {
  readonly currentStep = input.required<OnboardingStep>();
  readonly disabled = input(false);
  readonly stepSelected = output<OnboardingStep>();

  protected readonly steps: readonly StepItem[] = [
    { step: 1, label: 'Tên Creator' },
    { step: 2, label: 'Chọn Dòng Máy' },
    { step: 3, label: 'Gu Thẩm Mỹ' },
  ];

  protected select(step: OnboardingStep): void {
    this.stepSelected.emit(step);
  }
}
