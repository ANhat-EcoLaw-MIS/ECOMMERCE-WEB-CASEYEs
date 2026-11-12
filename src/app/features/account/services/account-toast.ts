import { Injectable, signal } from '@angular/core';

export interface AccountToastMessage {
  id: number;
  message: string;
  type: 'success' | 'info';
}

@Injectable({ providedIn: 'root' })
export class AccountToast {
  private readonly _toasts = signal<AccountToastMessage[]>([]);
  private nextId = 0;
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: AccountToastMessage['type'] = 'success'): void {
    const id = this.nextId++;
    this._toasts.update((toasts) => [...toasts, { id, message, type }]);
    setTimeout(() => {
      this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
    }, 3500);
  }
}
