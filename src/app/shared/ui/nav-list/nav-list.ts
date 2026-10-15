import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface NavItem {
  label: string;
  href: string;
}

@Component({
  selector: 'app-nav-list',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav-list.html'
})
export class NavList {
  items = input<NavItem[]>([]);
  orientation = input<'horizontal' | 'vertical'>('horizontal');

  listClasses = computed(() => {
    return this.orientation() === 'horizontal'
      ? 'flex flex-row items-center gap-6'
      : 'flex flex-col gap-2';
  });
}
