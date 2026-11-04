import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { POLICY_HIGHLIGHTS, POLICY_SECTIONS, POLICY_VERSION } from '../config/order-policy';

/** FR-OT-17: full order policy owned by Epic 5 (Checkout links here from its consent tick). */
@Component({
  selector: 'app-order-policy',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-policy.html',
})
export class OrderPolicy {
  protected readonly version = POLICY_VERSION;
  protected readonly highlights = POLICY_HIGHLIGHTS;
  protected readonly sections = POLICY_SECTIONS;

  protected scrollTo(id: string): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
}
