import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Placeholder } from '../../shared/ui/placeholder/placeholder';
import { Hero} from './section/hero/hero';

@Component({
  selector: 'app-landing',
  imports: [Placeholder, Hero],
  templateUrl: './landing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  /** Mockup sections. Replace each with a real component in `sections/<name>/`. */
  protected readonly sections = [
    { label: 'How it works', hint: '4 steps: describe idea, AI suggests, customise, receive' },
    { label: 'Trending designs', hint: 'Product carousel' },
    { label: 'Collections', hint: 'Minimalist, Kawaii, Nature, Typography, Abstract' },
    { label: 'Case Twinning', hint: 'Promo banner for couple/friend cases' },
    { label: 'Customer reviews', hint: 'Testimonial cards' },
  ];
}
