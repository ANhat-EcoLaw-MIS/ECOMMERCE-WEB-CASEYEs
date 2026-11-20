import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { StylePreset } from '../../models/onboarding.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-onboarding-preview',
  templateUrl: './onboarding-preview.html',
  styleUrl: './onboarding-preview.scss',
})
export class OnboardingPreview {
  readonly displayName = input.required<string>();
  readonly initials = input.required<string>();
  readonly deviceLabel = input.required<string>();
  readonly preset = input.required<StylePreset>();
  protected readonly year = new Date().getFullYear();
}
