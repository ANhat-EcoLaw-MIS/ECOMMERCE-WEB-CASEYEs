import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { StudioState } from '../../../design-studio/services/studio-state';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-designs-tab',
  templateUrl: './designs-tab.html',
})
export class DesignsTab {
  private readonly state = inject(StudioState);
  protected readonly savedDesigns = this.state.savedDesigns;
}
