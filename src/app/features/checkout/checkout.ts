import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CheckoutService } from './services/checkout.service';
import { PaymentSimulationMode } from './models/checkout.model';
import { CheckoutStep } from './checkout.types';
import { CartState } from '../../core/cart-state/cart-state';
import { OrderIntake } from '../../shared/services/order-intake';
import { ORDER_POLICY_VERSION } from '../../shared/policy/order-policy-ref';
import { CheckoutOrder } from './models/checkout.model';

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
  private readonly cart = inject(CartState);
  private readonly orderIntake = inject(OrderIntake);
  private placedForOrderId: string | null = null;

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
    // Integration: the site cart (Shop + Design Studio) feeds Thanh toán.
    this.checkoutService.loadFromCart(this.cart.items());
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
      this.checkoutService.updateOrderStatus('confirmed', this.checkoutService.selectedPaymentType() === 'cod' ? 'pending' : 'paid', 'printing');
      // Only a real submit creates the order (not ?step=success links or a page reload).
      if (syncUrl) this.placeOrderOnce();
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
    // COD has nothing to reconcile: the order is placed right away.
    this.setStep(this.checkoutService.selectedPaymentType() === 'cod' ? 'success' : 'processing');
  }

  /** Integration: hand the paid (or COD) order to Quản lý đơn hàng exactly once. */
  private placeOrderOnce(): void {
    const order = this.checkoutService.activeOrder();
    if (!order || this.placedForOrderId === order.id || this.checkoutService.placedOrderCode()) return;
    this.placedForOrderId = order.id;
    const result = this.orderIntake.placeOrder(this.toHandoff(order));
    if (result.error) {
      this.checkoutService.placeOrderError.set(result.error.message);
      return;
    }
    this.checkoutService.placeOrderError.set(null);
    this.checkoutService.placedOrderCode.set(result.data.orderCode);
    this.cart.items.set([]);
  }

  private toHandoff(order: CheckoutOrder) {
    const method = order.shippingMethod;
    const standard = this.checkoutService.shippingMethods().find((m) => m.id === 'standard') ?? method;
    const isExpress = method.id === 'express';
    const extras = order.giftPackage.enabled
      ? [{ productName: order.giftPackage.title, phoneModel: 'Quà tặng kèm', baseSku: 'GIFT-HOLOGRAM', isCustom: false, quantity: 1, unitPrice: order.giftPrice }]
      : [];
    return {
      payerName: order.address.fullName,
      recipient: { name: order.address.fullName, phone: order.address.phone },
      shippingAddress: order.address.streetAddress,
      shippingTier: isExpress ? ('Express' as const) : ('Standard' as const),
      shipping: {
        fee: order.shippingFee,
        standardFee: standard.price,
        expressSurcharge: isExpress ? Math.max(0, method.price - standard.price) : 0,
        transitDays: standard.transitDays ?? { min: 1, max: 2 },
      },
      paymentMethod: order.paymentMethod === 'cod' ? ('COD' as const) : ('QR_Transfer' as const),
      paymentTxnRef: order.paymentMethod === 'cod' ? undefined : order.transactionId,
      discount: order.discountAmount,
      policyVersion: ORDER_POLICY_VERSION,
      policyAcceptedAt: this.checkoutService.consentAcceptedAt() ?? new Date().toISOString(),
      items: [
        ...order.items.map((i) => {
          const isCustom = i.productType !== 'IN_STOCK';
          return {
            productName: i.name,
            phoneModel: i.device,
            baseSku: i.baseSku ?? i.designCode,
            isCustom,
            quantity: i.quantity,
            unitPrice: i.price,
            imageUrl: i.imageUrl,
            design: isCustom ? { previewUrl: i.imageUrl, caption: i.name, hasUploadedImage: i.hasUploadedImage ?? false } : undefined,
          };
        }),
        ...extras,
      ],
    };
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
    this.checkoutService.placedOrderCode.set(null);
    this.placedForOrderId = null;
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
