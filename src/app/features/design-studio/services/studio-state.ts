import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  CanvasLayer,
  ImageElement,
  StickerElement,
  TextElement,
} from '../models/canvas-element.model';
import { ContentPolicyConsent } from '../models/policy-consent.model';
import { DesignStatus } from '../models/studio-state.model';
import { CaseMaterial } from '../models/studio-domain.model';
import { StudioCatalogService } from './studio-catalog';
import { buildTemplateLayers } from '../constants/template-artworks';

export const UNIFIED_STUDIO_PRICE = 250000;

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

export interface StudioStickerItem {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly category: string;
}

export const STICKERS_LIST: StudioStickerItem[] = [
  // 6 Primary AI Cutout Elements từ kho caseye-ai-elements-only
  { id: 'cloud-kittens', name: 'Mèo Mây Bồng Bềnh', url: '/assets/stickers/tpl-cloud-kittens-element.png', category: 'cute' },
  { id: 'matcha-corgi', name: 'Cún Corgi Trà Sữa', url: '/assets/stickers/tpl-matcha-corgi-element.png', category: 'cute' },
  { id: 'chrome-heart', name: 'Trái Tim Tráng Gương Y2K', url: '/assets/stickers/tpl-y2k-chrome-heart-element.png', category: 'y2k' },
  { id: 'holo-butterfly', name: 'Bướm Hologram Vũ Trụ', url: '/assets/stickers/tpl-holo-butterfly-element.png', category: 'y2k' },
  { id: 'retro-arcade', name: 'Máy Game Arcade 1998', url: '/assets/stickers/tpl-retro-arcade-element.png', category: 'creative' },
  { id: 'botanical-garden', name: 'Vườn Thực Vật Lavender', url: '/assets/stickers/tpl-botanical-garden-element.png', category: 'creative' },

  // Các Element AI Nghệ Thuật bổ sung
  { id: 'baby-dino', name: 'Khủng Long Dã Ngoại', url: '/assets/stickers/tpl-baby-dino-element.png', category: 'cute' },
  { id: 'tokyo-sakura', name: 'Cành Đào Tokyo Night', url: '/assets/stickers/tpl-tokyo-sakura-element.png', category: 'creative' },
  { id: 'fuji-sunset', name: 'Núi Phú Sĩ Hoàng Hôn', url: '/assets/stickers/tpl-fuji-sunset-element.png', category: 'creative' },
  { id: 'good-vibes', name: 'Manifesting Good Vibes', url: '/assets/stickers/tpl-good-vibes-element.png', category: 'y2k' },
  { id: 'lucky-clover', name: 'Cỏ Bốn Lá May Mắn', url: '/assets/stickers/tpl-lucky-clover-element.png', category: 'creative' },
  { id: 'amethyst-waves', name: 'Sóng Pha Lê Thạch Anh', url: '/assets/stickers/tpl-amethyst-waves-element.png', category: 'creative' },
  { id: 'aura-gradient', name: 'Vòng Năng Lượng Aura', url: '/assets/stickers/tpl-aura-gradient-element.png', category: 'y2k' },
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

const SAVED_DESIGNS_KEY = 'caseyes_saved_designs_v3';

function loadInitialSavedDesigns(): SavedDesignItem[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(SAVED_DESIGNS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [
    {
      id: 'saved_sample_1',
      name: 'Dreamy Sky Vibes',
      modelId: 'iphone-15-pro-max',
      modelName: 'iPhone 15 Pro Max',
      material: 'standard',
      bg: 'linear-gradient(160deg, #c4b5fd 0%, #93c5fd 50%, #fbcfe8 100%)',
      layerCount: 2,
      layers: buildTemplateLayers('dreamy-kitten'),
      savedAt: 'Chỉnh sửa lần cuối: 2h trước',
      thumbnailText: 'Dreamy Sky',
      thumbnailType: 'dreamy-sky',
    },
    {
      id: 'saved_sample_2',
      name: 'Sakura Bloom',
      modelId: 'iphone-15-pro',
      modelName: 'iPhone 15 Pro',
      material: 'standard',
      bg: 'linear-gradient(160deg, #fce7f3 0%, #fbcfe8 50%, #fda4af 100%)',
      layerCount: 1,
      layers: buildTemplateLayers('sakura-bloom'),
      savedAt: 'Chỉnh sửa lần cuối: 1 ngày trước',
      thumbnailText: 'Sakura Bloom',
      thumbnailType: 'sakura',
    },
    {
      id: 'saved_sample_3',
      name: 'Minimal Cat',
      modelId: 'iphone-15-pro',
      modelName: 'iPhone 15 Pro',
      material: 'standard',
      bg: '#FAF8F5',
      layerCount: 1,
      layers: buildTemplateLayers('minimal-cat'),
      savedAt: 'Chỉnh sửa lần cuối: 3 ngày trước',
      thumbnailText: 'Minimal Cat',
      thumbnailType: 'cat',
    },
    {
      id: 'saved_sample_4',
      name: 'Mountain Escape',
      modelId: 'iphone-15',
      modelName: 'iPhone 15',
      material: 'standard',
      bg: 'linear-gradient(160deg, #dbeafe 0%, #60a5fa 50%, #1e3a8a 100%)',
      layerCount: 1,
      layers: buildTemplateLayers('mountain-escape'),
      savedAt: 'Chỉnh sửa lần cuối: 4 ngày trước',
      thumbnailText: 'Mountain Peak',
      thumbnailType: 'mountain',
    },
    {
      id: 'saved_sample_5',
      name: 'Starry Night Cosmos',
      modelId: 'iphone-15-plus',
      modelName: 'iPhone 15 Plus',
      material: 'standard',
      bg: 'linear-gradient(160deg, #1e1b4b 0%, #4338ca 50%, #a855f7 100%)',
      layerCount: 2,
      layers: buildTemplateLayers('starry-night'),
      savedAt: 'Chỉnh sửa lần cuối: 5 ngày trước',
      thumbnailText: 'Starry Night',
      thumbnailType: 'starry',
    },
  ];
}

export interface SavedDesignItem {
  readonly id: string;
  readonly name: string;
  readonly modelId: string;
  readonly modelName: string;
  readonly material: CaseMaterial;
  readonly bg: string;
  readonly layerCount: number;
  readonly layers: CanvasLayer[];
  readonly savedAt: string;
  readonly thumbnailText?: string;
  readonly thumbnailType?: 'dreamy-sky' | 'sakura' | 'cat' | 'mountain' | 'starry' | 'custom';
}

@Injectable({ providedIn: 'root' })
export class StudioState {
  private readonly catalog = inject(StudioCatalogService);

  // Model & SKU bindings from Catalog
  readonly selectedModel = this.catalog.selectedModel;
  readonly selectedSku = this.catalog.selectedSku;
  readonly allBrands = this.catalog.brands;
  readonly allModels = this.catalog.models;

  // Single Standard Material (Simplified per team decision)
  readonly selectedMaterial = signal<CaseMaterial>('standard');

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

  // Auto-save & My Designs persistence
  readonly lastSavedTime = signal<string | null>(null);
  readonly isFirstSave = signal<boolean>(true);
  readonly savedDesigns = signal<SavedDesignItem[]>(loadInitialSavedDesigns());

  constructor() {
    effect(() => {
      const items = this.savedDesigns();
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(SAVED_DESIGNS_KEY, JSON.stringify(items));
        } catch {}
      }
    });
  }

  // Uploaded images gallery
  readonly uploads = signal<{ id: string; name: string; url: string; dpi: number }[]>([]);
  readonly pendingUpload = signal<{ id: string; name: string; url: string; dpi: number; size: number } | null>(null);

  // Simplified Unified Pricing: All customized phone cases share one standard price (250.000đ)
  readonly totalPrice = computed(() => UNIFIED_STUDIO_PRICE);

  readonly hasLayers = computed(() => this._layers().length > 0);

  readonly requiresModeration = computed(() =>
    this._layers().some((l) => l.type === 'image')
  );

  // --- Material Management ---
  selectMaterial(material: CaseMaterial): void {
    this.selectedMaterial.set(material);
  }

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
    // Calculate initial box width so new text comfortably fits on one line
    const calcWidth = Math.max(50, Math.min(95, Math.round(((content.length * (size * 0.68) + 30) / 300) * 100)));
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
      width: calcWidth,
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

  addSticker(item: StudioStickerItem | string): StickerElement {
    this.recordHistory();
    const isObj = typeof item !== 'string';
    const name = isObj ? item.name : item;
    const found = STICKERS_LIST.find((s) => s.id === item || s.name === item);
    const url = isObj ? item.url : (found?.url || '');
    const stickerId = isObj ? `stk_${item.id}` : (found ? `stk_${found.id}` : `stk_${item}`);
    const category = isObj ? item.category : (found?.category || 'gen-z');

    const newSticker: StickerElement = {
      id: crypto.randomUUID(),
      type: 'sticker',
      zIndex: this._layers().length + 1,
      stickerId,
      category,
      name,
      assetUrl: url,
      x: 50,
      y: 50,
      width: 25,
      height: 25,
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
      y: 55,
      width: 65,
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

  moveLayerUp(id: string): void {
    const layers = this._layers();
    const index = layers.findIndex((l) => l.id === id);
    if (index < 0 || index >= layers.length - 1) return;

    this.recordHistory();
    const nextLayers = [...layers];
    const temp = nextLayers[index];
    nextLayers[index] = nextLayers[index + 1];
    nextLayers[index + 1] = temp;
    const reindexed = nextLayers.map((l, idx) => ({ ...l, zIndex: idx + 1 } as CanvasLayer));
    this._layers.set(reindexed);
  }

  moveLayerDown(id: string): void {
    const layers = this._layers();
    const index = layers.findIndex((l) => l.id === id);
    if (index <= 0) return;

    this.recordHistory();
    const nextLayers = [...layers];
    const temp = nextLayers[index];
    nextLayers[index] = nextLayers[index - 1];
    nextLayers[index - 1] = temp;
    const reindexed = nextLayers.map((l, idx) => ({ ...l, zIndex: idx + 1 } as CanvasLayer));
    this._layers.set(reindexed);
  }

  reorderLayers(fromIndex: number, toIndex: number): void {
    const layers = this._layers();
    if (
      fromIndex < 0 ||
      fromIndex >= layers.length ||
      toIndex < 0 ||
      toIndex >= layers.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    this.recordHistory();
    const nextLayers = [...layers];
    const [moved] = nextLayers.splice(fromIndex, 1);
    nextLayers.splice(toIndex, 0, moved);
    const reindexed = nextLayers.map((l, idx) => ({ ...l, zIndex: idx + 1 } as CanvasLayer));
    this._layers.set(reindexed);
  }

  removeLayer(id: string): void {
    this.recordHistory();
    this._layers.update((layers) => layers.filter((l) => l.id !== id));
    if (this.selectedLayerId() === id) {
      this.selectedLayerId.set(null);
    }
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
