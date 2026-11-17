import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CaseCard } from '../case-card/case-card';
import { createMarqueeRows, type MarqueeRow } from '../../marquee-cases';

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
  protected readonly marqueeRows = signal<MarqueeRow[]>([]);
  protected readonly marqueeError = signal<string | null>(null);

  constructor() {
    void import('../../../../design-studio/components/template-browser/template-browser')
      .then(({ TEMPLATE_CATALOG }) => {
        this.marqueeRows.set(createMarqueeRows(TEMPLATE_CATALOG));
      })
      .catch((error: unknown) => {
        this.marqueeError.set(
          error instanceof Error ? error.message : 'Không thể tải mẫu thiết kế.',
        );
      });
  }

  protected requestContinue(): void {
    this.continueRequested.emit();
  }
}
