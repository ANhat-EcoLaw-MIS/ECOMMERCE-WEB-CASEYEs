import { CanvasLayer } from './canvas-element.model';

export type DesignStatus = 'DRAFT' | 'SAVED' | 'REJECTED' | 'DISABLED';

export interface DesignDraft {
  readonly draftId: string;
  readonly sessionId: string;
  readonly userId?: string;
  readonly phoneModelId: string;
  readonly skuId: string;
  readonly canvasSnapshotJson: string;
  readonly savedAt: string;
}

export interface StudioHistoryState {
  readonly layers: readonly CanvasLayer[];
  readonly selectedColor: string;
}

export interface ActiveToolSelection {
  readonly tool: 'none' | 'templates' | 'text' | 'stickers' | 'upload' | 'layers' | 'model';
}
