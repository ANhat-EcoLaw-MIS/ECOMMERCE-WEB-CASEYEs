import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MarqueeCase } from '../../models/onboarding.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-case-card',
  templateUrl: './case-card.html',
  styleUrl: './case-card.scss',
})
export class CaseCard {
  readonly case = input.required<MarqueeCase>();
  protected readonly cameraRowClass = 'flex items-center justify-between';
  protected readonly cameraLensClass =
    'grid size-4 place-items-center rounded-full border border-white/30 bg-zinc-900';
  protected readonly cameraDotClass = 'size-1.5 rounded-full bg-violet-400';
  protected readonly cameraPointClass = 'size-2 rounded-full bg-purple-400';
  protected readonly cameraSmallLensClass =
    'size-3.5 rounded-full border border-white/20 bg-zinc-900';
}
