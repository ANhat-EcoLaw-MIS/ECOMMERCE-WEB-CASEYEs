import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PhoneCaseMock } from '../../../../shared/ui/phone-case-mock/phone-case-mock';
import {ButtonComponent} from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, PhoneCaseMock, ButtonComponent],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  /** Optional real product images (paths under /public). The CSS mockups show until these are set. */
  readonly frontImage = input<string>();
  readonly backImage = input<string>();
}
