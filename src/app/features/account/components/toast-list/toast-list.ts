import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccountToast } from '../../services/account-toast';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-toast-list',
  templateUrl: './toast-list.html',
})
export class ToastList {
  protected readonly toast = inject(AccountToast);
}
