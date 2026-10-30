import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CanvasLayer,
  ImageElement,
  StickerElement,
  TextElement,
} from '../models/canvas-element.model';
import { ContentPolicyConsent } from '../models/policy-consent.model';
import { DesignStatus } from '../models/studio-state.model';
import { StudioCatalogService } from './studio-catalog';

export const BANNED_KEYWORDS = [
  'nike',
  'adidas',
  'gucci',
  'chanel',
  'louis vuitton',
  'disney',
  'giết',
  'khủng bố',
  'cấm-demo',
];

export const STICKERS_LIST = [
  '❤️', '⭐', '🌸', '😊', '🌈', '🦋', '🍓', '✨',
  '🐶', '🌙', '🍀', '🔥', '🎀', '🌻', '☁️', '💫',
  '⚡', '🥑', '🍒', '🎨', '🪐', '🦄', '🎉', '☕'
];

export const BG_PRESETS = [
  '#FFFFFF',
  '#F6F3FE',
  '#ECE6FD',
  '#D4C8FA',
  '#A58CF4',
  '#433075',
  '#2A1D4D',
  '#0A0A0A',
  'linear-gradient(135deg, #433075 0%, #A58CF4 100%)',
  'linear-gradient(180deg, #FAFAFA 0%, #ece6fd 100%)',
  'linear-gradient(160deg, #ffd1a8 0%, #ff7e8b 100%)',
  'linear-gradient(180deg, #8fd3ff 0%, #ffe3b8 100%)',
  'linear-gradient(160deg, #b9e4f5 0%, #7fc29b 100%)',
  'linear-gradient(180deg, #141a3d 0%, #5b4b9a 100%)',
];

@Injectable({ providedIn: 'root' })
export class StudioState {
  private readonly catalog = inject(StudioCatalogService);

  // Model & SKU bindings from Catalog
  readonly selectedModel = this.catalog.selectedModel;
  readonly selectedSku = this.catalog.selectedSku;
  readonly allBrands = this.catalog.brands;
  readonly allModels = this.catalog.models;

  // Metadata
  readonly designName = signal<string>('Thiết kế chưa đặt tên');
  readonly designStatus = signal<DesignStatus>('DRAFT');
  readonly rejectionMessage = signal<string>(
    'Bản thiết kế này từng bị từ chối kiểm duyệt do vi phạm tiêu chuẩn nội dung. Vui lòng chỉnh sửa lại các chi tiết vi phạm trước khi tiến hành đặt mua'
  );

  // Active Tool selection ('txt' | 'stk' | 'img' | 'bg' | 'tpl')
  readonly activeTool = signal<'txt' | 'stk' | 'img' | 'bg' | 'tpl'>('txt');

  // Background style (solid color or gradient)
  readonly caseBg = signal<string>('linear-gradient(180deg, #FAFAFA 0%, #ece6fd 100%)');

  // Zoom level (50% - 150%)
  readonly zoom = signal<number>(100);

  // Canvas layers
  private readonly _layers = signal<CanvasLayer[]>([]);
  readonly layers = this._layers.asReadonly();

  // Active selection
  readonly selectedLayerId = signal<string | null>(null);
  readonly selectedLayer = computed(() =>
    this._layers().find((layer) => layer.id === this.selectedLayerId()) ?? null
  );

  // Undo / Redo history
  private readonly _undoStack = signal<CanvasLayer[][]>([]);
  private readonly _redoStack = signal<CanvasLayer[][]>([]);
  readonly canUndo = computed(() => this._undoStack().length > 0);
  readonly canRedo = computed(() => this._redoStack().length > 0);

  // Safe Zone violation alerts (EF2)
  readonly safeZoneAlert = signal<boolean>(false);

  // Rule-based Banned keyword error alert (EF3)
  readonly bannedKeywordError = signal<string | null>(null);

