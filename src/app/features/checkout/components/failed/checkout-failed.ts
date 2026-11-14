import { Component, OnDestroy, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../services/checkout.service';
import { EWalletProvider, PaymentMethodType } from '../../models/checkout.model';

@Component({
  selector: 'app-checkout-failed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-failed.html',
  styleUrl: './checkout-failed.scss',
})
export class CheckoutFailed implements OnInit, OnDestroy {
  readonly checkoutService = inject(CheckoutService);

  readonly retry = output<void>();
  readonly editOrder = output<void>();
  readonly copyNotification = output<string>();

  readonly isRetrying = signal(false);
  readonly countdownSeconds = signal(15 * 60);
  readonly isCountdownExpired = computed(() => this.countdownSeconds() <= 0);

  private countdownTimer: any;

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  private startCountdown(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.countdownSeconds.update((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
  }

  formatCountdown(): string {
    const total = this.countdownSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  forceExpire(): void {
    this.countdownSeconds.set(0);
  }

  onRetryPayment(): void {
    this.isRetrying.set(true);
    // Cập nhật lại mã giao dịch mới trên cùng một đơn hàng
    this.checkoutService.renewTransaction();

    setTimeout(() => {
      this.isRetrying.set(false);
      this.retry.emit();
    }, 700);
  }

  onSwitchPayment(method: PaymentMethodType, wallet?: EWalletProvider): void {
    this.checkoutService.switchPaymentMethodOnSameOrder(method, wallet);
    this.retry.emit();
  }

  onResetAfterExpiry(): void {
    this.checkoutService.createNewOrder();
    this.editOrder.emit();
  }

  async copyText(text: string, label: string): Promise<void> {
    const ok = await this.checkoutService.copyToClipboard(text);
    if (ok) {
      this.copyNotification.emit(`Đã sao chép ${label}!`);
    }
  }
}
