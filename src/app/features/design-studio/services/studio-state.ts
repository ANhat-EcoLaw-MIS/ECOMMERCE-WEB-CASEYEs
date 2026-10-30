import { Injectable, computed, inject, signal } from '@angular/core';
import { CanvasLayer, TextElement } from '../models/canvas-element.model';
import { DesignStatus } from '../models/studio-state.model';
import { StudioCatalogService } from './studio-catalog';

@Injectable({ providedIn: 'root' })
export class StudioState {
  private readonly catalog = inject(StudioCatalogService);

  // Model & SKU bindings from Catalog
  readonly selectedModel = this.catalog.selectedModel;
  readonly selectedSku = this.catalog.selectedSku;
  readonly allBrands = this.catalog.brands;
  readonly allModels = this.catalog.models;

  // Navigation tab state ('templates' | 'editor')
  readonly activeTab = signal<'templates' | 'editor'>('templates');

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

  // Design Status (DRAFT, SAVED, REJECTED, DISABLED)
  readonly designStatus = signal<DesignStatus>('DRAFT');

  // Model change confirmation modal state (FR-DES-02 / US-DES-08)
  readonly isModelChangeModalOpen = signal<boolean>(false);
  readonly pendingModelId = signal<string | null>(null);

  // Dynamic pricing
  readonly totalPrice = computed(() => {
    const basePrice = this.selectedSku()?.price ?? 250000;
    // Add 20k if custom text/stickers exceed 3 layers
    const addOn = this._layers().length > 3 ? 20000 : 0;
    return basePrice + addOn;
  });

  readonly hasLayers = computed(() => this._layers().length > 0);

  // --- Layer Management ---
  setLayers(layers: CanvasLayer[]): void {
    this.recordHistory();
    this._layers.set(layers);
  }

  addText(content: string = 'Văn bản của bạn'): TextElement {
    this.recordHistory();
    const newText: TextElement = {
      id: crypto.randomUUID(),
      type: 'text',
      zIndex: this._layers().length + 1,
      content,
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 24,
      textColor: '#0A0A0A',
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
    return newText;
  }

  updateLayer(id: string, partial: Partial<CanvasLayer>): void {
    this.recordHistory();
    this._layers.update((layers) =>
      layers.map((l) => (l.id === id ? ({ ...l, ...partial } as CanvasLayer) : l))
    );
  }

  removeLayer(id: string): void {
    this.recordHistory();
    this._layers.update((layers) => layers.filter((l) => l.id !== id));
    if (this.selectedLayerId() === id) {
      this.selectedLayerId.set(null);
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

  // --- History (Undo / Redo) ---
  private recordHistory(): void {
    this._undoStack.update((stack) => [...stack, this._layers()]);
    this._redoStack.set([]); // clear redo stack on new action
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

  // --- Model Switching with Safety Warning (FR-DES-02 / US-DES-08) ---
  requestModelChange(modelId: string): void {
    if (modelId === this.selectedModel().id) return;

    if (this.hasLayers()) {
      // Prompt warning dialog
      this.pendingModelId.set(modelId);
      this.isModelChangeModalOpen.set(true);
    } else {
      // Switch immediately
      this.catalog.selectModel(modelId);
    }
  }

  confirmModelChange(): void {
    const targetId = this.pendingModelId();
    if (targetId) {
      this.catalog.selectModel(targetId);
      // Auto rescale layers slightly or keep them
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
}
