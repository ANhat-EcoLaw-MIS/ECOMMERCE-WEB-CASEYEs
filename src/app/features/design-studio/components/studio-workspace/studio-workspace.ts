import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnDestroy,
  computed,
  effect,
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
import { SupabaseAuthService } from '../../../../core/supabase/supabase-auth.service';
import { AuthModal } from '../../../../core/auth/auth-modal';

@Component({
  selector: 'app-studio-workspace',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './studio-workspace.html',
  styleUrl: './studio-workspace.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioWorkspace implements OnDestroy {
  protected readonly state = inject(StudioState);
  protected readonly draft = inject(StudioDraft);
  protected readonly auth = inject(SupabaseAuthService);
  protected readonly authModal = inject(AuthModal);
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

  // Toast Notification for Cart, Save and Warnings (Bug 7)
  protected readonly cartToast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  protected showToast(message: string, duration = 4000): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.cartToast.set(message);
    this.toastTimer = setTimeout(() => {
      this.cartToast.set(null);
      this.toastTimer = null;
    }, duration);
  }

  // Modals for First Save Naming & Guest Login (Issue 13 & 14)
  protected readonly showNamingModal = signal<boolean>(false);
  protected readonly namingInput = signal<string>('');
  protected readonly showAuthModal = signal<boolean>(false);
  protected readonly guestActionType = signal<'save' | 'cart'>('save');

  // Texture sync timer
  private textureSyncTimer: any = null;

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.checkAndSyncGuestDraft();
      }
    });

    // Real-time 3D texture projection onto GLB Phone Case
    effect(() => {
      this.state.caseBg();
      this.state.layers();
      this.state.selectedModel();
      this.trigger3dTextureSync();
    });
  }

  // 3D Preview
  protected readonly is3dSupported = signal<boolean>(true);

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
    if (this.textureSyncTimer) {
      clearTimeout(this.textureSyncTimer);
      this.textureSyncTimer = null;
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
      this.showToast('⚠️ Canvas đang trống: Hãy thêm ít nhất một phần tử trước khi lưu.');
      return;
    }

    // Luôn lưu bản nháp an toàn vào LocalStorage cho phiên hiện tại
    this.saveToGuestLocalStorage();

    // Khách vãng lai: hiện popup yêu cầu đăng nhập nhưng đã lưu ngầm vào local storage (Issue 13)
    if (!this.auth.isAuthenticated()) {
      this.guestActionType.set('save');
      this.showAuthModal.set(true);
      return;
    }

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

  // --- Add to Cart (Bug 7 & Issue 13 Resolved: Guest Prompt + Auto Local Storage) ---
  protected onAddToCart(): void {
    if (this.state.designStatus() === 'REJECTED') {
      this.showToast(
        '⚠️ Bản thiết kế này đang ở trạng thái từ chối do vi phạm tiêu chuẩn nội dung. Vui lòng chỉnh sửa trước khi đặt mua.'
      );
      return;
    }
    if (!this.state.hasLayers()) {
      this.showToast('⚠️ Canvas đang trống: Hãy thêm ít nhất một phần tử trước khi thêm vào giỏ.');
      return;
    }

    // Luôn lưu bản nháp an toàn vào LocalStorage cho khách vãng lai
    this.saveToGuestLocalStorage();

    // Khách vãng lai: hiện popup yêu cầu đăng nhập nhưng đã đồng thời lưu vào local storage
    if (!this.auth.isAuthenticated()) {
      this.guestActionType.set('cart');
      this.showAuthModal.set(true);
      return;
    }

    this.showToast('✓ Đã thêm thiết kế vào giỏ hàng thành công!');
  }

  protected dismissToast(): void {
    this.cartToast.set(null);
  }

  // --- Guest Auth Flow (Issue 13) ---
  protected onGuestLoginClick(): void {
    this.showAuthModal.set(false);
    this.authModal.open('login');
  }

  protected closeAuthModal(): void {
    this.showAuthModal.set(false);
    if (this.guestActionType() === 'cart') {
      this.showToast('✓ Đã lưu tạm thiết kế! Bạn có thể đăng nhập bất cứ lúc nào để hoàn tất giỏ hàng.');
    } else {
      this.showToast('✓ Đã lưu tạm bản thiết kế vào trình duyệt của bạn!');
    }
  }

  /**
   * Tự động đồng bộ bản vẽ nháp của khách vãng lai sang danh sách My Designs ngay khi đăng nhập
   */
  private checkAndSyncGuestDraft(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem('caseyes_guest_draft');
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      if (draft && draft.layers && draft.layers.length > 0) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        const currentName = draft.designName || `Ốp lưng ${this.state.selectedModel().name}`;

        const syncedItem: SavedDesignItem = {
          id: 'synced_' + Date.now(),
          name: currentName,
          modelId: draft.modelId || this.state.selectedModel().id,
          modelName: this.state.selectedModel().name,
          material: draft.material || 'standard',
          bg: draft.bg || this.state.caseBg(),
          layerCount: draft.layers.length,
          layers: draft.layers,
          savedAt: `Đã đồng bộ lúc ${timeStr}`,
          thumbnailText:
            draft.layers.find((l: any) => l.type === 'text')?.content || currentName,
        };

        this.state.savedDesigns.update((list) => {
          const exists = list.some((d) => d.id === syncedItem.id || d.name === syncedItem.name);
          return exists ? list : [syncedItem, ...list];
        });

        localStorage.removeItem('caseyes_guest_draft');
        this.showToast('✓ Đã tự động đồng bộ bản thiết kế từ phiên khách vãng lai vào tài khoản của bạn!');
      }
    } catch {
      // Bỏ qua lỗi parse nếu có
    }
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
      this.showToast('⚠️ Hệ thống chỉ hỗ trợ định dạng PNG, JPG và dung lượng tối đa 10MB.');
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

  // --- Real-time 3D Texture Projection on GLB Case Model ---
  protected onModelViewerLoad(): void {
    const mv = document.querySelector('model-viewer') as any;
    if (mv) {
      mv.cameraOrbit = '0deg 85deg 105%';
      if (mv.jumpCameraToGoal) mv.jumpCameraToGoal();
    }
    this.trigger3dTextureSync(true);
  }

  private trigger3dTextureSync(immediate = false): void {
    if (this.textureSyncTimer) {
      clearTimeout(this.textureSyncTimer);
    }
    if (immediate) {
      this.sync3dTexture();
    } else {
      this.textureSyncTimer = setTimeout(() => {
        this.sync3dTexture();
      }, 100);
    }
  }

  private sync3dTexture(): void {
    if (typeof document === 'undefined') return;
    const mv = document.querySelector('model-viewer') as any;
    if (!mv || !mv.model) return;

    // 1. Offscreen 2D Canvas rendering matching the case viewport aspect ratio (300px : 620px)
    const W = 600;
    const H = 1240;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw Background
    const bg = this.state.caseBg();
    if (bg.includes('gradient')) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      if (bg.includes('#ffd1a8')) {
        grad.addColorStop(0, '#ffd1a8');
        grad.addColorStop(1, '#ff7e8b');
      } else if (bg.includes('#433075')) {
        grad.addColorStop(0, '#433075');
        grad.addColorStop(1, '#A58CF4');
      } else if (bg.includes('#8fd3ff')) {
        grad.addColorStop(0, '#8fd3ff');
        grad.addColorStop(1, '#ffe3b8');
      } else if (bg.includes('#b9e4f5')) {
        grad.addColorStop(0, '#b9e4f5');
        grad.addColorStop(1, '#7fc29b');
      } else if (bg.includes('#141a3d')) {
        grad.addColorStop(0, '#141a3d');
        grad.addColorStop(1, '#5b4b9a');
      } else if (bg.includes('#D4C8FA') || bg.includes('#f5b8d8')) {
        grad.addColorStop(0, '#D4C8FA');
        grad.addColorStop(1, '#f5b8d8');
      } else {
        grad.addColorStop(0, '#FAFAFA');
        grad.addColorStop(1, '#ECE6FD');
      }
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bg;
    }

    // Rounded case silhouette
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(0, 0, W, H, [54, 54, 54, 54]);
    } else {
      ctx.rect(0, 0, W, H);
    }
    ctx.fill();

    // Subtle edge bevel / case border
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    // Camera Cutout (transparent hole matching 3D phone model camera bump)
    const modelId = this.state.selectedModel().id;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    if (modelId === 'galaxy-s24') {
      // 3 vertical lens circles
      const cx = W * 0.22;
      const r = 42;
      ctx.arc(cx, 100, r, 0, Math.PI * 2);
      ctx.arc(cx, 200, r, 0, Math.PI * 2);
      ctx.arc(cx, 300, r, 0, Math.PI * 2);
    } else if (modelId === 'xiaomi-14-ultra') {
      // Large circular bump
      ctx.arc(W / 2, 220, 140, 0, Math.PI * 2);
    } else {
      // iPhone squircle
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(32, 32, 250, 260, [46, 46, 46, 46]);
      } else {
        ctx.rect(32, 32, 250, 260);
      }
    }
    ctx.fill();
    ctx.restore();

    // Draw Layers (Text, Stickers, Images)
    const layers = this.state.layers();
    for (const layer of layers) {
      const posX = (layer.x / 100) * W;
      const posY = (layer.y / 100) * H;

      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.globalAlpha = layer.opacity;

      if (layer.type === 'text') {
        const fontSizePx = Math.round((layer.fontSize / 300) * W);
        ctx.fillStyle = layer.textColor;
        ctx.font = `${layer.fontWeight || 'bold'} ${fontSizePx}px ${layer.fontFamily || 'sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.content, 0, 0);
      } else if (layer.type === 'sticker') {
        ctx.font = '84px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.name, 0, 0);
      } else if (layer.type === 'image' && layer.storageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = layer.storageUrl;
        if (img.complete && img.naturalWidth > 0) {
          const imgW = (layer.width / 100) * W;
          const imgH = imgW * (img.naturalHeight / (img.naturalWidth || 1));
          ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
        }
      }

      ctx.restore();
    }

    // 2. Access Three.js Scene from <model-viewer>
    const sceneSymbol = Object.getOwnPropertySymbols(mv).find((s) =>
      s.toString().includes('scene')
    );
    const scene = sceneSymbol ? mv[sceneSymbol] : null;

    if (scene) {
      // Find back mesh & sample mesh to borrow Three.js constructors
      let backMesh: any = null;
      let sampleMesh: any = null;
      let foundTex: any = null;

      scene.traverse((o: any) => {
        if (o.isMesh) {
          if (!sampleMesh && o.name !== 'CaseOverlayMesh') sampleMesh = o;
          if (o.material?.map && !foundTex) foundTex = o.material.map;
          if (
            o.name === 'wLfSXtbwRlBrwof' ||
            o.material?.name === 'oZRkkORNzkufnGD' ||
            o.material?.name === 'glass' ||
            o.name?.toLowerCase().includes('back')
          ) {
            backMesh = o;
          }
          // Hide Apple logo mesh if present
          if (o.name === 'IykfmVvLplTsTEW' || o.material?.name === 'PaletteMaterial004') {
            o.visible = false;
          }
        }
      });

      if (!backMesh && sampleMesh) backMesh = sampleMesh;

      if (backMesh && sampleMesh) {
        const MeshConstructor = sampleMesh.constructor;
        const MaterialConstructor = sampleMesh.material.constructor;
        const BufferGeometryConstructor = sampleMesh.geometry.constructor;
        const BufferAttributeConstructor = sampleMesh.geometry.attributes.position.constructor;
        const TexConstructor = foundTex?.constructor;

        if (TexConstructor) {
          // Prepare WebGL Texture - Flipped horizontally and vertically to match 3D phone model back orientation
          const glCvs = document.createElement('canvas');
          glCvs.width = W;
          glCvs.height = H;
          const glCtx = glCvs.getContext('2d');
          if (glCtx) {
            glCtx.translate(W, H);
            glCtx.scale(-1, -1);
            glCtx.drawImage(canvas, 0, 0);

            const tex = new TexConstructor(glCvs);
            tex.needsUpdate = true;

            // Geometry: plane matching back dimensions (w: 7.52, h: 15.82, z: 0.42)
            const w = 7.52;
            const h = 15.82;
            const halfW = w / 2;
            const halfH = h / 2;
            const z = 0.42;

            const positions = new Float32Array([
              -halfW, -halfH, z,
               halfW, -halfH, z,
               halfW,  halfH, z,
              -halfW,  halfH, z
            ]);
            // Planar UV coordinates aligned with phone back view (cutout at top-left matching camera)
            const uvs = new Float32Array([
              1, 1, // vertex 0 (-halfW, -halfH): bottom-left
              0, 1, // vertex 1 (+halfW, -halfH): bottom-right
              0, 0, // vertex 2 (+halfW,  halfH): top-right
              1, 0  // vertex 3 (-halfW,  halfH): top-left (camera lenses cutout)
            ]);
            const indices = new Uint16Array([
              0, 1, 2,
              0, 2, 3
            ]);
            const normals = new Float32Array([
              0, 0, 1,
              0, 0, 1,
              0, 0, 1,
              0, 0, 1
            ]);

            const geo = new BufferGeometryConstructor();
            geo.setAttribute('position', new BufferAttributeConstructor(positions, 3));
            geo.setAttribute('uv', new BufferAttributeConstructor(uvs, 2));
            geo.setAttribute('normal', new BufferAttributeConstructor(normals, 3));
            geo.setIndex(new BufferAttributeConstructor(indices, 1));

            let overlay = backMesh.parent.getObjectByName('CaseOverlayMesh');
            if (!overlay) {
              const mat = new MaterialConstructor();
              mat.map = tex;
              mat.transparent = true;
              mat.side = 2; // DoubleSide
              mat.roughness = 0.25;
              mat.metalness = 0.05;

              overlay = new MeshConstructor(geo, mat);
              overlay.name = 'CaseOverlayMesh';
              overlay.scale.copy(backMesh.scale);
              backMesh.parent.add(overlay);
            } else {
              overlay.geometry = geo;
              if (overlay.material) {
                overlay.material.map = tex;
                overlay.material.transparent = true;
                overlay.material.needsUpdate = true;
              }
            }
            return;
          }
        }
      }
    }

    // Fallback: If Three scene injection not available, fallback to model-viewer texture API
    const targetMat = mv.model?.materials?.find(
      (m: any) =>
        m.name === 'oZRkkORNzkufnGD' ||
        m.name === 'glass' ||
        m.name === 'back' ||
        m.name?.toLowerCase().includes('case')
    );
    if (targetMat?.pbrMetallicRoughness?.baseColorTexture) {
      mv.createTexture(canvas.toDataURL('image/png'))
        .then((texture: any) => {
          targetMat.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
          targetMat.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
        })
        .catch(() => {});
    }
  }

  protected reset3dView(): void {
    const mv = document.querySelector('model-viewer') as any;
    if (mv) {
      mv.cameraOrbit = '0deg 85deg 105%';
      if (mv.jumpCameraToGoal) mv.jumpCameraToGoal();
    }
  }

  protected closeCart(): void {
    this.state.isCartDrawerOpen.set(false);
  }
}
