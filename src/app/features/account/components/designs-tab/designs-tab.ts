import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DESIGNS } from '../../models/account.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-designs-tab',
  templateUrl: './designs-tab.html',
})
export class DesignsTab {
  protected readonly designs = DESIGNS;
  // TODO: load designs from the database when a designs table is available.
}