  // Modals & Drawers state
  readonly isModelChangeModalOpen = signal<boolean>(false);
  readonly pendingModelId = signal<string | null>(null);
  readonly is3dPreviewOpen = signal<boolean>(false);
  readonly isConsentModalOpen = signal<boolean>(false);
  readonly isLowResModalOpen = signal<boolean>(false);
  readonly isCartDrawerOpen = signal<boolean>(false);

  // Uploaded images gallery
  readonly uploads = signal<{ id: string; name: string; url: string; dpi: number }[]>([]);
  readonly pendingUpload = signal<{ id: string; name: string; url: string; dpi: number; size: number } | null>(null);

  // Pricing calculation
  readonly totalPrice = computed(() => {
    const basePrice = this.selectedSku()?.price ?? 250000;
    const addOn = this._layers().length > 3 ? 20000 : 0;
    return basePrice + addOn;
  });

  readonly hasLayers = computed(() => this._layers().length > 0);

  readonly requiresModeration = computed(() =>
    this._layers().some((l) => l.type === 'image')
  );

  // --- Layer Management ---
  setLayers(layers: CanvasLayer[]): void {
    this.recordHistory();
    this._layers.set(layers);
  }

  addText(content: string = 'Good vibes', font: string = 'Plus Jakarta Sans', color: string = '#0A0A0A', size: number = 24): TextElement | null {
    if (this.checkBanned(content)) {
      return null;
    }

    this.recordHistory();
    const newText: TextElement = {
      id: crypto.randomUUID(),
      type: 'text',
      zIndex: this._layers().length + 1,
      content,
      fontFamily: font,
      fontSize: size,
      textColor: color,
      textAlign: 'center',
      fontWeight: 'bold',
      x: 50,
      y: 50,
      width: 40,
      height: 12,
      rotation: 0,
      opacity: 1,
      isLocked: false,
    };

    this._layers.update((prev) => [...prev, newText]);
    this.selectedLayerId.set(newText.id);
    this.bannedKeywordError.set(null);
    return newText;
  }

  addSticker(emoji: string): StickerElement {
    this.recordHistory();
    const newSticker: StickerElement = {
      id: crypto.randomUUID(),
      type: 'sticker',
      zIndex: this._layers().length + 1,
      stickerId: `stk_${emoji}`,
      category: 'gen-z',
      name: emoji,
      assetUrl: '',
      x: 50,
      y: 50,
      width: 18,
      height: 18,
      rotation: 0,
      opacity: 1,
      isLocked: false,
    };

    this._layers.update((prev) => [...prev, newSticker]);
    this.selectedLayerId.set(newSticker.id);
    return newSticker;
  }

  addImageLayer(url: string, name: string, dpi: number): ImageElement {
    this.recordHistory();
    const newImg: ImageElement = {
      id: crypto.randomUUID(),
      type: 'image',
      zIndex: this._layers().length + 1,
      storageUrl: url,
      fileType: 'image/png',
      fileSizeBytes: 1024 * 500,
      pixelWidth: 400,
      pixelHeight: 400,
      dpi,
      isLowResAcknowledged: dpi < 150,
      x: 50,
      y: 50,
      width: 45,
      height: 45,
      rotation: 0,
      opacity: 1,
      isLocked: false,
    };

    this._layers.update((prev) => [...prev, newImg]);
    this.selectedLayerId.set(newImg.id);
    return newImg;
  }

  updateLayer(id: string, partial: Partial<CanvasLayer>): void {
    if ('content' in partial && typeof (partial as any).content === 'string') {
      if (this.checkBanned((partial as any).content)) return;
    }

    this.recordHistory();
    this._layers.update((layers) =>
      layers.map((l) => (l.id === id ? ({ ...l, ...partial } as CanvasLayer) : l))
    );
  }

  duplicateLayer(id: string): void {
    const target = this._layers().find((l) => l.id === id);
    if (!target) return;

    this.recordHistory();
    const duplicated: CanvasLayer = {
      ...target,
      id: crypto.randomUUID(),
      zIndex: this._layers().length + 1,
      x: Math.min(85, target.x + 5),
      y: Math.min(85, target.y + 5),
    };

    this._layers.update((prev) => [...prev, duplicated]);
    this.selectedLayerId.set(duplicated.id);
  }

