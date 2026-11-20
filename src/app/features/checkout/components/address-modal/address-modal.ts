import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckoutService } from '../../services/checkout.service';
import { CheckoutAddressBook } from '../../services/checkout-address';

interface AddressValidationErrors {
  fullName?: string;
  phone?: string;
  city?: string;
  district?: string;
  ward?: string;
  streetAddress?: string;
}

export const VIETNAM_LOCATIONS: Record<string, string[]> = {
  'TP. Hồ Chí Minh': [
    'Quận 1',
    'Quận 3',
    'Quận 4',
    'Quận 5',
    'Quận 6',
    'Quận 7',
    'Quận 8',
    'Quận 10',
    'Quận 11',
    'Quận 12',
    'Bình Thạnh',
    'Phú Nhuận',
    'Gò Vấp',
    'Tân Bình',
    'Tân Phú',
    'Bình Tân',
    'TP. Thủ Đức',
    'Huyện Nhà Bè',
    'Huyện Hóc Môn',
    'Huyện Bình Chánh',
    'Huyện Củ Chi',
    'Huyện Cần Giờ',
  ],
  'Hà Nội': [
    'Quận Ba Đình',
    'Quận Hoàn Kiếm',
    'Quận Tây Hồ',
    'Quận Long Biên',
    'Quận Cầu Giấy',
    'Quận Đống Đa',
    'Quận Hai Bà Trưng',
    'Quận Hoàng Mai',
    'Quận Thanh Xuân',
    'Quận Nam Từ Liêm',
    'Quận Bắc Từ Liêm',
    'Quận Hà Đông',
    'Thị xã Sơn Tây',
    'Huyện Gia Lâm',
    'Huyện Đông Anh',
    'Huyện Sóc Sơn',
    'Huyện Thanh Trì',
  ],
  'Đà Nẵng': [
    'Quận Hải Châu',
    'Quận Thanh Khê',
    'Quận Sơn Trà',
    'Quận Ngũ Hành Sơn',
    'Quận Liên Chiểu',
    'Quận Cẩm Lệ',
    'Huyện Hòa Vang',
  ],
  'Hải Phòng': [
    'Quận Hồng Bàng',
    'Quận Ngô Quyền',
    'Quận Lê Chân',
    'Quận Hải An',
    'Quận Kiến An',
    'Quận Đồ Sơn',
    'Quận Dương Kinh',
    'Huyện Thủy Nguyên',
    'Huyện An Dương',
  ],
  'Cần Thơ': [
    'Quận Ninh Kiều',
    'Quận Bình Thủy',
    'Quận Cái Răng',
    'Quận Ô Môn',
    'Quận Thốt Nốt',
    'Huyện Phong Điền',
  ],
  'Bình Dương': [
    'TP. Thủ Dầu Một',
    'TP. Thuận An',
    'TP. Dĩ An',
    'TP. Tân Uyên',
    'TP. Bến Cát',
    'Huyện Bàu Bàng',
    'Huyện Bắc Tân Uyên',
  ],
  'Đồng Nai': [
    'TP. Biên Hòa',
    'TP. Long Khánh',
    'Huyện Long Thành',
    'Huyện Nhơn Trạch',
    'Huyện Trảng Bom',
    'Huyện Thống Nhất',
  ],
  'Bà Rịa - Vũng Tàu': [
    'TP. Vũng Tàu',
    'TP. Bà Rịa',
    'TX. Phú Mỹ',
    'Huyện Long Điền',
    'Huyện Đất Đỏ',
    'Huyện Xuyên Mộc',
  ],
  'Khánh Hòa': [
    'TP. Nha Trang',
    'TP. Cam Ranh',
    'TX. Ninh Hòa',
    'Huyện Diên Khánh',
    'Huyện Cam Lâm',
  ],
  'Lâm Đồng': [
    'TP. Đà Lạt',
    'TP. Bảo Lộc',
    'Huyện Đức Trọng',
    'Huyện Di Linh',
    'Huyện Đơn Dương',
  ],
};

