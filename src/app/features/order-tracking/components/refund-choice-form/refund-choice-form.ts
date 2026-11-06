import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DELIVERY_CONFIG } from '../../config/delivery-config';
import { TONE_CLASSES } from '../../config/status-style';
import { VN_BANKS } from '../../config/vn-banks';
import { RefundChoice } from '../../domain/order-mutations';
import { sameHolderName } from '../../domain/order-rules';
import { FIELD, LABEL } from '../ui';

type Method = 'Bank' | 'Voucher' | 'Later';

/** Upper case without Vietnamese accents, as banks print account names. */
export function toHolderName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart();
}

/**
 * How the customer receives a refund (P1-11): bank account (holder = payer, shown back as a
 * summary and masked after saving), voucher 100%, or "Cung cấp sau".
 */
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
  protected readonly banks = VN_BANKS;
  protected readonly listId = `ot-banks-${crypto.randomUUID().slice(0, 6)}`;
  protected readonly deadlineDays = DELIVERY_CONFIG.refundAccountDeadlineDays;
  protected readonly voucherDays = DELIVERY_CONFIG.voucherValidDays;
  protected readonly warnBox = `rounded-xl border px-3 py-2 text-xs ${TONE_CLASSES.warning.box}`;

  protected readonly form = this.fb.group({
    method: this.fb.control<Method>('Bank'),
    bank: ['', Validators.required],
    accountNo: ['', [Validators.required, Validators.pattern(/^\d{6,19}$/)]],
    holder: ['', Validators.required],
  });
  protected readonly value = signal(this.form.getRawValue());
  protected readonly holderMismatch = computed(() => {
    const h = this.value().holder.trim();
    return h.length > 2 && !sameHolderName(h, this.payerName());
  });
  protected readonly bankValid = computed(() => {
    const v = this.value();
    return !!v.bank.trim() && /^\d{6,19}$/.test(v.accountNo) && !!v.holder.trim() && !this.holderMismatch();
  });

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.value.set(this.form.getRawValue());
      this.emit();
    });
    this.emit();
  }

  protected setMethod(method: Method): void {
    this.form.controls.method.setValue(method);
  }

  /** Digits only for the account number. */
  protected onAccountInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const digits = el.value.replace(/\D/g, '').slice(0, 19);
    if (digits !== el.value) this.form.controls.accountNo.setValue(digits);
  }

  /** Auto upper case without accents for the holder name. */
  protected onHolderInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const name = toHolderName(el.value);
    if (name !== el.value) this.form.controls.holder.setValue(name);
  }

  private emit(): void {
    const v = this.form.getRawValue();
    if (v.method === 'Voucher') return this.choiceChange.emit({ method: 'Voucher' });
    if (v.method === 'Later') return this.choiceChange.emit({ method: 'Later' });
    this.choiceChange.emit(this.bankValid() ? { method: 'Bank', bank: v.bank.split(' – ')[0].trim(), accountNo: v.accountNo, holder: v.holder.trim() } : null);
  }
}
