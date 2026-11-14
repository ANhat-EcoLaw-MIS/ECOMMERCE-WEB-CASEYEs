import { Component, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../services/checkout.service';
import { PaymentSimulationMode } from '../../models/checkout.model';

@Component({
  selector: 'app-checkout-processing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-processing.html',
  styleUrl: './checkout-processing.scss',
})
export class CheckoutProcessing implements OnInit, OnDestroy {
  readonly checkoutService = inject(CheckoutService);

  readonly simulationMode = input<PaymentSimulationMode>('random');
  readonly backToForm = output<void>();
  readonly reconciliationDone = output<boolean>();
  readonly copyNotification = output<string>();

  readonly progressPercent = signal(10);
  readonly statusText = signal('Đang kết nối cổng thanh toán an toàn...');

  private progressTimer: any;
  private finalizeTimer: any;

  ngOnInit(): void {
    this.startReconciliation();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.finalizeTimer) clearTimeout(this.finalizeTimer);
  }

  private startReconciliation(): void {
    this.progressPercent.set(10);
    this.statusText.set('Đang kết nối cổng thanh toán an toàn & xác thực phiên...');

    let current = 10;
    this.progressTimer = setInterval(() => {
      current += 15;
      if (current >= 100) {
        current = 100;
        this.progressPercent.set(100);
        clearInterval(this.progressTimer);
        this.finalizeOutcome();
        return;
      }

      this.progressPercent.set(current);
      if (current >= 25 && current < 60) {
        this.statusText.set('Lắng nghe xác nhận biến động số dư tài khoản...');
      } else if (current >= 60 && current < 90) {
        this.statusText.set('Khớp mã giao dịch với hệ thống thanh toán đối tác...');
      } else if (current >= 90) {
        this.statusText.set('Xác thực giao dịch thành công, chuẩn bị chuyển xưởng...');
      }
    }, 650);
  }

  private finalizeOutcome(): void {
    this.finalizeTimer = setTimeout(() => {
      const mode = this.simulationMode();
      let isSuccess = true;

      if (mode === 'always_success') {
        isSuccess = true;
      } else if (mode === 'always_failed') {
        isSuccess = false;
      } else {
        // Random 80% Success, 20% Failed
        isSuccess = Math.random() < 0.8;
      }

      this.reconciliationDone.emit(isSuccess);
    }, 500);
  }

  async copyText(text: string, label: string): Promise<void> {
    const ok = await this.checkoutService.copyToClipboard(text);
    if (ok) {
      this.copyNotification.emit(`Đã sao chép ${label}!`);
    }
  }
}
