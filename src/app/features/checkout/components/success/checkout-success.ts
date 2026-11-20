import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CheckoutService } from '../../services/checkout.service';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout-success.html',
  styleUrl: './checkout-success.scss',
})
export class CheckoutSuccess {
  readonly checkoutService = inject(CheckoutService);

  readonly newOrder = output<void>();
  readonly copyNotification = output<string>();
  /** The order could not be created yet: try again with the same checkout_ref. */
  readonly retryPlaceOrder = output<void>();

  async copyText(text: string, label: string): Promise<void> {
    const ok = await this.checkoutService.copyToClipboard(text);
    if (ok) {
      this.copyNotification.emit(`Đã sao chép ${label}!`);
    }
  }
}
