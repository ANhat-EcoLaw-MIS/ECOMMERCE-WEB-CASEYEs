import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { StudioCatalogService } from '../../services/studio-catalog';
import { StudioState } from '../../services/studio-state';
import { Brand, PhoneModel } from '../../models/studio-domain.model';

@Component({
  selector: 'app-model-picker',
  standalone: true,
  templateUrl: './model-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelPicker {
  private readonly catalog = inject(StudioCatalogService);
  private readonly state = inject(StudioState);
  private readonly router = inject(Router);

  // Available brands & models from catalog
  protected readonly brands = this.catalog.brands;
  protected readonly allModels = this.catalog.models;

  // Selected Brand & Model local signals
  protected readonly selectedBrandId = signal<string>(
    this.catalog.selectedModel().brandId || 'brand-apple'
  );
  protected readonly selectedModelId = signal<string>(
    this.getInitialModelId()
  );

  private getInitialModelId(): string {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('caseyes_active_model');
      if (saved && this.catalog.models().some((m) => m.id === saved)) {
        return saved;
      }
    }
    return this.catalog.selectedModel().id || 'iphone-15-pro-max';
  }

  // Models filtered by selected brand
  protected readonly availableModels = computed(() => {
    const brandId = this.selectedBrandId();
    return this.allModels().filter((m) => m.brandId === brandId && m.isActive);
  });

  // Current selected model object
  protected readonly activeModel = computed<PhoneModel>(() => {
    const modelId = this.selectedModelId();
    return (
      this.allModels().find((m) => m.id === modelId) ??
      this.availableModels()[0] ??
      this.allModels()[0]
    );
  });

  // Specs checklist for current model
  protected readonly currentSpecs = computed<readonly string[]>(() => {
    const model = this.activeModel();
    if (model.specs && model.specs.length > 0) {
      return model.specs;
    }
    // Fallback specs
    return [
      `Kích thước in: ${model.printWidthMm} x ${model.printHeightMm} mm`,
      `Độ phân giải chuẩn: ${model.minPrintDpi} DPI`,
      `Khung viền bảo vệ cụm ${model.safeZoneMask.cameraCutout.lensCount} camera`,
      'Chất liệu ốp cao cấp chống ố vàng',
    ];
  });

  // Handle Brand Change
  protected onBrandChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const brandId = select.value;
    this.selectedBrandId.set(brandId);

    // Auto-select first model of new brand
    const brandModels = this.allModels().filter((m) => m.brandId === brandId && m.isActive);
    if (brandModels.length > 0) {
      this.selectedModelId.set(brandModels[0].id);
    }
  }

  // Handle Model Change
  protected onModelChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedModelId.set(select.value);
  }

  // Quick select brand via click
  protected selectBrand(brandId: string): void {
    this.selectedBrandId.set(brandId);
    const brandModels = this.allModels().filter((m) => m.brandId === brandId && m.isActive);
    if (brandModels.length > 0) {
      this.selectedModelId.set(brandModels[0].id);
    }
  }

  private persistAndSelect(modelId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('caseyes_active_model', modelId);
    }
    this.catalog.selectModel(modelId);
    this.state.requestModelChange(modelId);
  }

  // Primary action: Confirm and navigate to templates
  protected onContinue(): void {
    const modelId = this.selectedModelId();
    this.persistAndSelect(modelId);
    this.router.navigate(['/design-studio/templates']);
  }

  // Quick Start Actions from Mockup 4a
  protected onGoTemplates(): void {
    const modelId = this.selectedModelId();
    this.persistAndSelect(modelId);
    this.router.navigate(['/design-studio/templates']);
  }

  protected onGoAiSuggestion(): void {
    const modelId = this.selectedModelId();
    this.persistAndSelect(modelId);
    this.router.navigate(['/design-studio/templates'], { queryParams: { ai: 'true' } });
  }

  protected onGoBlankCanvas(): void {
    const modelId = this.selectedModelId();
    this.persistAndSelect(modelId);
    this.state.clearCanvas();
    this.state.caseBg.set('#FFFFFF');
    this.router.navigate(['/design-studio/editor']);
  }
}
