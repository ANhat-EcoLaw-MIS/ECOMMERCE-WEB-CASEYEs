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
import { DELIVERY_CONFIG } from '../../config/delivery-config';
import { TONE_CLASSES } from '../../config/status-style';
import { addWorkingDays, formatFullDate } from '../../domain/calendar';
import { IssueType, Order } from '../../models/order-tracking.model';
import { Clock } from '../../services/clock';
import { OrderTrackingService } from '../../services/order-tracking.service';
import { track } from '../../services/tracker';
import { OtModal } from '../ot-modal/ot-modal';
import { BTN_GHOST, BTN_PRIMARY, FIELD, LABEL, simulateLatency } from '../ui';

export const ISSUE_TYPES: readonly { key: IssueType; label: string; example: string; icon: string; evidence: boolean }[] = [
  { key: 'Print_Defect', label: 'Hàng lỗi in ấn', example: 'Lệch màu rõ, mờ, bong tróc hình in', icon: 'M4 7h16M7 7V4h10v3M6 11h12v9H6z', evidence: true },
  { key: 'Wrong_Design_Or_Model', label: 'Sai mẫu hoặc sai dòng máy', example: 'Không đúng bản thiết kế, không vừa máy', icon: 'M7 3h10v18H7zM10 18h4', evidence: false },
  { key: 'Transit_Damage', label: 'Hư hỏng do vận chuyển', example: 'Hộp móp, ốp nứt khi mở kiện', icon: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10', evidence: true },
  { key: 'Not_Received', label: 'Chưa nhận được hàng', example: 'Báo đã giao nhưng bạn chưa nhận', icon: 'M12 21s-7-6-7-11a7 7 0 1 1 14 0c0 5-7 11-7 11zM12 8v3M12 14h.01', evidence: false },
  { key: 'Dispute_Failure_Cause', label: 'Không đồng ý nguyên nhân giao thất bại', example: 'Bạn ở nhà nhưng shipper báo không liên lạc được', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6', evidence: false },
];

const MAX_FILES = 5;
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;

interface Evidence {
  readonly name: string;
  readonly url: string;
  readonly isVideo: boolean;
  readonly sizeLabel: string;
  progress: number;
}

/**
 * UC-OT-04 / P1-13. Stands in for the CSKH & Khiếu nại form (prefilled with order, design and
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
  private readonly clock = inject(Clock);
  private readonly toast = inject(NotificationManager);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly btnPrimary = BTN_PRIMARY;
  protected readonly btnGhost = BTN_GHOST;
  protected readonly field = FIELD;
  protected readonly label = LABEL;
  protected readonly errorBox = `rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES.danger.box}`;
  protected readonly limits = `Tối đa ${MAX_FILES} tệp · ảnh ≤ ${MAX_IMAGE_MB} MB · video ≤ ${MAX_VIDEO_MB} MB`;

  protected readonly form = this.fb.group({
    issueType: this.fb.control<IssueType | ''>('', Validators.required),
    description: ['', [Validators.required, Validators.minLength(10)]],
  });
  protected readonly issueType = signal<IssueType | ''>('');
  protected readonly evidence = signal<readonly Evidence[]>([]);
  protected readonly uploading = computed(() => this.evidence().some((e) => e.progress < 100));
  protected readonly busy = signal(false);
  protected readonly error = signal<{ message: string; retry: boolean } | null>(null);
  protected readonly fileError = signal<string | null>(null);
  private opKey = '';

  protected readonly types = computed(() => {
    const failed = this.order().status === 'Delivery_Failed';
    return ISSUE_TYPES.filter((t) => (t.key === 'Dispute_Failure_Cause') === failed);
  });
  protected readonly evidenceRequired = computed(() => ISSUE_TYPES.find((t) => t.key === this.issueType())?.evidence ?? false);
  protected readonly designPreview = computed(() => this.order().items.find((i) => i.design?.previewUrl)?.design?.previewUrl);
  protected readonly responseBy = computed(() => formatFullDate(addWorkingDays(this.clock.nowSignal(), DELIVERY_CONFIG.cancelRequestSlaDays, DELIVERY_CONFIG.holidays).toISOString()));

  constructor() {
    this.form.controls.issueType.valueChanges.subscribe((v) => this.issueType.set(v));
    effect(() => {
      if (!this.open()) return;
      untracked(() => {
        this.opKey = crypto.randomUUID();
        if (this.types().length === 1) this.pickType(this.types()[0].key);
      });
    });
    inject(DestroyRef).onDestroy(() => this.evidence().forEach((e) => URL.revokeObjectURL(e.url)));
  }

  protected pickType(key: IssueType): void {
    this.form.controls.issueType.setValue(key);
  }

  protected onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.fileError.set(null);
    const room = MAX_FILES - this.evidence().length;
    const accepted: Evidence[] = [];
    for (const f of files.slice(0, Math.max(0, room))) {
      const isVideo = f.type.startsWith('video/');
      const limit = (isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;
      if (f.size > limit) {
        this.fileError.set(`“${f.name}” vượt giới hạn ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB} MB.`);
        continue;
      }
      accepted.push({ name: f.name, url: URL.createObjectURL(f), isVideo, sizeLabel: `${(f.size / 1024 / 1024).toFixed(1)} MB`, progress: 0 });
    }
    if (files.length > room) this.fileError.set(`Chỉ nhận tối đa ${MAX_FILES} tệp.`);
    this.evidence.update((list) => [...list, ...accepted]);
    accepted.forEach((e) => this.simulateUpload(e));
  }

  /** Mock upload progress so the customer sees each file finish (real upload is CSKH & Khiếu nại's). */
  private simulateUpload(e: Evidence): void {
    const step = () => {
      if (!this.evidence().includes(e)) return;
      e.progress = Math.min(100, e.progress + 25);
      this.evidence.update((list) => [...list]);
      if (e.progress < 100) setTimeout(step, 150);
    };
    setTimeout(step, 150);
  }

  protected removeEvidence(e: Evidence): void {
    URL.revokeObjectURL(e.url);
    this.evidence.update((list) => list.filter((x) => x !== e));
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error.set({ message: 'Vui lòng chọn loại sự cố và mô tả ít nhất 10 ký tự', retry: false });
      return;
    }
    if (this.evidenceRequired() && this.evidence().length === 0) {
      this.error.set({ message: 'Loại sự cố này cần ít nhất 1 ảnh hoặc video bằng chứng', retry: false });
      return;
    }
    if (this.uploading()) return;
    this.busy.set(true);
    this.error.set(null);
    await simulateLatency(700);
    const v = this.form.getRawValue();
    const result = await this.service.reportIssue(
      this.order().id,
      { issueType: v.issueType as IssueType, description: v.description, evidenceNames: this.evidence().map((e) => e.name) },
      { opKey: this.opKey },
    );
    this.busy.set(false);
    if (result.error) {
      const retry = result.error.code === 'NETWORK' || result.error.code === 'CSKH';
      this.error.set({ message: result.error.message, retry });
      return;
    }
    track('issue_reported', { type: v.issueType }, this.order().orderCode);
    const ticket = result.data.tickets.at(-1)?.ticketCode ?? '';
    this.toast.show({ variant: 'functional', title: `Đã gửi yêu cầu ${ticket}`, message: `CSKH sẽ phản hồi trước ${this.responseBy()} trong chi tiết đơn và qua email.`, duration: 8000 });
    this.form.reset({ issueType: '', description: '' });
    this.evidence().forEach((e) => URL.revokeObjectURL(e.url));
    this.evidence.set([]);
    this.closed.emit();
  }
}
