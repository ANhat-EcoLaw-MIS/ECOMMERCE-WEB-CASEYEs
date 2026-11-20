import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { POLICY_COLOR_NOTE, POLICY_HIGHLIGHTS, POLICY_VERSION } from '../../config/order-policy';
import { OtModal } from '../ot-modal/ot-modal';
import { BTN_PRIMARY } from '../ui';

/**
 * Checkout consent (FR-OT-17 / P1-18), the integration point for Thanh toán:
 * - cart with custom designs: pop-up with the key points + link + mandatory tick;
 * - stock-only cart: one inline tick.
 * Emits the accepted policy version; Thanh toán passes it in OrderHandoff so PolicyConsent is stored.
 * To be moved to shared/ when Checkout uses it (features must not import each other).
 */
@Component({
  selector: 'app-policy-consent',
  imports: [RouterLink, OtModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './policy-consent.html',
})
export class PolicyConsent {
  readonly hasCustom = input(false);
  /** Emits the policy version when ticked, null when unticked. */
  readonly accepted = output<string | null>();

  protected readonly highlights = POLICY_HIGHLIGHTS;
  protected readonly colorNote = POLICY_COLOR_NOTE;
  protected readonly version = POLICY_VERSION;
  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly checked = signal(false);
  protected readonly modalOpen = signal(false);

  constructor() {
    // Changing the cart type resets the consent.
    effect(() => {
      this.hasCustom();
      this.set(false);
    });
  }

  protected set(value: boolean): void {
    this.checked.set(value);
    this.accepted.emit(value ? POLICY_VERSION : null);
  }

  protected acceptFromModal(): void {
    this.set(true);
    this.modalOpen.set(false);
  }
}
