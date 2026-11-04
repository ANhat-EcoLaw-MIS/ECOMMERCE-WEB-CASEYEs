import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RefundChoice } from '../../domain/order-mutations';
import { FIELD, LABEL } from '../ui';

type Method = 'Bank' | 'Voucher' | 'Later';

/** How the customer receives a refund: bank account (holder = payer), voucher 100%, or later. */
@Component({
  selector: 'app-refund-choice-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './refund-choice-form.html',
})
export class RefundChoiceForm implements OnInit {
  readonly payerName = input.required<string>();
  readonly amountLabel = input.required<string>();
  /** "Cung cấp sau" is offered in the cancel pop-up, not in the pending-account form. */
  readonly allowLater = input(true);
  /** Emits null while the form is invalid. */
  readonly choiceChange = output<RefundChoice | null>();

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);

  protected readonly field = FIELD;
  protected readonly label = LABEL;

  protected readonly form = this.fb.group({
    method: this.fb.control<Method>('Bank'),
    bank: ['', Validators.required],
    accountNo: ['', [Validators.required, Validators.pattern(/^[\d\s]{6,23}$/)]],
    holder: ['', Validators.required],
  });

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.emit());
    this.emit();
  }

  protected setMethod(method: Method): void {
    this.form.controls.method.setValue(method);
  }

  private emit(): void {
    const v = this.form.getRawValue();
    if (v.method === 'Voucher') return this.choiceChange.emit({ method: 'Voucher' });
    if (v.method === 'Later') return this.choiceChange.emit({ method: 'Later' });
    const valid = this.form.controls.bank.valid && this.form.controls.accountNo.valid && this.form.controls.holder.valid;
    this.choiceChange.emit(valid ? { method: 'Bank', bank: v.bank, accountNo: v.accountNo.replace(/\s/g, ''), holder: v.holder } : null);
  }
}
