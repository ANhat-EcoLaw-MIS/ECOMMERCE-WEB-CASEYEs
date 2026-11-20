import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentSimulationMode } from '../../models/checkout.model';
import { CheckoutStep } from '../../checkout.types';

@Component({
  selector: 'app-dev-dock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="dev-dock" aria-label="Bảng điều khiển kiểm thử đồ án">
      <!-- Icon nhỏ tối giản, cố định sát mép phải màn hình -->
      <button
        type="button"
        class="dev-dock__trigger"
        [class.dev-dock__trigger--active]="isOpen()"
        (click)="toggleOpen($event)"
        title="Bật/Tắt công cụ kiểm thử (Dev & Demo)"
        aria-haspopup="dialog"
        [attr.aria-expanded]="isOpen()"
      >
        <span class="material-symbols-outlined dev-dock__icon">tune</span>
        <span class="dev-dock__dot" [class.dev-dock__dot--active]="simulationMode() !== 'random'"></span>
      </button>

      <!-- Panel / Popover nhỏ mở ra khi nhấn icon -->
      @if (isOpen()) {
        <div class="dev-popover" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="dev-popover__header">
            <div class="dev-popover__title-group">
              <span class="material-symbols-outlined dev-popover__icon-main">science</span>
              <div>
                <h4 class="dev-popover__title">Dev Simulation Tools</h4>
                <p class="dev-popover__sub">Công cụ kiểm thử & demo kịch bản</p>
              </div>
            </div>
            <button type="button" class="dev-popover__close" (click)="isOpen.set(false)" aria-label="Đóng bảng">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="dev-popover__body">
            <!-- 1. Chuyển nhanh giữa 4 màn hình Checkout -->
            <div class="dev-card">
              <span class="dev-card__label">
                <span class="material-symbols-outlined">alt_route</span>
                Chuyển nhanh màn hình (Fast Switch)
              </span>
              <div class="dev-tabs">
                <button
                  type="button"
                  class="dev-tab"
                  [class.dev-tab--active]="currentStep() === 'form'"
                  (click)="onStepSelect('form')"
                >
                  <span class="material-symbols-outlined tab-icon">edit_document</span>
                  <span>1. Đặt hàng</span>
                </button>
                <button
                  type="button"
                  class="dev-tab"
                  [class.dev-tab--active]="currentStep() === 'processing'"
                  (click)="onStepSelect('processing')"
                >
                  <span class="material-symbols-outlined tab-icon">sync</span>
                  <span>2. Đối soát</span>
                </button>
                <button
                  type="button"
                  class="dev-tab"
                  [class.dev-tab--active]="currentStep() === 'success'"
                  (click)="onStepSelect('success')"
                >
                  <span class="material-symbols-outlined tab-icon">check_circle</span>
                  <span>3. Thành công</span>
                </button>
                <button
                  type="button"
                  class="dev-tab"
                  [class.dev-tab--active]="currentStep() === 'failed'"
                  (click)="onStepSelect('failed')"
                >
                  <span class="material-symbols-outlined tab-icon">warning</span>
                  <span>4. Gián đoạn</span>
                </button>
              </div>
            </div>

            <!-- 2. Chế độ đối soát thanh toán -->
            <div class="dev-card">
              <span class="dev-card__label">
                <span class="material-symbols-outlined">settings_suggest</span>
                Chế độ đối soát thanh toán
              </span>
              <div class="dev-modes">
                <button
                  type="button"
                  class="dev-mode-option"
                  [class.dev-mode-option--active]="simulationMode() === 'random'"
                  (click)="onModeSelect('random')"
                >
                  <div class="dev-mode-option__radio">
                    <span class="radio-dot"></span>
                  </div>
                  <div class="dev-mode-option__text">
                    <strong>Ngẫu nhiên (80/20)</strong>
                    <span>80% thành công, 20% gián đoạn</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="dev-mode-option"
                  [class.dev-mode-option--active]="simulationMode() === 'always_success'"
                  (click)="onModeSelect('always_success')"
                >
                  <div class="dev-mode-option__radio">
                    <span class="radio-dot"></span>
                  </div>
                  <div class="dev-mode-option__text">
                    <strong>Luôn thành công</strong>
                    <span>Luôn phê duyệt và chuyển sang xưởng in UV</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="dev-mode-option"
                  [class.dev-mode-option--active]="simulationMode() === 'always_failed'"
                  (click)="onModeSelect('always_failed')"
                >
                  <div class="dev-mode-option__radio">
                    <span class="radio-dot"></span>
                  </div>
                  <div class="dev-mode-option__text">
                    <strong>Luôn gián đoạn</strong>
                    <span>Mô phỏng lỗi quét QR / hết thời gian</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- 3. Kích hoạt tức thì khi demo với giảng viên -->
            <div class="dev-card">
              <span class="dev-card__label">
                <span class="material-symbols-outlined">bolt</span>
                Thao tác nhanh cho Demo
              </span>
              <div class="dev-actions">
                <button
                  type="button"
                  class="btn-dev-action btn-dev-action--success"
                  (click)="forceOutcome.emit('success')"
                >
                  <span class="material-symbols-outlined">verified</span>
                  <span>Thành công ngay</span>
                </button>
                <button
                  type="button"
                  class="btn-dev-action btn-dev-action--danger"
                  (click)="forceOutcome.emit('failed')"
                >
                  <span class="material-symbols-outlined">error</span>
                  <span>Gián đoạn ngay</span>
                </button>
                <button
                  type="button"
                  class="btn-dev-action btn-dev-action--warning"
                  (click)="expireTimer.emit()"
                >
                  <span class="material-symbols-outlined">timer_off</span>
                  <span>Hết hạn (00:00)</span>
                </button>
              </div>
            </div>
          </div>

          <div class="dev-popover__footer">
            <span class="material-symbols-outlined">info</span>
            <span>Bảng điều khiển kín đáo, đóng mở nhanh khi thuyết trình đồ án.</span>
          </div>
        </div>

        <!-- Backdrop để đóng khi click ra ngoài -->
        <div class="dev-backdrop" (click)="isOpen.set(false)"></div>
      }
    </aside>
  `,
  styles: [`
    .dev-dock {
      position: fixed;
      bottom: 1.5rem;
      right: 1.25rem;
      z-index: 999;
      font-family: var(--font-body, system-ui, sans-serif);
    }

    .dev-dock__trigger {
      width: 2.375rem;
      height: 2.375rem;
      border-radius: 50%;
      background: #ffffff;
      border: 1px solid var(--color-line-border, #e8e6ef);
      color: var(--color-ink-soft, #52525b);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(67, 48, 117, 0.08);
      transition: all 0.2s ease;
      position: relative;
      outline: none;

      &:hover {
        background: #f6f3fe;
        border-color: #af96ff;
        color: #433075;
        box-shadow: 0 4px 16px rgba(106, 83, 176, 0.2);
      }

      &--active {
        background: #433075;
        border-color: #433075;
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(67, 48, 117, 0.35);
      }
    }

    .dev-dock__icon {
      font-size: 1.125rem;
    }

    .dev-dock__dot {
      position: absolute;
      top: 0.1875rem;
      right: 0.1875rem;
      width: 0.4375rem;
      height: 0.4375rem;
      border-radius: 50%;
      background: transparent;
      transition: background 0.2s ease;

      &--active {
        background: #6a53b0;
        box-shadow: 0 0 0 1.5px #ffffff;
      }
    }

    .dev-backdrop {
      position: fixed;
      inset: 0;
      z-index: 998;
      background: rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(1px);
    }

    .dev-popover {
      position: absolute;
      bottom: 3.25rem;
      right: 0;
      width: 23rem;
      max-width: calc(100vw - 2.5rem);
      background: #ffffff;
      border-radius: 1.25rem;
      border: 1px solid var(--color-line-border, #e8e6ef);
      box-shadow: 0 16px 40px rgba(42, 29, 77, 0.18);
      z-index: 999;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: popIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);

      &__header {
        background: #f4f2fd;
        padding: 0.875rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--color-line-border, #e8e6ef);
      }

      &__title-group {
        display: flex;
        align-items: center;
        gap: 0.625rem;
      }

      &__icon-main {
        font-size: 1.25rem;
        color: #6a53b0;
        background: #ffffff;
        padding: 0.375rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 6px rgba(106, 83, 176, 0.15);
      }

      &__title {
        font-family: var(--font-display, sans-serif);
        font-size: 0.875rem;
        font-weight: 700;
        color: #2d185e;
        margin: 0;
      }

      &__sub {
        font-size: 0.6875rem;
        color: #52525b;
        margin: 0;
      }

      &__close {
        background: none;
        border: none;
        color: #52525b;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;

        &:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #2d185e;
        }

        .material-symbols-outlined {
          font-size: 1.125rem;
        }
      }

      &__body {
        padding: 0.875rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-height: 28rem;
        overflow-y: auto;

        &::-webkit-scrollbar {
          width: 5px;
        }
        &::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 9999px;
        }
      }

      &__footer {
        background: #fafafa;
        padding: 0.625rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.375rem;
        border-top: 1px solid var(--color-line-border, #e8e6ef);
        font-size: 0.6875rem;
        color: #71717a;

        .material-symbols-outlined {
          font-size: 0.875rem;
          color: #6a53b0;
        }
      }
    }

    @keyframes popIn {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .dev-card {
      background: #fafafa;
      border: 1px solid var(--color-line-border, #e8e6ef);
      border-radius: 0.75rem;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      &__label {
        font-size: 0.75rem;
        font-weight: 700;
        color: #433075;
        display: flex;
        align-items: center;
        gap: 0.375rem;

        .material-symbols-outlined {
          font-size: 0.875rem;
          color: #6a53b0;
        }
      }
    }

    .dev-tabs {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.45rem;
    }

    .dev-tab {
      background: #ffffff;
      border: 1px solid var(--color-line-border, #e8e6ef);
      border-radius: 0.5rem;
      padding: 0.5rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #52525b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      transition: all 0.15s ease;
      white-space: nowrap;

      .tab-icon {
        font-size: 0.9375rem;
      }

      &:hover {
        background: #f6f3fe;
        color: #433075;
        border-color: #c4b5fd;
      }

      &--active {
        background: #433075;
        border-color: #433075;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(67, 48, 117, 0.25);

        .tab-icon {
          color: #ffffff;
        }
      }
    }

    .dev-modes {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .dev-mode-option {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      background: #ffffff;
      border: 1px solid var(--color-line-border, #e8e6ef);
      border-radius: 0.5rem;
      padding: 0.5rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;

      &:hover {
        border-color: #af96ff;
        background: #faf9ff;
      }

      &--active {
        border-color: #6a53b0;
        background: #f6f3fe;

        .dev-mode-option__radio {
          border-color: #6a53b0;

          .radio-dot {
            opacity: 1;
          }
        }

        .dev-mode-option__text strong {
          color: #433075;
        }
      }

      &__radio {
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        border: 1.5px solid #d1d5db;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 0.125rem;
        flex-shrink: 0;

        .radio-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: #6a53b0;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
      }

      &__text {
        display: flex;
        flex-direction: column;

        strong {
          font-size: 0.75rem;
          color: #1a1b23;
        }

        span {
          font-size: 0.625rem;
          color: #71717a;
        }
      }
    }

    .dev-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.375rem;
    }

    .btn-dev-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 0.25rem;
      border-radius: 0.5rem;
      border: 1px solid transparent;
      font-size: 0.625rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      .material-symbols-outlined {
        font-size: 1.125rem;
      }

      &--success {
        background: #ecfdf5;
        border-color: #a7f3d0;
        color: #065f46;

        &:hover {
          background: #d1fae5;
        }
      }

      &--danger {
        background: #fef2f2;
        border-color: #fecaca;
        color: #991b1b;

        &:hover {
          background: #fee2e2;
        }
      }

      &--warning {
        background: #fffbeb;
        border-color: #fde68a;
        color: #92400e;

        &:hover {
          background: #fef3c7;
        }
      }
    }
  `]
})
export class DevDock {
  private readonly elementRef = inject(ElementRef);

  readonly currentStep = input<CheckoutStep>('form');
  readonly simulationMode = input<PaymentSimulationMode>('random');

  readonly stepChange = output<CheckoutStep>();
  readonly modeChange = output<PaymentSimulationMode>();
  readonly forceOutcome = output<'success' | 'failed'>();
  readonly expireTimer = output<void>();

  readonly isOpen = signal(false);

  toggleOpen(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isOpen.update((v) => !v);
  }

  onStepSelect(step: CheckoutStep): void {
    this.stepChange.emit(step);
  }

  onModeSelect(mode: PaymentSimulationMode): void {
    this.modeChange.emit(mode);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
