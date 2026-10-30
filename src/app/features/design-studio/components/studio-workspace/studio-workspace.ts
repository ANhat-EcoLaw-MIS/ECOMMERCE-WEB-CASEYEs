import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PhoneCaseMock } from '../../../../shared/ui/phone-case-mock/phone-case-mock';
import { StudioState } from '../../services/studio-state';

@Component({
  selector: 'app-studio-workspace',
  standalone: true,
  imports: [PhoneCaseMock],
  templateUrl: './studio-workspace.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioWorkspace {
  protected readonly state = inject(StudioState);

  protected onAddSampleText(): void {
    this.state.addText('Thiết kế của bạn');
  }

  protected onUndo(): void {
    this.state.undo();
  }

  protected onRedo(): void {
    this.state.redo();
  }

  protected onClear(): void {
    this.state.clearCanvas();
  }
}
