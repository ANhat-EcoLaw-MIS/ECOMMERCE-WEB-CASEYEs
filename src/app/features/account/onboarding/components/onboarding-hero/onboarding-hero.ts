import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CaseCard } from '../case-card/case-card';
import { MARQUEE_ROWS } from '../../marquee-cases';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseCard],
  selector: 'app-onboarding-hero',
  templateUrl: './onboarding-hero.html',
  styleUrl: './onboarding-hero.scss',
})
export class OnboardingHero {
  readonly disabled = input(false);
  readonly continueRequested = output<void>();
  protected readonly year = new Date().getFullYear();
  protected readonly marqueeRows = MARQUEE_ROWS;

  protected requestContinue(): void {
    this.continueRequested.emit();
  }
}
