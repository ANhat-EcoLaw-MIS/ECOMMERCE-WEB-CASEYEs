import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MarqueeCase } from '../../marquee-cases';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-case-card',
  templateUrl: './case-card.html',
  styleUrl: './case-card.scss',
})
export class CaseCard {
  readonly case = input.required<MarqueeCase>();
}
