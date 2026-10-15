import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './input.html'
})
export class Input {
  label = input<string>('');
  placeholder = input<string>('');
  type = input<string>('text');
  error = input<string>('');
  helperText = input<string>('');
  disabled = input<boolean>(false);

  // Generates a unique ID so the <label> can securely target the <input> for screen readers
  inputId = computed(() => `input-${Math.random().toString(36).substring(2, 9)}`);
}
