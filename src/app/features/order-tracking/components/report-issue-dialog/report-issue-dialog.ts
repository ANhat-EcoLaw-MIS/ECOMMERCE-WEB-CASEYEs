import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationManager } from '../../../../shared/ui/notification/notification.manager';
import { TONE_CLASSES } from '../../config/status-style';
import { IssueType, Order } from '../../models/order-tracking.model';
import { OrderTrackingService } from '../../services/order-tracking.service';
import { OtModal } from '../ot-modal/ot-modal';
import { BTN_GHOST, BTN_PRIMARY, FIELD, LABEL, simulateLatency } from '../ui';

export const ISSUE_TYPES: readonly { key: IssueType; label: string; evidence: boolean }[] = [
  { key: 'Print_Defect', label: 'Hàng lỗi in ấn', evidence: true },
  { key: 'Wrong_Design_Or_Model', label: 'Sai mẫu hoặc sai dòng máy', evidence: false },
  { key: 'Transit_Damage', label: 'Hư hỏng do vận chuyển', evidence: true },
  { key: 'Not_Received', label: 'Chưa nhận được hàng', evidence: false },
  { key: 'Dispute_Failure_Cause', label: 'Không đồng ý nguyên nhân giao thất bại', evidence: false },
];

interface Evidence {
  readonly name: string;
  readonly url: string;
  readonly isVideo: boolean;
}

/**
 * UC-OT-04. Stands in for the Epic 6 complaint form (prefilled with order, design and
 * delivery log). The form keeps its content when sending fails (EX-07, EX-12).
 */
@Component({
  selector: 'app-report-issue-dialog',
  imports: [ReactiveFormsModule, OtModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-issue-dialog.html',
})
export class ReportIssueDialog {
  readonly order = input.required<Order>();
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly service = inject(OrderTrackingService);
  private readonly toast = inject(NotificationManager);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly field = FIELD;
  protected readonly label = LABEL;
  protected readonly errorBox = `rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES.danger.box}`;

  protected readonly form = this.fb.group({
    issueType: this.fb.control<IssueType | ''>('', Validators.required),
    description: ['', [Validators.required, Validators.minLength(10)]],
  });
  protected readonly evidence = signal<readonly Evidence[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<{ message: string; retry: boolean } | null>(null);
  protected readonly touched = signal(false);
  private readonly issueType = signal<IssueType | ''>('');
  private opKey = '';

  protected readonly types = computed(() => {
    const failed = this.order().status === 'Delivery_Failed';
    return ISSUE_TYPES.filter((t) => (t.key === 'Dispute_Failure_Cause') === failed);
  });
  protected readonly evidenceRequired = computed(() => ISSUE_TYPES.find((t) => t.key === this.issueType())?.evidence ?? false);
  protected readonly lastLogs = computed(() => this.order().logs.slice(-3).reverse());

  constructor() {
    this.form.controls.issueType.valueChanges.subscribe((v) => this.issueType.set(v));
    effect(() => {
      if (!this.open()) return;
      untracked(() => {
        // A fresh key per attempt to open; content is kept until it is sent successfully.
        this.opKey = crypto.randomUUID();
        if (this.types().length === 1) this.form.controls.issueType.setValue(this.types()[0].key);
      });
    });
    inject(DestroyRef).onDestroy(() => this.evidence().forEach((e) => URL.revokeObjectURL(e.url)));
  }

  protected onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(0, 5);
    this.evidence.update((list) => [
      ...list,
      ...files.map((f) => ({ name: f.name, url: URL.createObjectURL(f), isVideo: f.type.startsWith('video/') })),
    ]);
    input.value = '';
  }

  protected removeEvidence(e: Evidence): void {
    URL.revokeObjectURL(e.url);
    this.evidence.update((list) => list.filter((x) => x !== e));
  }

  protected async submit(): Promise<void> {
    this.touched.set(true);
    if (this.form.invalid) {
      this.error.set({ message: 'Vui lòng chọn loại sự cố và mô tả ít nhất 10 ký tự', retry: false });
      return;
    }
    if (this.evidenceRequired() && this.evidence().length === 0) {
      this.error.set({ message: 'Vui lòng tải lên ảnh hoặc video bằng chứng', retry: false });
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    await simulateLatency(700);
    const v = this.form.getRawValue();
    const result = this.service.reportIssue(
      this.order().id,
      { issueType: v.issueType as IssueType, description: v.description, evidenceNames: this.evidence().map((e) => e.name) },
      { opKey: this.opKey },
    );
    this.busy.set(false);
    if (result.error) {
      const retry = result.error.code === 'NETWORK' || result.error.code === 'EPIC6';
      this.error.set({ message: result.error.message, retry });
      return;
    }
    const ticket = result.data.tickets.at(-1)?.ticketCode ?? '';
    this.toast.show({ variant: 'functional', title: 'Đã gửi yêu cầu hỗ trợ', message: `Mã yêu cầu ${ticket}. Shop sẽ phản hồi trong chi tiết đơn.` });
    this.form.reset({ issueType: '', description: '' });
    this.evidence().forEach((e) => URL.revokeObjectURL(e.url));
    this.evidence.set([]);
    this.touched.set(false);
    this.closed.emit();
  }
}
