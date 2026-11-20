import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { StudioState } from '../../../design-studio/services/studio-state';
import type { SavedDesignItem } from '../../../design-studio/services/studio-state';
import { SavedDesignPreview } from './saved-design-preview';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-designs-tab',
  imports: [SavedDesignPreview],
  templateUrl: './designs-tab.html',
})
export class DesignsTab {
  private readonly state = inject(StudioState);
  private readonly router = inject(Router);
  protected readonly savedDesigns = this.state.savedDesigns;

  protected async continueDesign(design: SavedDesignItem): Promise<void> {
    this.state.restoreSavedDesign(design);
    await this.router.navigate(['/design-studio/editor']);
  }
}
