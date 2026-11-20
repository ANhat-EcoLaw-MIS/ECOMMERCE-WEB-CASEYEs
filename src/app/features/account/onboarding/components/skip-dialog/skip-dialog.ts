import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-skip-dialog',
  templateUrl: './skip-dialog.html',
  styleUrl: './skip-dialog.scss',
})
export class SkipDialog {
  readonly busy = input(false);
  readonly skipConfirmed = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  protected stay(): void {
    this.dialog().nativeElement.close();
  }

  protected skip(): void {
    this.dialog().nativeElement.close();
    this.skipConfirmed.emit();
  }
}
