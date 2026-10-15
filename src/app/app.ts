import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ButtonComponent} from './shared/ui/button/button';
import {CardComponent} from './shared/ui/card/card';
import {BadgeComponent} from './shared/ui/badge/badge';
import {Input} from './shared/ui/input/input';

@Component({
  imports: [RouterOutlet, ButtonComponent, CardComponent, BadgeComponent, Input],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal("CasEYE's");
}
