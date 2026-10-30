import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { AuthModal } from '../../core/auth/auth-modal';
import { Auth } from './auth';

@Component({
  selector: 'app-auth-dialog',
  imports: [Auth],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      (close)="modal.close()"
      (click)="onBackdropClick($event)"
      class="m-auto w-full max-w-md rounded-card border border-line bg-surface-alt p-0 shadow-soft backdrop:bg-ink/40"
    >
      @if (modal.mode(); as mode) {
        <div class="relative p-6 sm:p-8">
          <button
            type="button"
            aria-label="Đóng"
            (click)="modal.close()"
            class="absolute right-4 top-4 grid min-h-11 min-w-11 place-items-center rounded-pill text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-brand-400"          >
            ✕
          </button>
          <app-auth [mode]="mode" [embedded]="true" (success)="modal.close()" (modeChange)="modal.open($event)" />
        </div>
      }
    </dialog>
  `,
})
export class AuthDialog {
  protected readonly modal = inject(AuthModal);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.modal.mode()) {
        if (!el.open) el.showModal();
      } else if (el.open) {
        el.close();
      }
    });
  }

  /** Padding sits on the inner div, so a click that targets the dialog itself is the backdrop. */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.modal.close();
  }
}