  toggleLayerLock(id: string): void {
    this.recordHistory();
    this._layers.update((layers) =>
      layers.map((l) => (l.id === id ? { ...l, isLocked: !l.isLocked } : l))
    );
  }

  removeLayer(id: string): void {
    this.recordHistory();
    this._layers.update((layers) => layers.filter((l) => l.id !== id));
    if (this.selectedLayerId() === id) {
      this.selectedLayerId.set(null);
    }
    // If user deleted the violating image, clear rejection
    if (this.designStatus() === 'REJECTED' && !this.requiresModeration()) {
      this.designStatus.set('DRAFT');
    }
  }

  clearCanvas(): void {
    this.recordHistory();
    this._layers.set([]);
    this.selectedLayerId.set(null);
  }

  selectLayer(id: string | null): void {
    this.selectedLayerId.set(id);
  }

  // --- Safe Zone & Banned Keywords Check ---
  checkBanned(text: string): boolean {
    const lower = text.toLowerCase();
    const hit = BANNED_KEYWORDS.find((w) => lower.includes(w));
    if (hit) {
      this.bannedKeywordError.set(
        `Nội dung chứa từ khóa vi phạm tiêu chuẩn cộng đồng ("${hit}"). Vui lòng chỉnh sửa.`
      );
      return true;
    }
    this.bannedKeywordError.set(null);
    return false;
  }

  triggerSafeZoneAlert(): void {
    this.safeZoneAlert.set(true);
    setTimeout(() => this.safeZoneAlert.set(false), 1200);
  }

  // --- Zoom Controls ---
  zoomIn(): void {
    this.zoom.update((z) => Math.min(150, z + 10));
  }

  zoomOut(): void {
    this.zoom.update((z) => Math.max(60, z - 10));
  }

  resetZoom(): void {
    this.zoom.set(100);
  }

  // --- History (Undo / Redo) ---
  private recordHistory(): void {
    this._undoStack.update((stack) => [...stack, this._layers()]);
    this._redoStack.set([]);
  }

  undo(): void {
    const stack = this._undoStack();
    if (stack.length === 0) return;

    const previous = stack[stack.length - 1];
    this._redoStack.update((redo) => [...redo, this._layers()]);
    this._undoStack.update((s) => s.slice(0, -1));
    this._layers.set(previous);
  }

  redo(): void {
    const stack = this._redoStack();
    if (stack.length === 0) return;

    const next = stack[stack.length - 1];
    this._undoStack.update((undo) => [...undo, this._layers()]);
    this._redoStack.update((s) => s.slice(0, -1));
    this._layers.set(next);
  }

  // --- Model Switching (FR-DES-02 / US-DES-08) ---
  requestModelChange(modelId: string): void {
    if (modelId === this.selectedModel().id) return;

    if (this.hasLayers()) {
      this.pendingModelId.set(modelId);
      this.isModelChangeModalOpen.set(true);
    } else {
      this.catalog.selectModel(modelId);
    }
  }

  confirmModelChange(): void {
    const targetId = this.pendingModelId();
    if (targetId) {
      this.catalog.selectModel(targetId);
      this.pendingModelId.set(null);
    }
    this.isModelChangeModalOpen.set(false);
  }

  cancelModelChange(): void {
    this.pendingModelId.set(null);
    this.isModelChangeModalOpen.set(false);
  }

  selectSku(skuId: string): void {
    this.catalog.selectSku(skuId);
  }

  // --- Consent & Auditing (FR-DES-24, 25) ---
  recordConsent(imageId: string): ContentPolicyConsent {
    const consent: ContentPolicyConsent = {
      consentId: 'cns_' + crypto.randomUUID().slice(0, 8),
      userSessionId: 'sess_' + crypto.randomUUID().slice(0, 8),
      uploadedImageId: imageId,
      policyVersion: 'v1.0',
      acceptedAtUtc: new Date().toISOString(),
    };
    return consent;
  }
}
