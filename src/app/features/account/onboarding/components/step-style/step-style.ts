import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { StyleKey, StylePreset } from '../../models/onboarding.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-step-style',
  templateUrl: './step-style.html',
  styleUrl: './step-style.scss',
})
export class StepStyle {
  readonly presets = input.required<readonly StylePreset[]>();
  readonly selectedStyle = input<StyleKey | null>(null);
  readonly busy = input(false);
  readonly styleSelected = output<StyleKey>();

  protected selectStyle(key: StyleKey): void {
    this.styleSelected.emit(key);
  }
}
