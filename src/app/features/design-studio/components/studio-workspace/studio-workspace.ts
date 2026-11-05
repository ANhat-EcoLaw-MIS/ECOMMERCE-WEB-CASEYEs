import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CanvasLayer } from '../../models/canvas-element.model';
import {
  BANNED_KEYWORDS,
  BG_PRESETS,
  SavedDesignItem,
  STICKERS_LIST,
  StudioState,
} from '../../services/studio-state';
import { StudioDraft } from '../../services/studio-draft';

@Component({
  selector: 'app-studio-workspace',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './studio-workspace.html',
  styleUrl: './studio-workspace.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioWorkspace implements OnDestroy {
  protected readonly state = inject(StudioState);
  protected readonly draft = inject(StudioDraft);
  protected readonly stickers = STICKERS_LIST;
  protected readonly bgPresets = BG_PRESETS;

  // Text inputs
  protected readonly textInput = signal<string>('Good vibes');
  protected readonly selectedFont = signal<string>('Plus Jakarta Sans');
  protected readonly selectedColor = signal<string>('#433075');
  protected readonly isTextBold = signal<boolean>(true);
  protected readonly isTextItalic = signal<boolean>(false);
  protected readonly bannedInputError = signal<string | null>(null);

  // File Upload & DPI calculation
  protected readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly isFileDragging = signal<boolean>(false);
  protected readonly consentChecked = signal<boolean>(false);
  protected readonly consentError = signal<boolean>(false);

  // Toast Notification for Cart and Save (Bug 7)
  protected readonly cartToast = signal<string | null>(null);

  // Modals for First Save Naming & Guest Login (Issue 13 & 14)
  protected readonly showNamingModal = signal<boolean>(false);
  protected readonly namingInput = signal<string>('');
  protected readonly showAuthModal = signal<boolean>(false);

  // 3D Preview
  protected readonly is3dSupported = signal<boolean>(true);
  protected readonly orbitRx = signal<number>(-10);
  protected readonly orbitRy = signal<number>(-25);
  protected readonly orbitZoom = signal<number>(1);
  private isOrbitDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // Auto-save interval handle (Issue 14)
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  // Canvas Viewport Dragging state
  private activeDrag: {
    id: string;
    mode: 'move' | 'resize' | 'rotate';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialRotation: number;
  } | null = null;

  // Camera cutout geometry for active model
  protected readonly cameraCutout = computed(() => {
    return this.state.selectedModel().safeZoneMask.cameraCutout;
  });

  // Fonts list
  protected readonly fonts = [
    'Plus Jakarta Sans',
    'Inter',
    'Playfair Display',
    'Courier New',
    'Brush Script MT',
  ];

  ngOnDestroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // --- Tool Switching ---
  protected selectTool(tool: 'txt' | 'stk' | 'img' | 'bg' | 'tpl'): void {
    this.state.activeTool.set(tool);
  }

  // --- Real-time Banned Keyword Validation (Issue 5) ---
  protected onTextInputChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.textInput.set(val);
    const hit = BANNED_KEYWORDS.find((w) => val.toLowerCase().includes(w));
    if (hit) {
      this.bannedInputError.set(
        `Nội dung chứa từ khóa vi phạm tiêu chuẩn cộng đồng ("${hit}"). Vui lòng chỉnh sửa.`
      );
    } else {
      this.bannedInputError.set(null);
    }
  }

  // --- Text Operations ---
  protected onApplyText(): void {
    const text = this.textInput().trim();
    if (!text || this.bannedInputError()) return;

    if (this.state.selectedLayer()?.type === 'text') {
      this.state.updateLayer(this.state.selectedLayer()!.id, {
        content: text,
        fontFamily: this.selectedFont(),
        textColor: this.selectedColor(),
      });
    } else {
      this.state.addText(text, this.selectedFont(), this.selectedColor(), 24);
    }
  }

  protected applyPresetText(content: string, size: number, bold: boolean): void {
    this.isTextBold.set(bold);
    this.state.addText(content, this.selectedFont(), this.selectedColor(), size);
  }

  // --- Save & Naming Flow (Issue 13 & 14) ---
  protected onSaveDesign(): void {
    if (!this.state.hasLayers()) {
      alert('Canvas đang trống: hãy thêm ít nhất một phần tử trước khi lưu.');
      return;
    }

    this.saveToGuestLocalStorage();

    if (this.state.isFirstSave()) {
      this.namingInput.set(
        this.state.designName() === 'Thiết kế chưa đặt tên'
          ? `Ốp lưng ${this.state.selectedModel().name}`
          : this.state.designName()
      );
      this.showNamingModal.set(true);
    } else {
      this.performSave();
    }
  }

  protected confirmNaming(): void {
    const name = this.namingInput().trim();
    if (name) {
      this.state.designName.set(name);
    }
    this.state.isFirstSave.set(false);
    this.showNamingModal.set(false);
    this.performSave();
    this.startAutoSaveTimer();
  }

  protected closeNamingModal(): void {
    this.showNamingModal.set(false);
  }

  private performSave(): void {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    this.state.lastSavedTime.set(timeStr);
    this.state.designStatus.set('SAVED');

    const currentName = this.state.designName();
    const model = this.state.selectedModel();
    const existingIndex = this.state.savedDesigns().findIndex((d) => d.name === currentName);

    const newDesign: SavedDesignItem = {
      id: 'saved_' + Date.now(),
      name: currentName,
      modelId: model.id,
      modelName: model.name,
      material: this.state.selectedMaterial(),
      bg: this.state.caseBg(),
      layerCount: this.state.layers().length,
      layers: [...this.state.layers()],
      savedAt: `Hôm nay lúc ${timeStr}`,
      thumbnailText:
        this.state.layers().find((l) => l.type === 'text')?.['content'] || currentName,
    };

    if (existingIndex >= 0) {
      this.state.savedDesigns.update((list) => {
        const copy = [...list];
        copy[existingIndex] = newDesign;
        return copy;
      });
    } else {
      this.state.savedDesigns.update((list) => [newDesign, ...list]);
    }

    this.cartToast.set(`✓ Đã lưu thiết kế "${currentName}" thành công!`);
    setTimeout(() => this.cartToast.set(null), 3500);
  }

  private startAutoSaveTimer(): void {
    if (this.autoSaveTimer) return;
    this.autoSaveTimer = setInterval(() => {
      if (this.state.hasLayers() && !this.state.isFirstSave()) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        this.state.lastSavedTime.set(timeStr);
        this.saveToGuestLocalStorage();
      }
    }, 60000);
  }

  private saveToGuestLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    const draftData = {
      modelId: this.state.selectedModel().id,
      material: this.state.selectedMaterial(),
      bg: this.state.caseBg(),
      designName: this.state.designName(),
      layers: this.state.layers(),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('caseyes_guest_draft', JSON.stringify(draftData));
  }

  // --- Add to Cart (Bug 7 Resolved: No Auto Drawer Popup) ---
  protected onAddToCart(): void {
    if (this.state.designStatus() === 'REJECTED') {
      alert(
        'Bản thiết kế này đang ở trạng thái từ chối do vi phạm tiêu chuẩn nội dung. Vui lòng chỉnh sửa các chi tiết vi phạm trước khi đặt mua.'
      );
      return;
    }
    if (!this.state.hasLayers()) {
      alert('Canvas đang trống: hãy thêm ít nhất một phần tử trước khi thêm vào giỏ.');
      return;
    }

    this.saveToGuestLocalStorage();

    // Show sleek toast instead of popping open a full drawer
    this.cartToast.set('✓ Đã thêm thiết kế vào giỏ hàng thành công!');
    setTimeout(() => {
      this.cartToast.set(null);
    }, 4500);
  }

  protected dismissToast(): void {
    this.cartToast.set(null);
  }

  // --- Layer Reordering (Bug 6) ---
  protected onMoveLayerUp(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.state.moveLayerUp(id);
  }

  protected onMoveLayerDown(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.state.moveLayerDown(id);
  }

  // --- Sticker & Background ---
  protected onAddSticker(emoji: string): void {
    this.state.addSticker(emoji);
  }

  protected onSelectBg(bg: string): void {
    this.state.caseBg.set(bg);
  }

  // --- File Upload & Policy Validation ---
  protected triggerFileUpload(): void {
    this.fileInputRef()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      this.processFile(file);
    }
  }

  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isFileDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isFileDragging.set(true);
  }

  protected onDragLeave(): void {
    this.isFileDragging.set(false);
  }

  private processFile(file: File): void {
    const validTypes = ['image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
      alert('Hệ thống chỉ hỗ trợ định dạng PNG, JPG và dung lượng tối đa 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const printWidthMm = this.state.selectedModel().printWidthMm || 71.5;
        const dpi = Math.round(img.naturalWidth / (printWidthMm / 25.4));
        const uploadObj = {
          id: 'img_' + crypto.randomUUID().slice(0, 8),
          name: file.name,
          url: reader.result as string,
          dpi,
          size: file.size,
        };

        this.state.pendingUpload.set(uploadObj);

        if (dpi < 150) {
          this.state.isLowResModalOpen.set(true);
        } else {
          this.state.isConsentModalOpen.set(true);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  protected continueLowRes(): void {
    this.state.isLowResModalOpen.set(false);
    this.state.isConsentModalOpen.set(true);
  }

  protected cancelUpload(): void {
    this.state.isLowResModalOpen.set(false);
    this.state.isConsentModalOpen.set(false);
    this.state.pendingUpload.set(null);
    this.consentChecked.set(false);
    this.consentError.set(false);
  }

  protected confirmConsent(): void {
    if (!this.consentChecked()) {
      this.consentError.set(true);
      return;
    }

    const upload = this.state.pendingUpload();
    if (upload) {
      this.state.recordConsent(upload.id);
      this.state.uploads.update((list) => [upload, ...list]);
      this.state.addImageLayer(upload.url, upload.name, upload.dpi);
    }

    this.cancelUpload();
  }

  protected reuseImage(url: string, name: string, dpi: number): void {
    this.state.addImageLayer(url, name, dpi);
  }

  // --- Canvas Element Interactions (Drag, Select, Clamp) ---
  protected onElementPointerDown(event: PointerEvent, layerId: string): void {
    event.stopPropagation();
    this.state.selectLayer(layerId);
    const layer = this.state.layers().find((l) => l.id === layerId);
    if (!layer || layer.isLocked) return;

    this.activeDrag = {
      id: layerId,
      mode: 'move',
      startX: event.clientX,
      startY: event.clientY,
      initialX: layer.x,
      initialY: layer.y,
      initialWidth: layer.width,
      initialHeight: layer.height,
      initialRotation: layer.rotation,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onResizeHandlePointerDown(event: PointerEvent, layerId: string): void {
    event.stopPropagation();
    const layer = this.state.layers().find((l) => l.id === layerId);
    if (!layer || layer.isLocked) return;

    this.activeDrag = {
      id: layerId,
      mode: 'resize',
      startX: event.clientX,
      startY: event.clientY,
      initialX: layer.x,
      initialY: layer.y,
      initialWidth: layer.width,
      initialHeight: layer.height,
      initialRotation: layer.rotation,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onRotateHandlePointerDown(event: PointerEvent, layerId: string): void {
    event.stopPropagation();
    const layer = this.state.layers().find((l) => l.id === layerId);
    if (!layer || layer.isLocked) return;

    this.activeDrag = {
      id: layerId,
      mode: 'rotate',
      startX: event.clientX,
      startY: event.clientY,
      initialX: layer.x,
      initialY: layer.y,
      initialWidth: layer.width,
      initialHeight: layer.height,
      initialRotation: layer.rotation,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onCanvasPointerMove(event: PointerEvent): void {
    if (!this.activeDrag) return;
    const { id, mode, startX, startY, initialX, initialY, initialWidth, initialRotation } =
      this.activeDrag;

    const deltaX = ((event.clientX - startX) / 300) * 100;
    const deltaY = ((event.clientY - startY) / 620) * 100;

    if (mode === 'move') {
      const newX = Math.max(10, Math.min(90, initialX + deltaX));
      const newY = Math.max(10, Math.min(90, initialY + deltaY));

      const cam = this.cameraCutout();
      const inCameraArea =
        newX < cam.xPercent + cam.widthPercent &&
        newX > cam.xPercent &&
        newY < cam.yPercent + cam.heightPercent &&
        newY > cam.yPercent;

      if (inCameraArea) {
        this.state.triggerSafeZoneAlert();
      }

      this.state.updateLayer(id, { x: Math.round(newX), y: Math.round(newY) });
    } else if (mode === 'resize') {
      const scaleDelta = (event.clientX - startX) / 2;
      const newWidth = Math.max(15, Math.min(90, initialWidth + scaleDelta));
      this.state.updateLayer(id, { width: Math.round(newWidth) });
    } else if (mode === 'rotate') {
      const angle = (event.clientX - startX) * 1.5;
      this.state.updateLayer(id, { rotation: Math.round((initialRotation + angle) % 360) });
    }
  }

  protected onCanvasPointerUp(): void {
    this.activeDrag = null;
  }

  // Bug 1 Fix: Only deselect when clicking on the true empty canvas backdrop
  protected onStageClick(event?: MouseEvent): void {
    if (event && event.target !== event.currentTarget) {
      return;
    }
    this.state.selectLayer(null);
  }

  // Issue 10: Touchpad pinch-to-zoom
  protected onStageWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const zoomDelta = event.deltaY < 0 ? 5 : -5;
      this.state.zoom.update((z) => Math.min(160, Math.max(50, z + zoomDelta)));
    }
  }

  // --- Properties Panel Inputs ---
  protected updateProperty(key: string, event: Event): void {
    const layer = this.state.selectedLayer();
    if (!layer) return;

    const target = event.target as HTMLInputElement;
    const value = target.value;

    if (key === 'x') this.state.updateLayer(layer.id, { x: Number(value) });
    if (key === 'y') this.state.updateLayer(layer.id, { y: Number(value) });
    if (key === 'opacity') this.state.updateLayer(layer.id, { opacity: Number(value) / 100 });
    if (key === 'fontSize') this.state.updateLayer(layer.id, { fontSize: Number(value) });
    if (key === 'textColor') this.state.updateLayer(layer.id, { textColor: value });
    if (key === 'fontFamily') this.state.updateLayer(layer.id, { fontFamily: value });
  }

  // --- 3D Preview Operations ---
  protected open3dPreview(): void {
    this.state.is3dPreviewOpen.set(true);
    this.orbitRx.set(-10);
    this.orbitRy.set(-25);
    this.orbitZoom.set(1);
  }

  protected close3dPreview(): void {
    this.state.is3dPreviewOpen.set(false);
  }

  protected onOrbitPointerDown(event: PointerEvent): void {
    this.isOrbitDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onOrbitPointerMove(event: PointerEvent): void {
    if (!this.isOrbitDragging) return;
    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    this.orbitRy.update((y) => y + deltaX * 0.6);
    this.orbitRx.update((x) => Math.max(-60, Math.min(60, x - deltaY * 0.5)));
  }

  protected onOrbitPointerUp(): void {
    this.isOrbitDragging = false;
  }

  protected reset3dView(): void {
    this.orbitRx.set(-10);
    this.orbitRy.set(-25);
    this.orbitZoom.set(1);
  }

  protected closeCart(): void {
    this.state.isCartDrawerOpen.set(false);
  }
}
