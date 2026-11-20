import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CheckoutStep } from '../../checkout.types';

@Component({
  selector: 'app-checkout-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="checkout-tracker-wrapper">
      <div class="checkout-tracker-container">
        <div class="checkout-stepper" role="progressbar" aria-label="Tiến trình đặt hàng">
          <!-- Bước 1: Giỏ hàng (Đã qua) -->
          <div class="stepper-item stepper-item--completed">
            <div class="stepper-circle">
              <span class="material-symbols-outlined">check</span>
            </div>
            <div class="stepper-info">
              <span class="stepper-sub">Bước 1</span>
              <span class="stepper-title">Giỏ hàng</span>
            </div>
          </div>

          <!-- Đường nối 1 -> 2 -->
          <div class="stepper-line stepper-line--active"></div>

          <!-- Bước 2: Thanh toán & Đặt hàng -->
          <div
            class="stepper-item"
            [class.stepper-item--active]="currentStep() === 'form' || currentStep() === 'processing'"
            [class.stepper-item--warning]="currentStep() === 'failed'"
            [class.stepper-item--completed]="currentStep() === 'success'"
          >
            <div class="stepper-circle">
              @if (currentStep() === 'success') {
                <span class="material-symbols-outlined">check</span>
              } @else if (currentStep() === 'processing') {
                <span class="material-symbols-outlined spinner">sync</span>
              } @else if (currentStep() === 'failed') {
                <span class="material-symbols-outlined">priority_high</span>
              } @else {
                <span>2</span>
              }
            </div>
            <div class="stepper-info">
              <span class="stepper-sub">
                @if (currentStep() === 'processing') {
                  Đang đối soát
                } @else if (currentStep() === 'failed') {
                  Cần thử lại
                } @else if (currentStep() === 'success') {
                  Đã thanh toán
                } @else {
                  Bước 2
                }
              </span>
              <span class="stepper-title">Thanh toán</span>
            </div>
          </div>

          <!-- Đường nối 2 -> 3 -->
          <div
            class="stepper-line"
            [class.stepper-line--active]="currentStep() === 'success'"
          ></div>

          <!-- Bước 3: Hoàn tất -->
          <div
            class="stepper-item"
            [class.stepper-item--active]="currentStep() === 'success'"
            [class.stepper-item--completed]="currentStep() === 'success'"
            [class.stepper-item--pending]="currentStep() !== 'success'"
          >
            <div class="stepper-circle">
              @if (currentStep() === 'success') {
                <span class="material-symbols-outlined">verified</span>
              } @else {
                <span>3</span>
              }
            </div>
            <div class="stepper-info">
              <span class="stepper-sub">
                @if (currentStep() === 'success') {
                  Xưởng in UV
                } @else {
                  Bước 3
                }
              </span>
              <span class="stepper-title">Hoàn tất</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .checkout-tracker-wrapper {
      background-color: var(--color-surface-card, #ffffff);
      border-bottom: 1px solid var(--color-line-border, #e8e6ef);
      box-shadow: 0 2px 8px rgba(67, 48, 117, 0.04);
      margin-bottom: 1.5rem;
    }

    .checkout-tracker-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0.875rem 1rem;
      display: flex;
      align-items: center;
      justify-content: center;

      @media (min-width: 768px) {
        padding: 1rem 1.5rem;
      }
    }

    .checkout-stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 44rem;
      gap: 0.5rem;

      @media (min-width: 640px) {
        gap: 1rem;
      }
    }

    .stepper-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      user-select: none;
      flex-shrink: 0;

      .stepper-circle {
        width: 2.125rem;
        height: 2.125rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8125rem;
        font-weight: 800;
        transition: all 0.25s ease;
        flex-shrink: 0;

        .material-symbols-outlined {
          font-size: 1.125rem;
        }
      }

      .stepper-info {
        display: flex;
        flex-direction: column;
        min-width: 0;

        .stepper-sub {
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
          color: var(--color-ink-soft, #52525b);
          line-height: 1.2;

          @media (max-width: 480px) {
            display: none;
          }
        }

        .stepper-title {
          font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif);
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--color-ink-soft, #52525b);
          line-height: 1.2;
          margin-top: 0.125rem;

          @media (min-width: 640px) {
            font-size: 0.875rem;
          }
        }
      }

      &--completed {
        .stepper-circle {
          background: var(--color-state-success, #16a34a);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(22, 163, 74, 0.25);
        }

        .stepper-title {
          color: var(--color-brand-900, #2a1d4d);
        }
      }

      &--active {
        .stepper-circle {
          background: linear-gradient(135deg, var(--color-brand-800, #433075), #6a53b0);
          color: #ffffff;
          box-shadow: 0 0 0 4px rgba(106, 83, 176, 0.2), 0 4px 12px rgba(67, 48, 117, 0.25);
        }

        .stepper-sub {
          color: var(--color-brand-600, #6a53b0);
        }

        .stepper-title {
          color: var(--color-primary, #2d185e);
          font-weight: 800;
        }
      }

      &--warning {
        .stepper-circle {
          background: var(--color-state-warning, #d97706);
          color: #ffffff;
          box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.25);
        }

        .stepper-sub,
        .stepper-title {
          color: var(--color-state-warning, #d97706);
        }
      }

      &--pending {
        .stepper-circle {
          background: var(--color-surface-canvas, #fafafa);
          color: var(--color-ink-soft, #52525b);
          border: 1.5px solid var(--color-line-border, #e8e6ef);
        }

        .stepper-sub,
        .stepper-title {
          color: #a1a1aa;
        }
      }
    }

    .stepper-line {
      flex: 1;
      height: 2px;
      min-width: 1rem;
      max-width: 4.5rem;
      background: var(--color-line-border, #e8e6ef);
      border-radius: 9999px;
      transition: all 0.3s ease;

      &--active {
        background: linear-gradient(to right, var(--color-state-success, #16a34a), var(--color-brand-600, #6a53b0));
      }
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class CheckoutStepper {
  readonly currentStep = input.required<CheckoutStep>();
}
