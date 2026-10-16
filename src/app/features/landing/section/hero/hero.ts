import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PhoneCaseMock } from '../../../../shared/ui/phone-case-mock/phone-case-mock';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, PhoneCaseMock],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  /** Optional real product images (paths under /public). The CSS mockups show until these are set. */
  readonly frontImage = input<string>();
  readonly backImage = input<string>();
}
