import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

/** Native <dialog> shell, same look and motion as the team's AuthDialog. */
@Component({
  selector: 'app-ot-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      (close)="closed.emit()"
      (click)="onBackdropClick($event)"
      [attr.aria-labelledby]="titleId"
      class="m-auto max-h-[90vh] w-[min(92vw,34rem)] overflow-y-auto rounded-card border border-line bg-surface-alt p-0 text-ink shadow-lift backdrop:bg-ink/40"
    >
      <div class="relative p-6 sm:p-7">
        <h2 [id]="titleId" class="pr-10 font-display text-xl font-bold tracking-tight">{{ title() }}</h2>
        <button
          type="button"
          aria-label="Đóng"
          (click)="closed.emit()"
          class="absolute right-4 top-4 grid min-h-11 min-w-11 place-items-center rounded-pill text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-brand-400"
        >
          ✕
        </button>
        <div class="mt-4">
          <ng-content />
        </div>
      </div>
    </dialog>
  `,
})
export class OtModal {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly titleId = `ot-modal-${crypto.randomUUID().slice(0, 6)}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal();
      else if (!this.open() && el.open) el.close();
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.closed.emit();
  }
}
