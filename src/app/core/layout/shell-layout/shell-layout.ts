import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, Footer],
  selector: 'app-shell-layout',
  templateUrl: './shell-layout.html',
})
export class ShellLayout {
  protected readonly cartCount = signal(0);

  protected onSearchRequested(): void {
    // TODO(search): open the search overlay
  }
}
