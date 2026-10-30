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
    { label: 'Trending designs', hint: 'Product carousel' },
    { label: 'Products Catalog', hint: 'Product types' },
    { label: 'Customer reviews', hint: 'Testimonial cards' },
  ];
}
