import { Injectable, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { CanvasLayer } from '../models/canvas-element.model';
import { StudioState } from './studio-state';

const DRAFT_STORAGE_KEY = 'caseye_studio_draft';
const AUTO_SAVE_INTERVAL_MS = 30_000; // FR-DES-20 / US-DES-15: 30s non-interrupting auto-save

export interface StoredDraft {
  savedAt: string;
  modelId: string;
  layers: CanvasLayer[];
  caseBg: string;
  designName: string;
}

/**
 * StudioDraft – Giai đoạn 5
 * Quản lý lưu nháp tự động (30s timer) vào localStorage cho khách vãng lai (US-DES-15, US-DES-16).
 * Khi khách đăng nhập: nhắc đồng bộ nháp sang Supabase.
 */
@Injectable({ providedIn: 'root' })
export class StudioDraft implements OnDestroy {
  private readonly state = inject(StudioState);

  /** Whether a draft was found in localStorage on boot */
  readonly hasDraftToRestore = signal<boolean>(false);

  /** Timestamp of the found draft */
  readonly draftSavedAt = signal<string | null>(null);

  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  // Computed snapshot for auto-save
  private readonly snapshot = computed<StoredDraft>(() => ({
    savedAt: new Date().toISOString(),
    modelId: this.state.selectedModel().id,
    layers: this.state.layers(),
    caseBg: this.state.caseBg(),
    designName: this.state.designName(),
  }));

  constructor() {
    this.checkForExistingDraft();
    this.startAutoSave();
  }

  /** Check localStorage for an existing draft on page load (US-DES-16) */
  private checkForExistingDraft(): void {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as StoredDraft;
        if (draft?.layers && draft.layers.length > 0) {
          this.hasDraftToRestore.set(true);
          this.draftSavedAt.set(draft.savedAt);
        }
      }
    } catch {
      // Silently ignore parse errors
    }
  }

  /** Restore saved draft layers into StudioState (US-DES-16) */
  restoreDraft(): void {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;

      const draft = JSON.parse(raw) as StoredDraft;
      if (draft?.layers) {
        this.state.setLayers(draft.layers);
        if (draft.caseBg) this.state.caseBg.set(draft.caseBg);
        if (draft.designName) this.state.designName.set(draft.designName);
      }
    } catch {
      // Silently ignore
    } finally {
      this.hasDraftToRestore.set(false);
      this.draftSavedAt.set(null);
    }
  }

  /** Dismiss restore offer without loading (user chose to start fresh) */
  dismissDraft(): void {
    this.hasDraftToRestore.set(false);
    this.draftSavedAt.set(null);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  /** Manual save to localStorage */
  saveDraft(): void {
    try {
      const data = this.snapshot();
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage quota exceeded – fail silently
    }
  }

  /** Clear localStorage after user syncs to account (FR-DES-22) */
  clearDraft(): void {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    this.hasDraftToRestore.set(false);
    this.draftSavedAt.set(null);
  }

  /** Start 30s non-interrupting background auto-save timer (BPMN Sub-process 3) */
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => {
      // Only auto-save if there's something on the canvas
      if (this.state.hasLayers()) {
        this.saveDraft();
      }
    }, AUTO_SAVE_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer);
    }
  }
}
