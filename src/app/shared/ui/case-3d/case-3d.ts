import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { PhoneCaseTone } from '../phone-case-mock/phone-case-mock';
import { productImage, productTexture } from '../../../features/shop/catalog';

/** Interactive CSS 3D approximation. Replace with actual per-model GLB + 3D renderer for production. */
@Component({
  selector: 'app-case-3d',
  standalone: true,
  templateUrl: './case-3d.html',
  styleUrl: './case-3d.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Case3d {
  readonly tone = input<PhoneCaseTone>('lilac');
  readonly caption = input('CasEYE');
  readonly productId = input('lilac-dream');
  readonly model = input('iPhone 16 Pro');
  protected readonly imageUrl = computed(() => productTexture(this.productId()));
  protected readonly coverUrl = computed(() => productImage(this.productId()));
  protected readonly rotateY = signal(18);
  protected readonly rotateX = signal(8);
  protected readonly isDragging = signal(false);
  protected readonly cameraCount = computed(() => this.model().includes('Pro') || this.model().includes('Ultra') ? 3 : 2);
  private pointerX = 0;
  private pointerY = 0;

  protected begin(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.isDragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  protected move(event: PointerEvent): void {
    if (!this.isDragging()) return;
    const dx = event.clientX - this.pointerX;
    const dy = event.clientY - this.pointerY;
    this.rotateY.update(v => v + dx * 0.65);
    this.rotateX.update(v => Math.max(-50, Math.min(50, v - dy * 0.35)));
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
  }
  protected end(): void { this.isDragging.set(false); }
  protected spin(direction: number): void { this.rotateY.update(v => v + direction * 45); }
  protected reset(): void { this.rotateY.set(-24); this.rotateX.set(10); }
}
