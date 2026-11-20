import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CheckoutService } from './services/checkout.service';
import { CheckoutAddressBook } from './services/checkout-address';
import { PaymentSimulationMode } from './models/checkout.model';
import { CheckoutStep } from './checkout.types';
import { CartState } from '../../core/cart-state/cart-state';
import { OnboardingStatusService } from '../../core/auth/onboarding-status';
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

/** place_order attempts after a successful payment (1 + 2 retries, FR-P-35). */
const PLACE_ORDER_ATTEMPTS = 3;
const PLACE_ORDER_RETRY_MS = 800;

/**
 * Catalog row behind a cart line, from its id:
 *   shop case  `artworkSlug:modelSlug:skuId` · accessory `accessory-…` · studio design `design:<skuId|modelId>:<ts>`.
 */
export function catalogRefFor(lineId: string | undefined, isCustom: boolean): { productSlug?: string; modelSlug?: string; skuId?: string } | undefined {
  if (!lineId) return undefined;
  const [first, second, third] = lineId.split(':');
  if (isCustom) return first === 'design' && second?.startsWith('sku-') ? { skuId: second } : undefined;
  return third ? { productSlug: first, modelSlug: second, skuId: third } : { productSlug: first };
}

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
  private readonly addressBook = inject(CheckoutAddressBook);
  private placedForOrderId: string | null = null;

  // --- Step & Simulation State ---
  readonly currentStep = signal<CheckoutStep>('form');
  readonly simulationMode = signal<PaymentSimulationMode>('random');
  readonly showAddressModal = signal(false);
  readonly toastMessage = signal<string | null>(null);

  // --- Onboarding prompt (team decision 15/11): ask, never redirect on its own ---
  private readonly onboarding = inject(OnboardingStatusService);
  readonly askOnboarding = signal(false);
  readonly onboardingBusy = signal(false);

  // Template reference to failed component for dev force actions
  readonly failedComp = viewChild<CheckoutFailed>('failedComp');

  private toastTimeout: any;

  ngOnInit(): void {
    // A signed-in customer who has not set up their profile yet is asked first (cart and
    // checkout data are kept in local/session storage, so nothing is lost either way).
    void this.onboarding.current().then((status) => this.askOnboarding.set(status === 'pending'));
    // 1. Phục hồi đơn hàng từ sessionStorage nếu có (Single Source of Truth)
    const restored = this.checkoutService.restoreFromStorage();
    // The saved session is a finished order: placed in Quản lý đơn hàng, or paid while place_order failed.
    const finished = !!restored && (!!restored.placedOrderCode || restored.orderStatus === 'confirmed');
    if (finished && this.route.snapshot.queryParamMap.get('step') === 'success') {
      // Reload of the success page: show the saved order exactly as it was placed. Nothing is
      // re-read from the cart, the form defaults or the address book, so its products never change.
      this.checkoutService.placedOrderCode.set(restored!.placedOrderCode ?? null);
      this.currentStep.set('success');
      // Paid but not created yet (the error is not kept across reloads): retry with the same
      // checkout_ref; place_order returns the existing order instead of a duplicate (FR-P-35).
      if (!restored!.placedOrderCode) void this.placeOrderOnce();
      this.watchStepParam();
      return;
    }
    if (finished) {
      // Spec B6: coming back to /checkout after an order is a new checkout (fresh checkout_ref).
      this.checkoutService.startNewSession();
    }
    if (this.cart.items().length > 0 && this.cart.selectedItems().length === 0) {
      // Cart has lines but none is ticked: nothing to pay for, send the customer back to choose.
      void this.router.navigate(['/cart']);
      return;
    }
    // Integration: only the lines ticked in the cart (Shop + Design Studio) feed Thanh toán.
    this.checkoutService.loadFromCart(this.cart.selectedItems());
    this.checkoutService.getOrCreateOrder();
    // The recipient comes from the signed-in customer's address book (table `addresses`), never a mock.
    void this.addressBook.load().then((address) => {
      if (address) this.checkoutService.updateAddress(address);
      if (address && !this.checkoutService.hasAddress()) this.showAddressModal.set(true);
    });

    this.watchStepParam();
  }

  /** Đồng bộ trạng thái từ Query Params (?step=form|processing|success|failed). */
  private watchStepParam(): void {
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
      // An order that is already confirmed keeps its status and payment info (reloads, ?step links).
      if (this.checkoutService.activeOrder()?.orderStatus !== 'confirmed') this.checkoutService.updateOrderStatus('confirmed', this.checkoutService.selectedPaymentType() === 'cod' ? 'pending' : 'paid', 'printing');
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

  /**
   * Integration: hand the paid (or COD) order to Quản lý đơn hàng exactly once.
   * Spec B8 / FR-P-35: the payment may already be taken, so a failed call is retried (up to 2 more
   * times) with the same checkout_ref; place_order returns the existing order instead of a duplicate.
   */
  private async placeOrderOnce(): Promise<void> {
    const order = this.checkoutService.activeOrder();
    if (!order || this.placedForOrderId === order.id || this.checkoutService.placedOrderCode()) return;
    this.placedForOrderId = order.id;
    const handoff = this.toHandoff(order);
    let message = '';
    for (let attempt = 0; attempt < PLACE_ORDER_ATTEMPTS; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, PLACE_ORDER_RETRY_MS * attempt));
      const result = await this.orderIntake.placeOrder(handoff);
      if (!result.error) {
        this.checkoutService.markPlaced(result.data.orderCode);
        // Only the paid lines leave the cart; lines the customer left unticked stay for later.
        this.cart.removeMany(order.items.map((i) => i.designCode));
        return;
      }
      message = result.error.message;
    }
    // Still failing: show the error with a retry button; the same checkout_ref is reused.
    this.placedForOrderId = null;
    this.checkoutService.placeOrderError.set(message);
  }

  /** "Thử lại" on the success screen when the order could not be created yet. */
  retryPlaceOrder(): void {
    this.checkoutService.placeOrderError.set(null);
    void this.placeOrderOnce();
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
      paymentChannel: order.paymentMethod,
      paymentTxnRef: order.paymentMethod === 'cod' ? undefined : order.transactionId,
      discount: order.discountAmount,
      checkoutRef: order.checkoutRef ?? order.id,
      shipperNote: order.shipperNote || undefined,
      giftMessage: order.giftPackage.enabled ? order.giftPackage.message || undefined : undefined,
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
            catalogRef: catalogRefFor(i.designCode, isCustom),
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
    this.checkoutService.startNewSession();
    this.placedForOrderId = null;
    // A new order is built from what is ticked in the cart now, never from the previous order.
    if (this.cart.selectedItems().length === 0) {
      void this.router.navigate(['/cart']);
      return;
    }
    this.checkoutService.loadFromCart(this.cart.selectedItems());
    this.checkoutService.createNewOrder();
    this.setStep('form');
  }

  /** "Thiết lập ngay": go to onboarding, then come back to this checkout. */
  goToOnboarding(): void {
    this.askOnboarding.set(false);
    void this.router.navigate(['/account/onboarding'], { queryParams: { returnUrl: '/checkout' } });
  }

  /** "Để sau": onboarding_status = skipped, stay on the checkout. */
  async skipOnboarding(): Promise<void> {
    this.onboardingBusy.set(true);
    const ok = await this.onboarding.skip();
    this.onboardingBusy.set(false);
    this.askOnboarding.set(false);
    if (!ok) this.showToast('Chưa lưu được lựa chọn, bạn vẫn có thể tiếp tục thanh toán.');
  }

  showToast(message: string): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage.set(message);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 2500);
  }
}
