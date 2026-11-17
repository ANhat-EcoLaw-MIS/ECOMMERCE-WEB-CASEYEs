import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { StudioState } from '../../../design-studio/services/studio-state';
import type { SavedDesignItem } from '../../../design-studio/services/studio-state';
import type { CanvasLayer, TextElement } from '../../../design-studio/models/canvas-element.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-designs-tab',
  templateUrl: './designs-tab.html',
})
export class DesignsTab {
  private readonly state = inject(StudioState);
  private readonly router = inject(Router);
  protected readonly savedDesigns = this.state.savedDesigns;

  protected layerUrl(layer: CanvasLayer): string | null {
    if (layer.type === 'image' || layer.type === 'sticker') return layer.type === 'image' ? layer.storageUrl : layer.assetUrl;
    return null;
  }

  protected layerTransform(layer: CanvasLayer): string {
    const flipX = layer.flipH ? ' scaleX(-1)' : '';
    const flipY = layer.flipV ? ' scaleY(-1)' : '';
    return `translate(-50%, -50%) rotate(${layer.rotation}deg)${flipX}${flipY}`;
  }

  protected async continueDesign(design: SavedDesignItem): Promise<void> {
    this.state.restoreSavedDesign(design);
    await this.router.navigate(['/design-studio/editor']);
  }

  protected textLayer(layer: CanvasLayer): TextElement | null {
    return layer.type === 'text' ? layer : null;
  }
}
