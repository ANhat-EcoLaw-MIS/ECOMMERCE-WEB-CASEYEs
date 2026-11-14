import { Component, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ORDER_POLICY_PATH, ORDER_POLICY_VERSION } from '../../../../shared/policy/order-policy-ref';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckoutService } from '../../services/checkout.service';
import { EWalletProvider, PaymentMethodType } from '../../models/checkout.model';

@Component({
  selector: 'app-checkout-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout-form.html',
  styleUrl: './checkout-form.scss',
})
export class CheckoutForm {
  readonly checkoutService = inject(CheckoutService);
  protected readonly policyPath = ORDER_POLICY_PATH;
  protected readonly policyVersion = ORDER_POLICY_VERSION;

  readonly openAddressModal = output<void>();
  readonly orderSubmitted = output<void>();
  readonly copyNotification = output<string>();

  readonly isSubmitting = signal(false);
  readonly showTermsError = signal(false);
  readonly voucherInput = signal('');
  readonly voucherError = signal('');

  // --- Handlers ---
  onShippingSelect(id: 'standard' | 'express'): void {
    this.checkoutService.setShippingMethod(id);
  }

  onPaymentSelect(type: PaymentMethodType): void {
    this.checkoutService.setPaymentMethod(type);
  }

  onEWalletSelect(provider: EWalletProvider): void {
    this.checkoutService.setEWalletProvider(provider);
  }

  onGiftToggle(checked: boolean): void {
    this.checkoutService.toggleGiftPackage(checked);
  }

  onGiftMessageInput(val: string): void {
    this.checkoutService.updateGiftMessage(val);
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

  async copyText(text: string, label: string): Promise<void> {
    const ok = await this.checkoutService.copyToClipboard(text);
    if (ok) {
      this.copyNotification.emit(`Đã sao chép ${label}!`);
    }
  }

  onSubmitOrder(): void {
    if (!this.checkoutService.designConfirmed()) {
      this.showTermsError.set(true);
      return;
    }

    this.showTermsError.set(false);
    this.isSubmitting.set(true);

    // Tạo đơn hàng duy nhất và lưu trạng thái (SSOT)
    this.checkoutService.createNewOrder();

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.orderSubmitted.emit();
    }, 600);
  }
}
