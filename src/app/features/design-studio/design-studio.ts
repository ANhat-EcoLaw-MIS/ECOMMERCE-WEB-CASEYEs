import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { ModelSelector } from './components/model-selector/model-selector';
import { StudioState } from './services/studio-state';

@Component({
  selector: 'app-design-studio',
  standalone: true,
  imports: [RouterOutlet, RouterLink, ModelSelector],
  templateUrl: './design-studio.html',
  styleUrl: './design-studio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignStudio {
  protected readonly state = inject(StudioState);
  protected readonly router = inject(Router);

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
