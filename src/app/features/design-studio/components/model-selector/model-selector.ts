import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { StudioState } from '../../services/studio-state';

@Component({
  selector: 'app-model-selector',
  standalone: true,
  templateUrl: './model-selector.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelSelector {
  protected readonly state = inject(StudioState);
  protected readonly isOpen = signal(false);

  protected toggleDropdown(): void {
    this.isOpen.update((v) => !v);
  }

  protected closeDropdown(): void {
    this.isOpen.set(false);
  }

  protected onSelectModel(modelId: string): void {
    this.state.requestModelChange(modelId);
    this.isOpen.set(false);
  }

  protected onSelectSku(skuId: string): void {
    this.state.selectSku(skuId);
  }
}
