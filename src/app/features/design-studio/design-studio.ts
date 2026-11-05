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

  // 1: Chọn dòng máy | 2: Chọn điểm bắt đầu (templates) | 3: Thiết kế (editor) | 4: Preview & lưu
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

  protected onSaveDesign(): void {
    if (!this.state.hasLayers()) {
      alert('Canvas đang trống: hãy thêm ít nhất một phần tử trước khi lưu.');
      return;
    }
    this.state.designStatus.set('SAVED');
    alert('Bản thiết kế đã được lưu an toàn vào mục My Designs của bạn!');
  }

  protected onAddToCart(): void {
    if (this.state.designStatus() === 'REJECTED') {
      alert(
        'Bản thiết kế này từng bị từ chối kiểm duyệt do vi phạm tiêu chuẩn nội dung. Vui lòng chỉnh sửa lại các chi tiết vi phạm trước khi tiến hành đặt mua.'
      );
      return;
    }
    if (!this.state.hasLayers()) {
      alert('Canvas đang trống: hãy thêm ít nhất một phần tử trước khi thêm vào giỏ.');
      return;
    }
    this.state.isCartDrawerOpen.set(true);
  }
}
