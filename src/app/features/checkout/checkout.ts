import { Component, OnDestroy, OnInit, computed, inject, isDevMode, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CheckoutService } from './services/checkout.service';
import { PaymentMethodType, PaymentSimulationMode } from './models/checkout.model';

export type CheckoutStep = 'form' | 'processing' | 'success' | 'failed';

interface AddressValidationErrors {
  fullName?: string;
  phone?: string;
  city?: string;
  district?: string;
  ward?: string;
  streetAddress?: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout implements OnInit, OnDestroy {
  readonly checkoutService = inject(CheckoutService);
  private readonly route = inject(ActivatedRoute);

  // --- Environment & Dev Dock Visibility (Ẩn công khai, chỉ mở khi nhấn trigger hoặc query param) ---
  readonly isDevMode = signal(isDevMode());
  readonly hasDevQueryParam = signal(false);
  readonly showDevPanel = signal(false);

  // --- Step State (Cho phép chạy độc lập toàn bộ quy trình) ---
  readonly currentStep = signal<CheckoutStep>('form');

  // --- UI Signals ---
  readonly isSubmitting = signal(false);
  readonly isRetrying = signal(false);
  readonly copyToast = signal<string | null>(null);
  readonly showAddressModal = signal(false);
  readonly voucherInput = signal('');
  readonly voucherError = signal('');
  readonly showTermsError = signal(false);

  // Structured address form state (modal)
  readonly editName = signal(this.checkoutService.address().fullName);
  readonly editPhone = signal(this.checkoutService.address().phone);
  readonly editCity = signal(this.checkoutService.address().city ?? 'TP. Hồ Chí Minh');
  readonly editDistrict = signal(this.checkoutService.address().district ?? 'Quận 1');
  readonly editWard = signal(this.checkoutService.address().ward ?? 'Phường Bến Nghé');
  readonly editStreet = signal(
    this.checkoutService.address().detailAddress ?? 'Căn hộ 12.04 Tháp B, Saigon Riverside Complex'
  );
  readonly addressErrors = signal<AddressValidationErrors>({});

  // Popular Vietnam cities for fast selection
  readonly cityOptions = signal<string[]>([
    'TP. Hồ Chí Minh',
    'Hà Nội',
    'Đà Nẵng',
    'Hải Phòng',
    'Cần Thơ',
    'Bình Dương',
    'Đồng Nai',
    'Bà Rịa - Vũng Tàu',
    'Khánh Hòa',
    'Lâm Đồng',
  ]);

  // --- Processing view signals (Mô phỏng đối soát) ---
  readonly simulationMode = signal<PaymentSimulationMode>('random');
  readonly progressPercent = signal(0);
  readonly processingStatusText = signal('Khởi tạo cổng đối soát VietQR Pro...');
  readonly txnCode = signal('TXN-CEY98241');
  private progressTimer: any;
  private autoProceedTimer: any;

  // --- Failed view signals (Countdown 15:00) ---
  readonly countdownSeconds = signal(15 * 60);
  readonly isCountdownExpired = computed(() => this.countdownSeconds() <= 0);
  private countdownTimer: any;

  // --- Computed ---
  readonly giftCharsCount = computed(() => this.checkoutService.giftOption().message.length);
  readonly orderCode = computed(() => this.checkoutService.currentOrder()?.orderCode ?? 'CE-89421');

  ngOnInit(): void {
    // Cho phép mở nhanh từng bước qua query param nếu có: ?step=processing, ?step=success, ?step=failed
    // Hoặc kích hoạt Dev Tools qua ?dev=true / ?debug=true
    this.route.queryParams.subscribe((params) => {
      const isDebugParam = params['dev'] === 'true' || params['debug'] === 'true' || params['test'] === 'true';
      if (isDebugParam) {
        this.hasDevQueryParam.set(true);
      }

      const step = params['step'] as CheckoutStep;
      if (step && ['form', 'processing', 'success', 'failed'].includes(step)) {
        this.setStep(step);
      }
    });

    // Khởi tạo bộ đếm ngược bảo lưu giỏ hàng
    this.startCountdown();
  }

  toggleDevPanel(): void {
    this.showDevPanel.update((val) => !val);
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private startCountdown(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.countdownSeconds.update((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
  }

  private clearTimers(): void {
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.autoProceedTimer) clearTimeout(this.autoProceedTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  // --- Step Navigation (Độc lập trong module Checkout) ---
  setStep(step: CheckoutStep): void {
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.autoProceedTimer) clearTimeout(this.autoProceedTimer);

    this.currentStep.set(step);

    if (step === 'processing') {
      this.startPaymentReconciliation();
    }
  }

  /**
   * Luồng mô phỏng tiến trình đối soát thanh toán thực tế (3-5 giây)
   * Có thể xảy ra Thành công (80%) hoặc Thất bại/Gián đoạn (20%) khi ở chế độ ngẫu nhiên.
   */
  private startPaymentReconciliation(): void {
    this.progressPercent.set(10);
    this.processingStatusText.set('Đang kết nối cổng VietQR Pro & mạng liên ngân hàng Napas...');

    let current = 10;
    this.progressTimer = setInterval(() => {
      current += 15;
      if (current >= 100) {
        current = 100;
        this.progressPercent.set(100);
        clearInterval(this.progressTimer);
        this.finalizeSimulation();
        return;
      }

      this.progressPercent.set(current);
      if (current >= 25 && current < 60) {
        this.processingStatusText.set('Lắng nghe webhook xác nhận biến động số dư tài khoản...');
      } else if (current >= 60 && current < 90) {
        this.processingStatusText.set('Khớp mã giao dịch CEY89421 với sao kê ngân hàng MB...');
      } else if (current >= 90) {
        this.processingStatusText.set('Đối soát thành công, chuyển thông số sang xưởng in UV...');
      }
    }, 700);
  }

  private finalizeSimulation(): void {
    this.autoProceedTimer = setTimeout(() => {
      if (this.currentStep() !== 'processing') return;

      const mode = this.simulationMode();
      if (mode === 'always_success') {
        this.setStep('success');
      } else if (mode === 'always_failed') {
        this.setStep('failed');
      } else {
        // Random 80% Success, 20% Failed
        const isSuccess = Math.random() < 0.8;
        this.setStep(isSuccess ? 'success' : 'failed');
      }
    }, 600);
  }

  // --- Manual Override Simulation Controls (Dễ dàng demo cả 2 case cho thầy cô/giảng viên) ---
  forceOutcome(outcome: 'success' | 'failed'): void {
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.autoProceedTimer) clearTimeout(this.autoProceedTimer);
    this.setStep(outcome);
  }

  setSimulationMode(mode: PaymentSimulationMode): void {
    this.simulationMode.set(mode);
  }

  // --- Actions Màn 1: Form ---
  onShippingSelect(id: 'standard' | 'express'): void {
    this.checkoutService.setShippingMethod(id);
  }

  onPaymentSelect(type: PaymentMethodType): void {
    this.checkoutService.setPaymentMethod(type);
  }

  onGiftToggle(checked: boolean): void {
    this.checkoutService.toggleGiftPackage(checked);
  }

  onGiftMessageInput(value: string): void {
    this.checkoutService.updateGiftMessage(value);
  }

  onShipperNoteChange(note: string): void {
    this.checkoutService.setShipperNote(note);
  }

  onTermsToggle(): void {
    this.checkoutService.toggleDesignConfirmed();
    if (this.checkoutService.designConfirmed()) {
      this.showTermsError.set(false);
    }
  }

  applyVoucherCode(): void {
    this.voucherError.set('');
    const code = this.voucherInput().trim();
    if (!code) return;
    const ok = this.checkoutService.applyVoucher(code);
    if (!ok) {
      this.voucherError.set('Mã voucher không hợp lệ hoặc đã hết lượt dùng!');
    } else {
      this.voucherInput.set('');
    }
  }

  removeVoucher(): void {
    this.checkoutService.removeVoucher();
  }

  openAddressModal(): void {
    const cur = this.checkoutService.address();
    this.editName.set(cur.fullName);
    this.editPhone.set(cur.phone);
    this.editCity.set(cur.city ?? 'TP. Hồ Chí Minh');
    this.editDistrict.set(cur.district ?? 'Quận 1');
    this.editWard.set(cur.ward ?? 'Phường Bến Nghé');
    this.editStreet.set(cur.detailAddress ?? cur.streetAddress);
    this.addressErrors.set({});
    this.showAddressModal.set(true);
  }

  saveAddress(): void {
    const name = this.editName().trim();
    const phone = this.editPhone().trim();
    const city = this.editCity().trim();
    const district = this.editDistrict().trim();
    const ward = this.editWard().trim();
    const street = this.editStreet().trim();

    const errors: AddressValidationErrors = {};

    // Validate họ tên
    if (!name || name.length < 2) {
      errors.fullName = 'Vui lòng nhập họ và tên người nhận (tối thiểu 2 ký tự)';
    }

    // Validate số điện thoại Việt Nam
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phone) {
      errors.phone = 'Vui lòng nhập số điện thoại người nhận';
    } else if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      errors.phone = 'Số điện thoại không hợp lệ (Ví dụ: 0912345678 hoặc 038...)';
    }

    // Validate địa chỉ
    if (!city) {
      errors.city = 'Vui lòng chọn Tỉnh / Thành phố';
    }
    if (!district) {
      errors.district = 'Vui lòng nhập Quận / Huyện';
    }
    if (!ward) {
      errors.ward = 'Vui lòng nhập Phường / Xã';
    }
    if (!street || street.length < 4) {
      errors.streetAddress = 'Vui lòng nhập số nhà, tên đường cụ thể (tối thiểu 4 ký tự)';
    }

    if (Object.keys(errors).length > 0) {
      this.addressErrors.set(errors);
      return;
    }

    // Ghép địa chỉ hiển thị chuẩn xác
    const fullStreetAddress = `${street}, ${ward}, ${district}, ${city}`;

    this.checkoutService.updateAddress({
      fullName: name,
      phone,
      city,
      district,
      ward,
      detailAddress: street,
      streetAddress: fullStreetAddress,
      isVerified: true,
    });

    this.addressErrors.set({});
    this.showAddressModal.set(false);
    this.copyToast.set('Đã cập nhật địa chỉ nhận hàng thành công!');
    setTimeout(() => this.copyToast.set(null), 2500);
  }

  closeAddressModal(): void {
    this.showAddressModal.set(false);
  }

  submitOrder(): void {
    // Kiểm tra điều khoản không dùng alert()
    if (!this.checkoutService.designConfirmed()) {
      this.showTermsError.set(true);
      return;
    }

    this.showTermsError.set(false);
    this.isSubmitting.set(true);
    this.checkoutService.generateOrder();

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.setStep('processing');
    }, 700);
  }

  // --- Actions Màn 4: Failed / Retry ---
  retryPayment(): void {
    if (this.isCountdownExpired()) {
      this.resetOrderAfterExpiry();
      return;
    }

    this.isRetrying.set(true);
    setTimeout(() => {
      this.isRetrying.set(false);
      this.setStep('processing');
    }, 1000);
  }

  resetOrderAfterExpiry(): void {
    this.countdownSeconds.set(15 * 60);
    this.checkoutService.generateOrder();
    this.setStep('form');
    this.copyToast.set('Đã khởi tạo đơn hàng mới với mã giao dịch mới!');
    setTimeout(() => this.copyToast.set(null), 2500);
  }

  expireTimerForDemo(): void {
    this.countdownSeconds.set(0);
  }

  changePaymentMethod(method: 'momo' | 'card'): void {
    this.checkoutService.setPaymentMethod(method);
    this.setStep('form');
  }

  // --- Helpers ---
  async copyText(text: string, label: string): Promise<void> {
    const ok = await this.checkoutService.copyToClipboard(text);
    if (ok) {
      this.copyToast.set(`Đã sao chép ${label}!`);
      setTimeout(() => this.copyToast.set(null), 2200);
    }
  }

  formatCountdown(): string {
    const total = this.countdownSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
