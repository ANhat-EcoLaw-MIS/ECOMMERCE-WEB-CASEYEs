import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { StudioState } from './services/studio-state';
import { StudioCatalogService } from './services/studio-catalog';

@Component({
  selector: 'app-design-studio',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './design-studio.html',
  styleUrl: './design-studio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignStudio implements OnDestroy {
  protected readonly state = inject(StudioState);
  protected readonly catalog = inject(StudioCatalogService);
  protected readonly router = inject(Router);

  // Model Selector Modal in Header Toolbar
  protected readonly showModelModal = signal<boolean>(false);
  protected readonly modalSelectedBrandId = signal<string>('brand-apple');
  protected readonly modalSelectedModelId = signal<string>('iphone-15-pro-max');

  protected readonly brands = this.catalog.brands;
  protected readonly allModels = this.catalog.models;

  protected readonly modalAvailableModels = computed(() => {
    const brandId = this.modalSelectedBrandId();
    return this.allModels().filter((m) => m.brandId === brandId && m.isActive);
  });

  constructor() {
    effect(() => {
      if (typeof document === 'undefined') return;
      if (this.showModelModal() || this.state.isModelChangeModalOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  protected openModelModal(): void {
    this.modalSelectedBrandId.set(this.state.selectedModel().brandId || 'brand-apple');
    this.modalSelectedModelId.set(this.state.selectedModel().id || 'iphone-15-pro-max');
    this.showModelModal.set(true);
  }

  protected closeModelModal(): void {
    this.showModelModal.set(false);
  }

  protected selectModalBrand(brandId: string): void {
    this.modalSelectedBrandId.set(brandId);
    const models = this.allModels().filter((m) => m.brandId === brandId && m.isActive);
    if (models.length > 0) {
      this.modalSelectedModelId.set(models[0].id);
    }
  }

  protected selectModalModel(modelId: string): void {
    this.modalSelectedModelId.set(modelId);
  }

  protected applySelectedModel(): void {
    const modelId = this.modalSelectedModelId();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('caseyes_active_model', modelId);
    }
    this.catalog.selectModel(modelId);
    this.state.requestModelChange(modelId);
    this.closeModelModal();
  }

  // Track active URL reactively via router events
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  protected readonly isSelectModelPage = computed(() => {
    return this.currentUrl().includes('/select-model');
  });

  // 1: Chọn dòng máy | 2: Kho mẫu (templates) | 3: Thiết kế (editor)
  protected readonly currentStep = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/editor')) return 3;
    if (url.includes('/templates')) return 2;
    return 1;
  });

  protected readonly isEditor = computed(() => this.currentStep() === 3);

  protected onConfirmModelChange(): void {
    this.state.confirmModelChange();
  }

  protected onCancelModelChange(): void {
    this.state.cancelModelChange();
  }

  protected onUndo(): void {
    this.state.undo();
  }

  protected onRedo(): void {
    this.state.redo();
  }
}
