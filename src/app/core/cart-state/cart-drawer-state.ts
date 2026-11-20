import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class CartDrawerState {
  readonly open = signal(false);
  readonly justAdded = signal(false);
  show(added = false): void { this.justAdded.set(added); this.open.set(true); }
  close(): void { this.open.set(false); this.justAdded.set(false); }
}
