import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  selector: 'app-step-creator-name',
  templateUrl: './step-creator-name.html',
  styleUrl: './step-creator-name.scss',
})
export class StepCreatorName {
  readonly creatorNameControl = input.required<FormControl<string>>();
  readonly initials = input.required<string>();
  readonly busy = input(false);
}
