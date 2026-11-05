import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  HostListener,
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
  protected readonly dontRemindConsent = signal<boolean>(false);
  protected readonly dontRemindResize = signal<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('caseyes_dont_remind_resize') === 'true' : false
  );

  protected toggleDontRemindResize(): void {
    const newVal = !this.dontRemindResize();
    this.dontRemindResize.set(newVal);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('caseyes_dont_remind_resize', newVal ? 'true' : 'false');
      } catch {
        // ignore storage errors
      }
    }
  }

  // Toast Notification for Cart, Save and Warnings (Bug 7)
  protected readonly cartToast = signal<{ message: string; showCartLink?: boolean } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  protected showToast(message: string, duration = 4000, showCartLink = false): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.cartToast.set({ message, showCartLink });
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

  // Bleed View Mode: 'bleed' (shows overflow at 50% opacity) | 'clipped' (strictly hides overflow)
  protected readonly viewMode = signal<'bleed' | 'clipped'>('bleed');

  // Image Auto-Resize Modal State for > 10MB files
  protected readonly isResizeNoticeModalOpen = signal<boolean>(false);
  protected readonly resizeNoticeInfo = signal<{ originalSizeMb: string; optimizedSizeMb: string; name: string } | null>(null);
  private pendingResizedUpload: any = null;

  // Case Stroke / Bumper Color (Màu viền ốp)
  protected readonly caseStrokeColor = signal<string>('#18181b');

  protected readonly strokePresets = [
    { name: 'Đen nhám', color: '#18181b' },
    { name: 'Trắng sứ', color: '#ffffff' },
    { name: 'Tím pastel', color: '#a78bfa' },
    { name: 'Hồng blush', color: '#f472b6' },
    { name: 'Xanh baby', color: '#38bdf8' },
    { name: 'Titan tự nhiên', color: '#71717a' },
    { name: 'Xanh midnight', color: '#15803d' },
  ];

  protected onSelectStrokeColor(color: string): void {
    this.caseStrokeColor.set(color);
    this.trigger3dTextureSync(true);
  }

  protected getStrokeColorName(): string {
    const found = this.strokePresets.find((s) => s.color === this.caseStrokeColor());
    return found ? found.name : 'Tùy chỉnh';
  }

  // Material Info & Flat Price (Đồng nhất 1 chất liệu duy nhất: Polycarbonate cao cấp)
  protected readonly caseMaterialInfo = {
    name: 'Polycarbonate cao cấp',
    badge: 'Tiêu chuẩn in UV',
    tag: 'Chống ố vàng',
    desc: 'Chất liệu Polycarbonate cao cấp chống trầy xước, bền màu, ôm khít thân máy và bảo vệ camera tối đa.',
    flatPrice: '250.000₫',
  };

  /**
   * Dynamically checks if an element has been dragged completely out of the user's field of view,
   * accounting for the user's current zoom percentage and physical screen dimensions.
   */
  private isElementOutOfUserView(
    xPercent: number,
    yPercent: number,
    clientX?: number,
    clientY?: number
  ): boolean {
    const stageEl = document.querySelector('.canvas-stage');
    const viewportEl = document.querySelector('#case-viewport');
    if (!stageEl || !viewportEl) return false;

    const stageRect = stageEl.getBoundingClientRect();
    const vRect = viewportEl.getBoundingClientRect();

    // Physical screen position of element's center based on zoomFactor and viewport
    const elemScreenX = vRect.left + (xPercent / 100) * vRect.width;
    const elemScreenY = vRect.top + (yPercent / 100) * vRect.height;

    // Buffer in screen pixels beyond stage edges (must truly leave the user's sight)
    const SCREEN_BUFFER = 40;

    const isElementPhysicallyOffScreen =
      elemScreenX < stageRect.left - SCREEN_BUFFER ||
      elemScreenX > stageRect.right + SCREEN_BUFFER ||
      elemScreenY < stageRect.top - SCREEN_BUFFER ||
      elemScreenY > stageRect.bottom + SCREEN_BUFFER;

    // Check if cursor is dragged deep outside the canvas stage (> 40px into sidebars or off screen)
    const isCursorDeepOutside =
      clientX !== undefined &&
      clientY !== undefined &&
      (clientX < stageRect.left - SCREEN_BUFFER ||
        clientX > stageRect.right + SCREEN_BUFFER ||
        clientY < stageRect.top - SCREEN_BUFFER ||
        clientY > stageRect.bottom + SCREEN_BUFFER);

    return isElementPhysicallyOffScreen || isCursorDeepOutside;
  }

  protected getLayerDisplayTitle(layer: CanvasLayer): string {
    if (layer.type === 'text') return layer.content || 'Văn bản';
    if (layer.type === 'sticker') return layer.name || 'Sticker';
    if (layer.type === 'image') return 'Ảnh tải lên';
    return 'Lớp đối tượng';
  }

  // Visual indicator for drag-to-delete (Throw away element)
  protected readonly isDragInDeleteZone = signal<boolean>(false);


  // 3D Texture sync & Loading state
  protected readonly is3dSyncing = signal<boolean>(false);
  private textureSyncTimer: any = null;
  private syncFadeTimer: any = null;
  private readonly imageCache = new Map<string, HTMLImageElement>();

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

  // Canvas Viewport Dragging & Cropping state
  private activeDrag: {
    id: string;
    mode: 'move' | 'resize' | 'rotate' | 'crop-top' | 'crop-bottom' | 'crop-left' | 'crop-right';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialRotation: number;
    initialFontSize?: number;
    layerType?: string;
    initialCropTop?: number;
    initialCropBottom?: number;
    initialCropLeft?: number;
    initialCropRight?: number;
    elemPxWidth?: number;
    elemPxHeight?: number;
    corner?: 'br' | 'bl' | 'tr' | 'tl';
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
    if (this.syncFadeTimer) {
      clearTimeout(this.syncFadeTimer);
      this.syncFadeTimer = null;
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

    this.showToast(`✓ Đã lưu thiết kế "${currentName}" thành công!`, 3500, false);
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

    this.showToast('✓ Đã thêm thiết kế vào giỏ hàng thành công!', 4000, true);
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
    // Lưu ngầm hoàn toàn trong background, không hiển thị toast thông báo kỹ thuật về localStorage / lưu tạm vào trình duyệt
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

  // Layer list ordered from top to bottom (Figma/Canva/Photoshop visual stack)
  // Top item in list = topmost layer on canvas (drawn on top of all others)
  // Bottom item in list = lowest layer on canvas (closest to case background)
  protected readonly displayLayers = computed(() => {
    const layers = this.state.layers();
    return layers.map((layer, originalIdx) => ({ layer, originalIdx })).reverse();
  });

  // Drag and drop layer reordering state
  protected readonly draggingLayerVisualIdx = signal<number | null>(null);
  protected readonly dragOverLayerVisualIdx = signal<number | null>(null);

  // --- Layer Reordering (Bug 6 & Drag and Drop) ---
  protected onMoveLayerUp(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.state.moveLayerUp(id);
  }

  protected onMoveLayerDown(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.state.moveLayerDown(id);
  }

  protected onLayerDragStart(event: DragEvent, visualIdx: number): void {
    this.draggingLayerVisualIdx.set(visualIdx);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', visualIdx.toString());
    }
  }

  protected onLayerDragOver(event: DragEvent, visualIdx: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.dragOverLayerVisualIdx() !== visualIdx) {
      this.dragOverLayerVisualIdx.set(visualIdx);
    }
  }

  protected onLayerDragLeave(event: DragEvent, visualIdx: number): void {
    if (this.dragOverLayerVisualIdx() === visualIdx) {
      this.dragOverLayerVisualIdx.set(null);
    }
  }

  protected onLayerDrop(event: DragEvent, targetVisualIdx: number): void {
    event.preventDefault();
    const fromVisualIdx = this.draggingLayerVisualIdx();
    this.draggingLayerVisualIdx.set(null);
    this.dragOverLayerVisualIdx.set(null);

    if (fromVisualIdx === null || fromVisualIdx === targetVisualIdx) return;

    const display = this.displayLayers();
    if (!display[fromVisualIdx] || !display[targetVisualIdx]) return;

    const originalFromIdx = display[fromVisualIdx].originalIdx;
    const originalToIdx = display[targetVisualIdx].originalIdx;

    this.state.reorderLayers(originalFromIdx, originalToIdx);
  }

  protected onLayerDragEnd(): void {
    this.draggingLayerVisualIdx.set(null);
    this.dragOverLayerVisualIdx.set(null);
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

  private compressAndResizeImage(file: File): Promise<{ dataUrl: string; optimizedSize: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

          // Keep natural dimensions unless extreme (> 6000px)
          const MAX_DIM = 6000;
          let w = img.naturalWidth;
          let h = img.naturalHeight;

          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = Math.round((h * MAX_DIM) / w);
              w = MAX_DIM;
            } else {
              w = Math.round((w * MAX_DIM) / h);
              h = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: reader.result as string, optimizedSize: file.size });
            return;
          }

          // Ensure transparent canvas background is cleared before drawing (preserves PNG/WebP alpha)
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          // Strictly aim for near-10MB ceiling (~9.5MB - 9.85MB), never over-compressing
          const MAX_TARGET_BYTES = 9.85 * 1024 * 1024;

          const getBlob = (format: string, q?: number): Promise<Blob | null> => {
            return new Promise((res) => canvas.toBlob((b) => res(b), format, q));
          };

          const attemptCompression = async (): Promise<Blob | null> => {
            // Case 1: PNG files - STRICTLY keep as image/png to retain 100% transparent backgrounds
            if (isPng) {
              const pngBlob = await getBlob('image/png');
              if (pngBlob && pngBlob.size <= MAX_TARGET_BYTES) {
                return pngBlob; // Full original lossless quality & transparency
              }

              // If PNG > 9.85MB, gently scale canvas dimensions while staying 100% pure image/png
              if (pngBlob) {
                const scale = Math.sqrt((MAX_TARGET_BYTES * 0.96) / pngBlob.size);
                const downW = Math.max(1, Math.round(w * scale));
                const downH = Math.max(1, Math.round(h * scale));
                canvas.width = downW;
                canvas.height = downH;
                ctx.clearRect(0, 0, downW, downH);
                ctx.drawImage(img, 0, 0, downW, downH);
                const finalPngBlob = await getBlob('image/png');
                return finalPngBlob || pngBlob;
              }
              return pngBlob;
            }

            // Case 2: WebP files (supports alpha transparency as well)
            if (isWebp) {
              const webpBlob = await getBlob('image/webp', 0.98);
              if (webpBlob && webpBlob.size <= MAX_TARGET_BYTES) {
                return webpBlob;
              }
              for (const q of [0.96, 0.94, 0.92, 0.90, 0.88, 0.85]) {
                const b = await getBlob('image/webp', q);
                if (b && b.size <= MAX_TARGET_BYTES) return b;
              }
              return webpBlob;
            }

            // Case 3: JPEG / JPG (no transparency, use fine-grained quality ladder)
            const qualitySteps = [0.98, 0.96, 0.94, 0.92, 0.90, 0.88, 0.85, 0.82];
            let bestBlob: Blob | null = null;

            for (const q of qualitySteps) {
              const blob = await getBlob('image/jpeg', q);
              if (blob) {
                bestBlob = blob;
                if (blob.size <= MAX_TARGET_BYTES) {
                  return blob; // Highest quality that fits right under 10MB
                }
              }
            }

            // Fallback for extreme 40MB+ JPEGs: scale dimensions slightly
            if (bestBlob && bestBlob.size > MAX_TARGET_BYTES) {
              const scaleDownRatio = Math.sqrt(MAX_TARGET_BYTES / bestBlob.size);
              const downW = Math.round(w * scaleDownRatio);
              const downH = Math.round(h * scaleDownRatio);
              canvas.width = downW;
              canvas.height = downH;
              ctx.drawImage(img, 0, 0, downW, downH);
              const finalBlob = await getBlob('image/jpeg', 0.94);
              return finalBlob || bestBlob;
            }

            return bestBlob;
          };

          attemptCompression()
            .then((finalBlob) => {
              if (finalBlob) {
                const r = new FileReader();
                r.onload = () => resolve({ dataUrl: r.result as string, optimizedSize: finalBlob.size });
                r.readAsDataURL(finalBlob);
              } else {
                resolve({ dataUrl: reader.result as string, optimizedSize: file.size });
              }
            })
            .catch(reject);
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private processFile(file: File): void {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showToast('⚠️ Hệ thống chỉ hỗ trợ định dạng PNG, JPG và WEBP.');
      return;
    }

    // Auto-resize and optimize images larger than 10MB with modal notice
    if (file.size > 10 * 1024 * 1024) {
      const originalSizeMb = (file.size / (1024 * 1024)).toFixed(1);
      this.showToast(`⏳ Đang tối ưu dung lượng ảnh (${originalSizeMb} MB)...`, 3000);

      this.compressAndResizeImage(file)
        .then(({ dataUrl, optimizedSize }) => {
          const optimizedSizeMb = (optimizedSize / (1024 * 1024)).toFixed(1);
          const img = new Image();
          img.onload = () => {
            const printWidthMm = this.state.selectedModel().printWidthMm || 71.5;
            const dpi = Math.round(img.naturalWidth / (printWidthMm / 25.4));
            const uploadObj = {
              id: 'img_' + crypto.randomUUID().slice(0, 8),
              name: file.name,
              url: dataUrl,
              dpi,
              size: optimizedSize,
            };

            // Smoothen UX: if user opted not to be reminded, upload directly without modal popup
            if (this.dontRemindResize()) {
              if (dpi < 150) {
                this.state.pendingUpload.set(uploadObj);
                this.state.isLowResModalOpen.set(true);
              } else {
                this.proceedWithUpload(uploadObj);
                this.showToast(`✓ Đã tối ưu ảnh "${file.name}" (~${optimizedSizeMb} MB) chuẩn in.`);
              }
              return;
            }

            this.pendingResizedUpload = uploadObj;
            this.resizeNoticeInfo.set({
              name: file.name,
              originalSizeMb,
              optimizedSizeMb,
            });
            this.isResizeNoticeModalOpen.set(true);
          };
          img.src = dataUrl;
        })
        .catch(() => {
          this.showToast('⚠️ Không thể tối ưu ảnh. Vui lòng chọn ảnh khác.');
        });
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
          this.proceedWithUpload(uploadObj);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  protected confirmResizeAndUpload(): void {
    this.isResizeNoticeModalOpen.set(false);
    const upload = this.pendingResizedUpload;
    this.pendingResizedUpload = null;
    if (upload) {
      this.state.pendingUpload.set(upload);
      if (upload.dpi < 150) {
        this.state.isLowResModalOpen.set(true);
      } else {
        this.proceedWithUpload(upload);
      }
    }
  }

  private proceedWithUpload(upload: any): void {
    const skipConsent = typeof window !== 'undefined' && localStorage.getItem('caseyes_dont_remind_consent') === 'true';
    if (skipConsent) {
      this.state.recordConsent(upload.id);
      this.state.uploads.update((list) => [upload, ...list]);
      this.state.addImageLayer(upload.url, upload.name, upload.dpi);
      this.state.pendingUpload.set(null);
    } else {
      this.state.isConsentModalOpen.set(true);
    }
  }

  protected continueLowRes(): void {
    this.state.isLowResModalOpen.set(false);
    const upload = this.state.pendingUpload();
    if (upload) {
      this.proceedWithUpload(upload);
    }
  }

  protected cancelUpload(): void {
    this.state.isLowResModalOpen.set(false);
    this.state.isConsentModalOpen.set(false);
    this.state.pendingUpload.set(null);
    this.consentChecked.set(false);
    this.consentError.set(false);
    this.dontRemindConsent.set(false);
  }

  protected confirmConsent(): void {
    if (!this.consentChecked()) {
      this.consentError.set(true);
      return;
    }

    if (this.dontRemindConsent() && typeof window !== 'undefined') {
      try {
        localStorage.setItem('caseyes_dont_remind_consent', 'true');
      } catch {
        // Ignore localStorage quota or private browsing exceptions
      }
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

  protected getToolbarTransform(layer: CanvasLayer): string {
    const W = 300;
    const elemW = (layer.width / 100) * W;
    let elemH = elemW;

    if (layer.type === 'text') {
      elemH = (layer.fontSize || 30) * 1.5;
    } else if (layer.type === 'sticker') {
      elemH = (layer.width / 100) * 120;
    } else if (layer.type === 'image') {
      const img = this.imageCache.get(layer.storageUrl);
      if (img && img.naturalWidth > 0) {
        elemH = elemW * (img.naturalHeight / img.naturalWidth);
      }
    }

    const cT = (layer.cropTop || 0) / 100;
    const cB = (layer.cropBottom || 0) / 100;
    const croppedH = elemH * (1 - cT - cB);

    // Distance above element center: half-height + rotate handle (~32px) + margin (~26px)
    const offsetAbove = croppedH / 2 + 58;

    // If too close to top of phone case, flip to float below
    const posYPx = (layer.y / 100) * 632;
    if (posYPx - offsetAbove < 15) {
      const offsetBelow = croppedH / 2 + 35;
      return `translate(-50%, calc(-50% + ${Math.round(offsetBelow)}px))`;
    }

    return `translate(-50%, calc(-50% - ${Math.round(offsetAbove)}px))`;
  }

  protected resetCrop(layerId: string): void {
    this.state.updateLayer(layerId, { cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 });
    this.trigger3dTextureSync(true);
  }

  protected onResizeHandlePointerDown(
    event: PointerEvent,
    layerId: string,
    corner: 'br' | 'bl' | 'tr' | 'tl' = 'br'
  ): void {
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
      initialFontSize: layer.type === 'text' ? (layer.fontSize || 30) : undefined,
      layerType: layer.type,
      initialCropTop: layer.cropTop ?? 0,
      initialCropBottom: layer.cropBottom ?? 0,
      initialCropLeft: layer.cropLeft ?? 0,
      initialCropRight: layer.cropRight ?? 0,
      elemPxWidth: (layer.width / 100) * 300,
      elemPxHeight: (layer.width / 100) * 300,
      corner,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onCropHandlePointerDown(
    event: PointerEvent,
    layerId: string,
    side: 'top' | 'bottom' | 'left' | 'right'
  ): void {
    event.stopPropagation();
    const layer = this.state.layers().find((l) => l.id === layerId);
    if (!layer || layer.isLocked) return;

    const parentContainer = (event.target as HTMLElement).closest('.cursor-move') as HTMLElement;
    const rect = parentContainer ? parentContainer.getBoundingClientRect() : null;
    const zoomFactor = this.state.zoom() / 100;
    const elemPxWidth = rect ? rect.width / zoomFactor : (layer.width / 100) * 300;
    const elemPxHeight = rect ? rect.height / zoomFactor : (layer.width / 100) * 300;

    this.activeDrag = {
      id: layerId,
      mode: `crop-${side}` as any,
      startX: event.clientX,
      startY: event.clientY,
      initialX: layer.x,
      initialY: layer.y,
      initialWidth: layer.width,
      initialHeight: layer.height,
      initialRotation: layer.rotation,
      layerType: layer.type,
      initialCropTop: layer.cropTop ?? 0,
      initialCropBottom: layer.cropBottom ?? 0,
      initialCropLeft: layer.cropLeft ?? 0,
      initialCropRight: layer.cropRight ?? 0,
      elemPxWidth,
      elemPxHeight,
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
      initialCropTop: layer.cropTop ?? 0,
      initialCropBottom: layer.cropBottom ?? 0,
      initialCropLeft: layer.cropLeft ?? 0,
      initialCropRight: layer.cropRight ?? 0,
      elemPxWidth: (layer.width / 100) * 300,
      elemPxHeight: (layer.width / 100) * 300,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onCanvasPointerMove(event: PointerEvent): void {
    if (!this.activeDrag) return;
    const {
      id,
      mode,
      startX,
      startY,
      initialX,
      initialY,
      initialWidth,
      initialRotation,
      corner,
    } = this.activeDrag;
    const initialCropTop = this.activeDrag.initialCropTop ?? 0;
    const initialCropBottom = this.activeDrag.initialCropBottom ?? 0;
    const initialCropLeft = this.activeDrag.initialCropLeft ?? 0;
    const initialCropRight = this.activeDrag.initialCropRight ?? 0;
    const elemPxWidth = this.activeDrag.elemPxWidth ?? 300;
    const elemPxHeight = this.activeDrag.elemPxHeight ?? 300;

    const zoomFactor = this.state.zoom() / 100;
    const deltaX = ((event.clientX - startX) / (300 * zoomFactor)) * 100;
    const deltaY = ((event.clientY - startY) / (632 * zoomFactor)) * 100;

    if (mode === 'move') {
      // Dynamic coordinate bounds that scale inversely with zoom percentage
      // e.g. at 50% zoom, the user can reach twice as far across the screen
      const currentZoom = Math.max(30, this.state.zoom());
      const zoomRatio = currentZoom / 100;
      const maxReachX = Math.round(500 / zoomRatio);
      const maxReachY = Math.round(400 / zoomRatio);

      const newX = Math.max(-maxReachX, Math.min(maxReachX + 100, initialX + deltaX));
      const newY = Math.max(-maxReachY, Math.min(maxReachY + 100, initialY + deltaY));

      // Zoom-aware & screen-aware check: only mark for deletion when it truly leaves the user's field of view
      const isOut = this.isElementOutOfUserView(newX, newY, event.clientX, event.clientY);
      this.isDragInDeleteZone.set(isOut);

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
      // No upper percentage limit! Scale as big as desired like Canva
      const deltaX = (event.clientX - startX) / (2 * zoomFactor);
      const deltaY = (event.clientY - startY) / (2 * zoomFactor);

      let scaleDelta = deltaX;
      if (corner === 'br') {
        scaleDelta = (deltaX + deltaY) / 2;
      } else if (corner === 'bl') {
        scaleDelta = (-deltaX + deltaY) / 2;
      } else if (corner === 'tr') {
        scaleDelta = (deltaX - deltaY) / 2;
      } else if (corner === 'tl') {
        scaleDelta = (-deltaX - deltaY) / 2;
      }

      const newWidth = Math.max(5, initialWidth + scaleDelta);

      if (this.activeDrag.layerType === 'text') {
        const initialFontSize = this.activeDrag.initialFontSize || 30;
        const scaleRatio = newWidth / Math.max(5, initialWidth);
        const newFontSize = Math.max(10, Math.min(250, Math.round(initialFontSize * scaleRatio)));
        this.state.updateLayer(id, { width: Math.round(newWidth), fontSize: newFontSize } as any);
      } else {
        this.state.updateLayer(id, { width: Math.round(newWidth) });
      }
    } else if (mode === 'rotate') {
      const angle = (event.clientX - startX) * 1.5;
      this.state.updateLayer(id, { rotation: Math.round((initialRotation + angle) % 360) });
    } else if (mode === 'crop-top') {
      const deltaPixels = (event.clientY - startY) / zoomFactor;
      const deltaPercent = (deltaPixels / Math.max(20, elemPxHeight)) * 100;
      const maxCrop = 100 - initialCropBottom - 5;
      const newCrop = Math.max(0, Math.min(maxCrop, initialCropTop + deltaPercent));
      this.state.updateLayer(id, { cropTop: Math.round(newCrop) });
    } else if (mode === 'crop-bottom') {
      const deltaPixels = (startY - event.clientY) / zoomFactor;
      const deltaPercent = (deltaPixels / Math.max(20, elemPxHeight)) * 100;
      const maxCrop = 100 - initialCropTop - 5;
      const newCrop = Math.max(0, Math.min(maxCrop, initialCropBottom + deltaPercent));
      this.state.updateLayer(id, { cropBottom: Math.round(newCrop) });
    } else if (mode === 'crop-left') {
      if (this.activeDrag.layerType === 'text') {
        // Dragging left handle on text box: changes box width to wrap words naturally (Canva behavior)
        const deltaPixels = (startX - event.clientX) / zoomFactor;
        const deltaPercent = (deltaPixels / 300) * 100;
        const newWidth = Math.max(15, Math.round(initialWidth + deltaPercent));
        this.state.updateLayer(id, { width: newWidth });
      } else {
        const deltaPixels = (event.clientX - startX) / zoomFactor;
        const deltaPercent = (deltaPixels / Math.max(20, elemPxWidth)) * 100;
        const maxCrop = 100 - initialCropRight - 5;
        const newCrop = Math.max(0, Math.min(maxCrop, initialCropLeft + deltaPercent));
        this.state.updateLayer(id, { cropLeft: Math.round(newCrop) });
      }
    } else if (mode === 'crop-right') {
      if (this.activeDrag.layerType === 'text') {
        // Dragging right handle on text box: changes box width to wrap words naturally (Canva behavior)
        const deltaPixels = (event.clientX - startX) / zoomFactor;
        const deltaPercent = (deltaPixels / 300) * 100;
        const newWidth = Math.max(15, Math.round(initialWidth + deltaPercent));
        this.state.updateLayer(id, { width: newWidth });
      } else {
        const deltaPixels = (startX - event.clientX) / zoomFactor;
        const deltaPercent = (deltaPixels / Math.max(20, elemPxWidth)) * 100;
        const maxCrop = 100 - initialCropLeft - 5;
        const newCrop = Math.max(0, Math.min(maxCrop, initialCropRight + deltaPercent));
        this.state.updateLayer(id, { cropRight: Math.round(newCrop) });
      }
    }
  }

  @HostListener('window:pointerup', ['$event'])
  protected onCanvasPointerUp(event?: PointerEvent): void {
    if (!this.activeDrag) return;

    if (this.activeDrag.mode === 'move') {
      const draggedId = this.activeDrag.id;
      const layer = this.state.layers().find((l) => l.id === draggedId);

      let shouldDelete = this.isDragInDeleteZone();
      if (layer) {
        const clientX = event ? event.clientX : undefined;
        const clientY = event ? event.clientY : undefined;
        shouldDelete = shouldDelete || this.isElementOutOfUserView(layer.x, layer.y, clientX, clientY);
      }

      if (shouldDelete) {
        this.state.removeLayer(draggedId);
        this.showToast('🗑️ Đã xóa phần tử ra khỏi canvas', 2500);
        this.isDragInDeleteZone.set(false);
        this.activeDrag = null;
        return;
      }
    }

    this.isDragInDeleteZone.set(false);
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
    if (key === 'width') this.state.updateLayer(layer.id, { width: Number(value) });
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
    this.is3dSyncing.set(true);
    if (this.syncFadeTimer) {
      clearTimeout(this.syncFadeTimer);
      this.syncFadeTimer = null;
    }
    if (this.textureSyncTimer) {
      clearTimeout(this.textureSyncTimer);
    }
    if (immediate) {
      this.sync3dTexture();
    } else {
      this.textureSyncTimer = setTimeout(() => {
        this.sync3dTexture();
      }, 120);
    }
  }

  private sync3dTexture(): void {
    if (typeof document === 'undefined') return;
    const mv = document.querySelector('model-viewer') as any;
    if (!mv || !mv.model) {
      this.is3dSyncing.set(false);
      return;
    }

    // 1. Offscreen 2D Canvas rendering matching the case viewport aspect ratio (300px : 632px)
    const W = 600;
    const H = 1264;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.is3dSyncing.set(false);
      return;
    }

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
      // Soften pure white slightly to prevent specular burnout/glare in 3D PBR
      const lower = bg.toLowerCase();
      ctx.fillStyle = (lower === '#ffffff' || lower === '#fff' || lower === '#fafafa') ? '#f3f3f6' : bg;
    }

    // Rounded case silhouette matching 2D canvas frame radius (50px * 2)
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(0, 0, W, H, [100, 100, 100, 100]);
    } else {
      ctx.rect(0, 0, W, H);
    }
    ctx.fill();
    ctx.clip(); // Strictly clip all bleeding graphics to case silhouette for 3D & print

    // Draw Layers (Text, Stickers, Images)
    const layers = this.state.layers();
    for (const layer of layers) {
      const posX = (layer.x / 100) * W;
      const posY = (layer.y / 100) * H;

      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.globalAlpha = layer.opacity;

      // Apply Canva-style 4-side crop if present
      if (layer.cropTop || layer.cropBottom || layer.cropLeft || layer.cropRight) {
        let elemW = (layer.width / 100) * W;
        let elemH = elemW;
        if (layer.type === 'image') {
          const img = this.imageCache.get(layer.storageUrl);
          if (img && img.naturalWidth > 0) {
            elemH = elemW * (img.naturalHeight / (img.naturalWidth || 1));
          }
        }
        const cL = (layer.cropLeft || 0) / 100;
        const cT = (layer.cropTop || 0) / 100;
        const cR = (layer.cropRight || 0) / 100;
        const cB = (layer.cropBottom || 0) / 100;

        ctx.beginPath();
        ctx.rect(
          -elemW / 2 + cL * elemW,
          -elemH / 2 + cT * elemH,
          elemW * (1 - cL - cR),
          elemH * (1 - cT - cB)
        );
        ctx.clip();
      }

      if (layer.type === 'text') {
        const fontSizePx = Math.round((layer.fontSize / 300) * W);
        const maxTextWidthPx = Math.max(40, Math.round((layer.width / 100) * W));
        ctx.fillStyle = layer.textColor;
        ctx.font = `${layer.fontWeight || 'bold'} ${fontSizePx}px ${layer.fontFamily || 'sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Multi-line word wrapping matching 2D canvas
        const words = layer.content.split(' ');
        const lines: string[] = [];
        let curLine = '';

        for (const w of words) {
          const test = curLine ? `${curLine} ${w}` : w;
          if (ctx.measureText(test).width > maxTextWidthPx && curLine) {
            lines.push(curLine);
            curLine = w;
          } else {
            curLine = test;
          }
        }
        if (curLine) lines.push(curLine);

        const lineHeight = fontSizePx * 1.25;
        const totalHeight = lines.length * lineHeight;
        const startY = -totalHeight / 2 + lineHeight / 2;

        lines.forEach((lStr, lIdx) => {
          ctx.fillText(lStr, 0, startY + lIdx * lineHeight);
        });
      } else if (layer.type === 'sticker') {
        const stickerSizePx = Math.round((layer.width / 100) * 240);
        ctx.font = `${stickerSizePx}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.name, 0, 0);
      } else if (layer.type === 'image' && layer.storageUrl) {
        let img = this.imageCache.get(layer.storageUrl);
        if (!img) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            this.imageCache.set(layer.storageUrl, img!);
            this.trigger3dTextureSync(true);
          };
          img.src = layer.storageUrl;
        }
        if (img.complete && img.naturalWidth > 0) {
          const imgW = (layer.width / 100) * W;
          const imgH = imgW * (img.naturalHeight / (img.naturalWidth || 1));
          ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
        }
      }

      ctx.restore();
    }

    // Camera Cutout (punched out cleanly through background and layers using exact model config)
    const model = this.state.selectedModel();
    const cam = model.safeZoneMask.cameraCutout;
    const camX = (cam.xPercent / 100) * W;
    const camY = (cam.yPercent / 100) * H;
    const camW = (cam.widthPercent / 100) * W;
    const camH = (cam.heightPercent / 100) * H;
    const camRadius = cam.borderRadius * 2;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    if (model.id === 'galaxy-s24') {
      const cx = camX + camW / 2;
      const r = camW * 0.42;
      ctx.arc(cx, camY + r + 4, r, 0, Math.PI * 2);
      ctx.arc(cx, camY + camH * 0.5, r, 0, Math.PI * 2);
      ctx.arc(cx, camY + camH - r - 4, r, 0, Math.PI * 2);
    } else if (model.id === 'xiaomi-14-ultra') {
      const cx = W / 2;
      const cy = camY + camH / 2;
      const r = camW / 2;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else {
      // iPhone squircle - 1:1 match with 2D canvas frame and 3D camera island
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(camX, camY, camW, camH, [camRadius, camRadius, camRadius, camRadius]);
      } else {
        ctx.rect(camX, camY, camW, camH);
      }
    }
    ctx.fill();
    ctx.restore();

    // Bumper rim around case perimeter matching selected stroke color
    ctx.save();
    ctx.lineWidth = 18;
    ctx.strokeStyle = this.caseStrokeColor();
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(9, 9, W - 18, H - 18, [92, 92, 92, 92]);
    } else {
      ctx.rect(9, 9, W - 18, H - 18);
    }
    ctx.stroke();

    // Protective camera bezel ring matching selected stroke color
    ctx.lineWidth = 22;
    ctx.strokeStyle = this.caseStrokeColor();
    ctx.beginPath();
    if (model.id === 'galaxy-s24') {
      const cx = camX + camW / 2;
      const r = camW * 0.42;
      ctx.arc(cx, camY + r + 4, r + 2, 0, Math.PI * 2);
      ctx.arc(cx, camY + camH * 0.5, r + 2, 0, Math.PI * 2);
      ctx.arc(cx, camY + camH - r - 4, r + 2, 0, Math.PI * 2);
    } else if (model.id === 'xiaomi-14-ultra') {
      const cx = W / 2;
      const cy = camY + camH / 2;
      const r = camW / 2;
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    } else {
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(camX, camY, camW, camH, [camRadius, camRadius, camRadius, camRadius]);
      } else {
        ctx.rect(camX, camY, camW, camH);
      }
    }
    ctx.stroke();
    ctx.restore();

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
            // Ensure sRGB color space is preserved (prevents washed-out/pale/glaring textures)
            if ('colorSpace' in tex) {
              tex.colorSpace = 'srgb';
            }
            if ('encoding' in tex) {
              (tex as any).encoding = 3001; // sRGBEncoding
            }
            tex.needsUpdate = true;

            // 1. Back Overlay Mesh: Full phone chassis dimensions (w: 7.80, h: 16.00, z: 0.425)
            const hw = 3.90;
            const hh = 8.00;
            const z = 0.425;

            const positions = new Float32Array([
              -hw, -hh, z,
               hw, -hh, z,
               hw,  hh, z,
              -hw,  hh, z
            ]);
            // Planar UV coordinates aligned with phone back view (cutout at top-left matching camera)
            const uvs = new Float32Array([
              1, 1, // vertex 0 (-hw, -hh): bottom-left
              0, 1, // vertex 1 (+hw, -hh): bottom-right
              0, 0, // vertex 2 (+hw,  hh): top-right
              1, 0  // vertex 3 (-hw,  hh): top-left (camera lenses cutout)
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
              mat.roughness = 0.88; // Matte finish to eliminate shiny specular white glare
              mat.metalness = 0.0;  // Non-metallic case albedo

              overlay = new MeshConstructor(geo, mat);
              overlay.name = 'CaseOverlayMesh';
              overlay.scale.copy(backMesh.scale);
              backMesh.parent.add(overlay);
            } else {
              overlay.geometry = geo;
              if (overlay.material) {
                overlay.material.map = tex;
                overlay.material.transparent = true;
                overlay.material.roughness = 0.88;
                overlay.material.metalness = 0.0;
                overlay.material.needsUpdate = true;
              }
            }

            // 2. 3D Protective Extrusion Bumper with Raised Bezel Lip & Full Sidewall Depth
            const rOut = 1.20; // Rounded corners matching phone corner curvature
            const hwIn = 3.74;
            const hhIn = 7.85;
            const rIn = 1.05;
            const zBack = 0.435; // Raised protective lip above back plate
            const zFront = -0.52; // Full extrusion wrapping towards front screen
            const segmentsPerCorner = 12;
            const N = segmentsPerCorner * 4; // 48 points for smooth curves

            const generatePoints = (wVal: number, hVal: number, rVal: number) => {
              const pts: { x: number; y: number }[] = [];
              const corners = [
                { cx: wVal - rVal, cy: hVal - rVal, startAngle: 0, endAngle: Math.PI / 2 },
                { cx: -wVal + rVal, cy: hVal - rVal, startAngle: Math.PI / 2, endAngle: Math.PI },
                { cx: -wVal + rVal, cy: -hVal + rVal, startAngle: Math.PI, endAngle: Math.PI * 1.5 },
                { cx: wVal - rVal, cy: -hVal + rVal, startAngle: Math.PI * 1.5, endAngle: Math.PI * 2 }
              ];
              for (const c of corners) {
                for (let i = 0; i < segmentsPerCorner; i++) {
                  const theta = c.startAngle + (i / segmentsPerCorner) * (c.endAngle - c.startAngle);
                  pts.push({
                    x: c.cx + rVal * Math.cos(theta),
                    y: c.cy + rVal * Math.sin(theta)
                  });
                }
              }
              return pts;
            };

            const ptsOut = generatePoints(hw, hh, rOut);
            const ptsIn = generatePoints(hwIn, hhIn, rIn);

            const bumperPos: number[] = [];
            const bumperIndices: number[] = [];

            // Layout:
            // [0 .. N-1]: Outer Top (ptsOut, zBack)
            // [N .. 2N-1]: Outer Bottom (ptsOut, zFront)
            // [2N .. 3N-1]: Inner Top (ptsIn, zBack)
            for (let i = 0; i < N; i++) bumperPos.push(ptsOut[i].x, ptsOut[i].y, zBack);
            for (let i = 0; i < N; i++) bumperPos.push(ptsOut[i].x, ptsOut[i].y, zFront);
            for (let i = 0; i < N; i++) bumperPos.push(ptsIn[i].x, ptsIn[i].y, zBack);

            // Outer Sidewall Quads (Outer Top -> Outer Bottom)
            for (let i = 0; i < N; i++) {
              const next = (i + 1) % N;
              const t0 = i;
              const t1 = next;
              const b0 = N + i;
              const b1 = N + next;
              bumperIndices.push(t0, b0, t1);
              bumperIndices.push(t1, b0, b1);
            }

            // Raised Bevel Lip Quads (Inner Top -> Outer Top)
            for (let i = 0; i < N; i++) {
              const next = (i + 1) % N;
              const out0 = i;
              const out1 = next;
              const in0 = 2 * N + i;
              const in1 = 2 * N + next;
              bumperIndices.push(in0, out0, in1);
              bumperIndices.push(in1, out0, out1);
            }

            const bumperGeo = new BufferGeometryConstructor();
            bumperGeo.setAttribute('position', new BufferAttributeConstructor(new Float32Array(bumperPos), 3));
            bumperGeo.setIndex(new BufferAttributeConstructor(new Uint16Array(bumperIndices), 1));
            bumperGeo.computeVertexNormals();

            let bumper = backMesh.parent.getObjectByName('CaseExtrusionBumper');
            if (!bumper) {
              const bumperMat = new MaterialConstructor();
              bumperMat.color.set('#18181b');
              bumperMat.roughness = 0.85;
              bumperMat.metalness = 0.1;
              bumperMat.side = 2; // DoubleSide

              bumper = new MeshConstructor(bumperGeo, bumperMat);
              bumper.name = 'CaseExtrusionBumper';
              bumper.scale.copy(backMesh.scale);
              backMesh.parent.add(bumper);
            } else {
              bumper.geometry = bumperGeo;
              if (bumper.material) {
                bumper.material.color.set(this.caseStrokeColor());
                bumper.material.roughness = 0.85;
                bumper.material.metalness = 0.1;
                bumper.material.needsUpdate = true;
              }
            }

            // Force <model-viewer> WebGL render loop to wake up and repaint immediately (eliminates idle pause)
            if (scene) {
              scene.isDirty = true;
              if (typeof scene.queueRender === 'function') {
                scene.queueRender();
                requestAnimationFrame(() => {
                  if (typeof scene.queueRender === 'function') {
                    scene.queueRender();
                  }
                });
              }
            }

            if (this.syncFadeTimer) clearTimeout(this.syncFadeTimer);
            this.syncFadeTimer = setTimeout(() => {
              this.is3dSyncing.set(false);
              this.syncFadeTimer = null;
            }, 220);
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
          if (scene) {
            scene.isDirty = true;
            if (typeof scene.queueRender === 'function') scene.queueRender();
          }
          if (this.syncFadeTimer) clearTimeout(this.syncFadeTimer);
          this.syncFadeTimer = setTimeout(() => {
            this.is3dSyncing.set(false);
            this.syncFadeTimer = null;
          }, 220);
        })
        .catch(() => {
          this.is3dSyncing.set(false);
        });
    } else {
      this.is3dSyncing.set(false);
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
