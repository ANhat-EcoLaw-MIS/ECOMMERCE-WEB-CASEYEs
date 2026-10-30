import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ModelSelector } from './components/model-selector/model-selector';
import { StudioState } from './services/studio-state';

@Component({
  selector: 'app-design-studio',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ModelSelector],
  templateUrl: './design-studio.html',
  styleUrl: './design-studio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignStudio {
  protected readonly state = inject(StudioState);

  protected onConfirmModelChange(): void {
    this.state.confirmModelChange();
  }

  protected onCancelModelChange(): void {
    this.state.cancelModelChange();
  }
}
