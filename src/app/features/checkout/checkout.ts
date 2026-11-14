import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CheckoutService } from './services/checkout.service';
import { PaymentSimulationMode } from './models/checkout.model';
import { CheckoutStep } from './checkout.types';

// Sub-components
import { CheckoutForm } from './components/form/checkout-form';
import { CheckoutProcessing } from './components/processing/checkout-processing';
import { CheckoutSuccess } from './components/success/checkout-success';
import { CheckoutFailed } from './components/failed/checkout-failed';
import { AddressModal } from './components/address-modal/address-modal';
import { DevDock } from './components/dev-dock/dev-dock';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    CheckoutForm,
    CheckoutProcessing,
    CheckoutSuccess,
    CheckoutFailed,
    AddressModal,
    DevDock,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout implements OnInit {
  readonly checkoutService = inject(CheckoutService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // --- Step & Simulation State ---
  readonly currentStep = signal<CheckoutStep>('form');
  readonly simulationMode = signal<PaymentSimulationMode>('random');
  readonly showAddressModal = signal(false);
  readonly toastMessage = signal<string | null>(null);

  // Template reference to failed component for dev force actions
  readonly failedComp = viewChild<CheckoutFailed>('failedComp');

  private toastTimeout: any;

  ngOnInit(): void {
    // 1. Phục hồi đơn hàng từ sessionStorage nếu có (Single Source of Truth)
    this.checkoutService.restoreFromStorage();
    this.checkoutService.getOrCreateOrder();

    // 2. Đồng bộ trạng thái từ Query Params (?step=form|processing|success|failed)
    this.route.queryParams.subscribe((params) => {
      const step = params['step'] as CheckoutStep;
      if (step && ['form', 'processing', 'success', 'failed'].includes(step)) {
        this.setStep(step, false);
      }
    });
  }

  // --- Step Navigation & State Synchronization ---
  setStep(step: CheckoutStep, syncUrl = true): void {
    this.currentStep.set(step);

    // Cập nhật trạng thái nghiệp vụ đơn hàng tương ứng
    if (step === 'processing') {
      this.checkoutService.updateOrderStatus('processing', 'pending', 'not_started');
    } else if (step === 'success') {
      this.checkoutService.updateOrderStatus('confirmed', 'paid', 'printing');
    } else if (step === 'failed') {
      this.checkoutService.updateOrderStatus('pending', 'failed', 'not_started');
    }

    if (syncUrl) {
      const order = this.checkoutService.activeOrder();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { step, orderCode: order?.orderCode },
        queryParamsHandling: 'merge',
      });
    }
  }

  onOrderSubmitted(): void {
    this.setStep('processing');
  }

  onReconciliationDone(isSuccess: boolean): void {
    this.setStep(isSuccess ? 'success' : 'failed');
  }

  onForceOutcome(outcome: 'success' | 'failed'): void {
    this.setStep(outcome);
    this.showToast(outcome === 'success' ? 'Chuyển thẳng màn Thành công!' : 'Chuyển thẳng màn Gián đoạn!');
  }

  onExpireTimer(): void {
    if (this.currentStep() !== 'failed') {
      this.setStep('failed');
    }
    setTimeout(() => {
      this.failedComp()?.forceExpire();
      this.showToast('Đã hạ đồng hồ đếm ngược bảo lưu về 00:00!');
    }, 50);
  }

  onRetryFromFailed(): void {
    this.setStep('processing');
  }

  onNewOrder(): void {
    this.checkoutService.createNewOrder();
    this.setStep('form');
  }

  showToast(message: string): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage.set(message);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 2500);
  }
}