@Component({
  selector: 'app-address-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-dialog modal-dialog--lg" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-header__title-group">
            <span class="material-symbols-outlined header-icon">edit_location_alt</span>
            <div>
              <h3 class="modal-title">Thay đổi địa chỉ giao hàng</h3>
              <p class="modal-subtitle">Hỗ trợ tự động tra cứu Quận/Huyện & Định vị GPS trên bản đồ</p>
            </div>
          </div>
          <button type="button" class="btn-close" (click)="onClose()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <!-- 1. Họ tên & SĐT -->
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" for="mName">
                <span>Họ và tên người nhận</span>
                <span class="required">*</span>
              </label>
              <input
                id="mName"
                type="text"
                class="form-control"
                [class.form-control--error]="addressErrors().fullName"
                placeholder="Ví dụ: Nguyễn Minh Anh"
                [ngModel]="editName()"
                (ngModelChange)="editName.set($event)"
              />
              @if (addressErrors().fullName) {
                <p class="form-error">{{ addressErrors().fullName }}</p>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="mPhone">
                <span>Số điện thoại người nhận</span>
                <span class="required">*</span>
              </label>
              <input
                id="mPhone"
                type="tel"
                class="form-control"
                [class.form-control--error]="addressErrors().phone"
                placeholder="Ví dụ: 0912345678"
                [ngModel]="editPhone()"
                (ngModelChange)="editPhone.set($event)"
              />
              @if (addressErrors().phone) {
                <p class="form-error">{{ addressErrors().phone }}</p>
              }
            </div>
          </div>

          <!-- 2. Tỉnh/Thành phố & Quận/Huyện động -->
          <div class="form-row-2">
            <!-- Tỉnh / Thành phố -->
            <div class="form-group">
              <label class="form-label" for="mCity">
                <span>Tỉnh / Thành phố</span>
                <span class="required">*</span>
              </label>
              <select
                id="mCity"
                class="form-control form-select"
                [class.form-control--error]="addressErrors().city"
                [ngModel]="editCity()"
                (ngModelChange)="onCityChange($event)"
              >
                @for (c of cityOptions; track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
              @if (addressErrors().city) {
                <p class="form-error">{{ addressErrors().city }}</p>
              }
            </div>

            <!-- Quận / Huyện tương ứng theo Tỉnh đã chọn -->
            <div class="form-group">
              <label class="form-label" for="mDistrict">
                <span>Quận / Huyện</span>
                <span class="required">*</span>
                <span class="form-label__badge">{{ availableDistricts().length }} khu vực</span>
              </label>
              <select
                id="mDistrict"
                class="form-control form-select"
                [class.form-control--error]="addressErrors().district"
                [ngModel]="editDistrict()"
                (ngModelChange)="onDistrictChange($event)"
              >
                @for (d of availableDistricts(); track d) {
                  <option [value]="d">{{ d }}</option>
                }
              </select>
              @if (addressErrors().district) {
                <p class="form-error">{{ addressErrors().district }}</p>
              }
            </div>
          </div>

          <!-- 3. Phường/Xã & Địa chỉ cụ thể -->
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" for="mWard">
                <span>Phường / Xã</span>
                <span class="required">*</span>
              </label>
              <input
                id="mWard"
                type="text"
                class="form-control"
                [class.form-control--error]="addressErrors().ward"
                placeholder="Ví dụ: Phường Bến Nghé"
                [ngModel]="editWard()"
                (ngModelChange)="editWard.set($event)"
              />
              @if (addressErrors().ward) {
                <p class="form-error">{{ addressErrors().ward }}</p>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="mStreet">
                <span>Số nhà, tên đường, tòa nhà</span>
                <span class="required">*</span>
              </label>
              <input
                id="mStreet"
                type="text"
                class="form-control"
                [class.form-control--error]="addressErrors().streetAddress"
                placeholder="Ví dụ: Căn hộ 12.04 Tháp B, Saigon Riverside"
                [ngModel]="editStreet()"
                (ngModelChange)="editStreet.set($event)"
              />
              @if (addressErrors().streetAddress) {
                <p class="form-error">{{ addressErrors().streetAddress }}</p>
              }
            </div>
          </div>

          <!-- 4. Interactive Map Confirmation (Xác nhận địa chỉ trên bản đồ) -->
          <div class="map-confirmation-card">
            <div class="map-confirmation-header">
              <div class="map-badge">
                <span class="material-symbols-outlined map-icon">map</span>
                <span>Bản đồ định vị giao hàng</span>
              </div>
              <div class="gps-coords">
                <span class="dot-gps"></span>
                <span>{{ currentCoords() }}</span>
              </div>
            </div>

            <!-- Simulated Interactive Map Canvas -->
            <div class="map-canvas">
              <!-- Vector Road Grids & River contour -->
              <div class="map-grid-layer">
                <div class="road-h road-h-1"></div>
                <div class="road-h road-h-2"></div>
                <div class="road-v road-v-1"></div>
                <div class="road-v road-v-2"></div>
                <div class="water-body"></div>
              </div>

              <!-- Animated Map Center Pin -->
              <div class="map-pin-container">
                <div class="pin-radar"></div>
                <div class="pin-radar pin-radar--delay"></div>
                <div class="map-pin">
                  <span class="material-symbols-outlined">location_on</span>
                </div>
                <div class="pin-shadow"></div>
              </div>

              <!-- Floating Address Bubble on Map -->
              <div class="map-floating-bubble">
                <span class="material-symbols-outlined bubble-icon">home_pin</span>
                <div class="bubble-text">
                  <strong class="bubble-title">{{ editStreet() || 'Địa chỉ giao hàng' }}</strong>
                  <span class="bubble-address">{{ editWard() }}, {{ editDistrict() }}, {{ editCity() }}</span>
                </div>
              </div>

              <!-- Zoom Controls -->
              <div class="map-controls">
                <button type="button" class="btn-ctrl" (click)="zoomIn()" title="Phóng to">+</button>
                <button type="button" class="btn-ctrl" (click)="zoomOut()" title="Thu nhỏ">−</button>
              </div>
            </div>

            <!-- Confirmation Toggle Button -->
            <div class="map-action-bar">
              <label class="map-confirm-checkbox" (click)="toggleMapConfirm()">
                <div class="custom-checkbox" [class.custom-checkbox--checked]="isMapConfirmed()">
                  <span class="material-symbols-outlined">check</span>
                </div>
                <div class="checkbox-label">
                  <strong>Xác nhận vị trí này trên bản đồ giao nhận</strong>
                  <span class="checkbox-sub">Hệ thống bưu tá sẽ định vị chính xác vị trí nhà bạn theo tọa độ này.</span>
                </div>
              </label>

              @if (isMapConfirmed()) {
                <span class="badge badge--verified">
                  <span class="material-symbols-outlined">verified</span>
                  Đã khóa tọa độ
                </span>
              }
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" (click)="onClose()">Hủy</button>
          <button type="button" class="btn-cta btn-cta--sm" [disabled]="saving()" (click)="saveAddress()">
            <span class="material-symbols-outlined">save</span>
            <span>Lưu & Xác nhận địa chỉ</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 999;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-dialog {
      background: #ffffff;
      border-radius: 1.25rem;
      max-width: 32rem;
      width: 100%;
      padding: 1.5rem;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 1.125rem;
      max-height: 90vh;
      overflow-y: auto;

      &--lg {
        max-width: 42rem;
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--color-line-border, #e8e6ef);

      &__title-group {
        display: flex;
        align-items: center;
        gap: 0.625rem;

        .header-icon {
          font-size: 1.625rem;
          color: var(--color-brand-600, #6a53b0);
          background: var(--color-brand-50, #f6f3fe);
          padding: 0.375rem;
          border-radius: 0.625rem;
        }

        .modal-title {
          font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif);
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-primary, #2d185e);
          margin: 0;
        }

        .modal-subtitle {
          font-size: 0.75rem;
          color: var(--color-ink-soft, #52525b);
          margin: 0.125rem 0 0;
        }
      }

      .btn-close {
        background: none;
        border: none;
        color: var(--color-ink-soft, #52525b);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--color-primary, #2d185e);
        }
      }
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;

      @media (min-width: 640px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-on-surface, #1a1b23);
      display: flex;
      align-items: center;
      gap: 0.375rem;

      &__badge {
        font-size: 0.6875rem;
        font-weight: 500;
        color: var(--color-brand-600, #6a53b0);
        background: var(--color-brand-50, #f6f3fe);
        padding: 0.125rem 0.375rem;
        border-radius: 0.375rem;
        margin-left: auto;
      }
    }

    .required {
      color: var(--color-state-error, #dc2626);
    }

    .form-control {
      width: 100%;
      background: var(--color-surface-canvas, #fafafa);
      border-radius: 0.75rem;
      padding: 0.6875rem 0.875rem;
      font-size: 0.875rem;
      border: 1px solid var(--color-line-border, #e8e6ef);
      color: var(--color-on-surface, #1a1b23);
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        background: #ffffff;
        border-color: var(--color-brand-400, #a58cf4);
        box-shadow: 0 0 0 3px rgba(165, 140, 244, 0.2);
      }

      &--error {
        border-color: var(--color-state-error, #dc2626) !important;
        background-color: #fffbfa;
      }
    }

    .form-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236a53b0'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1.25rem;
      padding-right: 2rem;
      cursor: pointer;
    }

    .form-error {
      font-size: 0.75rem;
      color: var(--color-state-error, #dc2626);
      margin: 0.125rem 0 0;
    }

    /* Map Confirmation Card */
    .map-confirmation-card {
      background: var(--color-surface-canvas, #fafafa);
      border: 1px solid var(--color-line-border, #e8e6ef);
      border-radius: 1rem;
      padding: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .map-confirmation-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .map-badge {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.8125rem;
        font-weight: 700;
        color: var(--color-brand-800, #433075);

        .map-icon {
          font-size: 1.125rem;
          color: var(--color-brand-600, #6a53b0);
        }
      }

      .gps-coords {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.6875rem;
        font-family: monospace;
        color: #059669;
        background: #ecfdf5;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-weight: 600;

        .dot-gps {
          width: 0.4rem;
          height: 0.4rem;
          border-radius: 50%;
          background: #10b981;
          animation: gpsBlink 1.2s infinite;
        }
      }
    }

    @keyframes gpsBlink {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    /* Map Canvas with simulated vector styling */
    .map-canvas {
      position: relative;
      height: 10.5rem;
      border-radius: 0.75rem;
      background: #e5e9f2;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .map-grid-layer {
      position: absolute;
      inset: 0;
      background: #eef2f8;

      .road-h {
        position: absolute;
        width: 100%;
        height: 12px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

        &-1 { top: 30%; }
        &-2 { top: 75%; height: 16px; }
      }

      .road-v {
        position: absolute;
        height: 100%;
        width: 14px;
        background: #ffffff;
        box-shadow: 1px 0 2px rgba(0, 0, 0, 0.05);

        &-1 { left: 25%; }
        &-2 { left: 68%; width: 20px; }
      }

      .water-body {
        position: absolute;
        top: 0;
        right: 0;
        width: 35%;
        height: 60%;
        background: #c7dcf7;
        border-bottom-left-radius: 50%;
        opacity: 0.75;
      }
    }

    /* Animated Map Pin */
    .map-pin-container {
      position: absolute;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .map-pin {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50% 50% 50% 0;
      background: #dc2626;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
      animation: pinBounce 2s ease-in-out infinite;

      .material-symbols-outlined {
        transform: rotate(45deg);
        color: #ffffff;
        font-size: 1.25rem;
      }
    }

    .pin-radar {
      position: absolute;
      width: 2rem;
      height: 1rem;
      border-radius: 50%;
      border: 2px solid rgba(220, 38, 38, 0.6);
      bottom: -0.375rem;
      animation: radarExpand 2s infinite ease-out;

      &--delay {
        animation-delay: 1s;
      }
    }

    @keyframes pinBounce {
      0%, 100% { transform: translateY(0) rotate(-45deg); }
      50% { transform: translateY(-6px) rotate(-45deg); }
    }

    @keyframes radarExpand {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    .map-floating-bubble {
      position: absolute;
      bottom: 0.625rem;
      left: 0.625rem;
      z-index: 12;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(6px);
      padding: 0.375rem 0.625rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(0, 0, 0, 0.06);
      display: flex;
      align-items: center;
      gap: 0.375rem;
      max-width: calc(100% - 4.5rem);

      .bubble-icon {
        color: #dc2626;
        font-size: 1.125rem;
      }

      .bubble-text {
        display: flex;
        flex-direction: column;
        overflow: hidden;

        .bubble-title {
          font-size: 0.6875rem;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bubble-address {
          font-size: 0.625rem;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    .map-controls {
      position: absolute;
      top: 0.625rem;
      right: 0.625rem;
      z-index: 12;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .btn-ctrl {
        width: 1.625rem;
        height: 1.625rem;
        border-radius: 0.375rem;
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.12);
        color: #374151;
        font-size: 0.875rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);

        &:hover {
          background: #f3f4f6;
        }
      }
    }

    .map-action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.375rem;
    }

    .map-confirm-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;

      .custom-checkbox {
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 0.375rem;
        border: 1.5px solid var(--color-line-border, #d1d5db);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        .material-symbols-outlined {
          font-size: 0.875rem;
          color: #ffffff;
          display: none;
        }

        &--checked {
          background: #10b981;
          border-color: #10b981;

          .material-symbols-outlined {
            display: block;
          }
        }
      }

      .checkbox-label {
        display: flex;
        flex-direction: column;

        strong {
          font-size: 0.75rem;
          color: var(--color-primary, #2d185e);
        }

        .checkbox-sub {
          font-size: 0.6875rem;
          color: var(--color-ink-soft, #52525b);
        }
      }
    }

    .badge--verified {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 700;
      color: #065f46;
      background: #d1fae5;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;

      .material-symbols-outlined {
        font-size: 0.875rem;
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-line-border, #e8e6ef);
    }

    .btn-secondary {
      background: var(--color-surface-canvas, #fafafa);
      border: 1px solid var(--color-line-border, #e8e6ef);
      color: var(--color-ink-soft, #52525b);
      padding: 0.625rem 1.25rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: var(--color-surface-container-high, #e9e7f2);
        color: var(--color-primary, #2d185e);
      }
    }

    .btn-cta {
      background: var(--color-brand-800, #433075);
      color: #ffffff;
      border: none;
      padding: 0.625rem 1.25rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      transition: background 0.2s ease;

      .material-symbols-outlined {
        font-size: 1rem;
      }

      &:hover {
        background: var(--color-brand-600, #6a53b0);
      }
    }
  `]
})
export class AddressModal {
  private readonly checkoutService = inject(CheckoutService);

  readonly close = output<void>();
  readonly addressSaved = output<string>();

  readonly editName = signal(this.checkoutService.address().fullName);
  readonly editPhone = signal(this.checkoutService.address().phone);
  readonly editCity = signal(this.checkoutService.address().city || 'TP. Hồ Chí Minh');
  readonly editDistrict = signal(this.checkoutService.address().district || 'Quận 1');
  readonly editWard = signal(this.checkoutService.address().ward ?? '');
  readonly editStreet = signal(this.checkoutService.address().detailAddress ?? '');
  private readonly addressBook = inject(CheckoutAddressBook);
  readonly saving = signal(false);
  readonly isMapConfirmed = signal(true);
  readonly addressErrors = signal<AddressValidationErrors>({});

  readonly cityOptions = Object.keys(VIETNAM_LOCATIONS);

  // Danh sách Quận / Huyện tương ứng với Tỉnh / Thành phố đang chọn
  readonly availableDistricts = computed(() => {
    const city = this.editCity();
    return VIETNAM_LOCATIONS[city] || [];
  });

  // Tọa độ GPS mô phỏng thay đổi theo quận/thành phố
  readonly currentCoords = computed(() => {
    const city = this.editCity();
    if (city === 'Hà Nội') return '21.0285° N, 105.8542° E';
    if (city === 'Đà Nẵng') return '16.0544° N, 108.2022° E';
    if (city === 'Hải Phòng') return '20.8449° N, 106.6881° E';
    if (city === 'Cần Thơ') return '10.0452° N, 105.7469° E';
    return '10.7769° N, 106.7009° E';
  });

  onCityChange(newCity: string): void {
    this.editCity.set(newCity);
    const districts = VIETNAM_LOCATIONS[newCity] || [];
    if (districts.length > 0 && !districts.includes(this.editDistrict())) {
      this.editDistrict.set(districts[0]);
    }
  }

  onDistrictChange(newDistrict: string): void {
    this.editDistrict.set(newDistrict);
  }

  toggleMapConfirm(): void {
    this.isMapConfirmed.update((v) => !v);
  }

  zoomIn(): void {}
  zoomOut(): void {}

  onClose(): void {
    this.close.emit();
  }

  async saveAddress(): Promise<void> {
    if (this.saving()) return;
    const name = this.editName().trim();
    const phone = this.editPhone().trim();
    const city = this.editCity().trim();
    const district = this.editDistrict().trim();
    const ward = this.editWard().trim();
    const street = this.editStreet().trim();

    const errors: AddressValidationErrors = {};

    if (!name || name.length < 2) {
      errors.fullName = 'Vui lòng nhập họ và tên người nhận (tối thiểu 2 ký tự)';
    }

    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phone) {
      errors.phone = 'Vui lòng nhập số điện thoại người nhận';
    } else if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      errors.phone = 'Số điện thoại không hợp lệ (Ví dụ: 0912345678 hoặc 038...)';
    }

    if (!city) errors.city = 'Vui lòng chọn Tỉnh / Thành phố';
    if (!district) errors.district = 'Vui lòng chọn Quận / Huyện';
    if (!ward) errors.ward = 'Vui lòng nhập Phường / Xã';
    if (!street || street.length < 4) {
      errors.streetAddress = 'Vui lòng nhập số nhà, tên đường cụ thể (tối thiểu 4 ký tự)';
    }

    if (Object.keys(errors).length > 0) {
      this.addressErrors.set(errors);
      return;
    }

    const fullStreetAddress = `${street}, ${ward}, ${district}, ${city}`;
    const edited = {
      ...this.checkoutService.address(),
      fullName: name,
      phone,
      city,
      district,
      ward,
      detailAddress: street,
      streetAddress: fullStreetAddress,
      isVerified: this.isMapConfirmed(),
    };

    // Saved in the customer's address book (table `addresses`), the same list as Tài khoản › Địa chỉ.
    this.saving.set(true);
    const result = await this.addressBook.save(edited);
    this.saving.set(false);
    if (result.error) {
      this.addressErrors.set({ streetAddress: `Chưa lưu được địa chỉ: ${result.error.message}` });
      return;
    }
    this.checkoutService.updateAddress({ ...result.data, isVerified: this.isMapConfirmed() });

    this.addressErrors.set({});
    this.addressSaved.emit('Đã lưu địa chỉ vào sổ địa chỉ của bạn!');
    this.onClose();
  }
}
