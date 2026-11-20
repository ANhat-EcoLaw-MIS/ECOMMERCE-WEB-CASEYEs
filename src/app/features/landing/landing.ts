import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Hero } from './section/hero/hero';
import { Trending } from './section/trending/trending';
import { LandingCatalog } from './section/catalog/catalog';
import { Reviews } from './section/reviews/reviews';

@Component({
  selector: 'app-landing',
  imports: [Hero, Trending, LandingCatalog, Reviews],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {}
