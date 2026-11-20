import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SupabaseAuthService } from '../../core/supabase/supabase-auth.service';
import { SupportChatState } from '../../core/support-chat/support-chat-state';

type SupportTab = 'complaints' | 'faq' | 'policy';

@Component({
  selector: 'app-customer-support',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './customer-support.html',
  styleUrl: './customer-support.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSupport {
  protected readonly auth = inject(SupabaseAuthService);
  private readonly router = inject(Router);
  private readonly chat = inject(SupportChatState);

  protected readonly activeTab = signal<SupportTab>('complaints');
  protected readonly complaintSent = signal(false);
  protected readonly orderCode = signal('');
  protected readonly reason = signal('Sai màu');
  protected readonly details = signal('');

  protected readonly faqs = [
    {
      question: 'Mình muốn chat nhanh với shop thì ở đâu?',
      answer: 'Bạn có thể nhấn nút Chat hỗ trợ nổi ở góc phải màn hình để mở popup trò chuyện ngay lập tức.',
    },
    {
      question: 'Khi nào nên gửi khiếu nại thay vì nhắn chat?',
      answer: 'Nếu liên quan đến đơn hàng đã giao, lỗi in, sai mẫu, sai dòng máy hoặc cần đính kèm minh chứng, bạn nên vào tab Khiếu nại trong trang Hỗ trợ.',
    },
    {
      question: 'Mất bao lâu để CSKH phản hồi?',
      answer: 'Tin nhắn chat được tiếp nhận nhanh trong giờ hành chính; khi gửi yêu cầu khiếu nại, bạn sẽ được thông báo tiến độ và kết quả xử lý khi tính năng chính thức hoạt động.',
    },
  ] as const;

  protected readonly policyItems = [
    'Sản phẩm cá nhân hoá cần được xác nhận đúng dòng máy trước khi in.',
    'Khiếu nại được khuyến nghị gửi kèm ảnh/video minh chứng để rút ngắn thời gian xử lý.',
    'Một số trường hợp sau khi đơn đã chuyển sang trạng thái đang in sẽ không thể huỷ trực tiếp.',
    'Các quyết định hỗ trợ có thể bao gồm in lại, voucher hoặc hoàn tiền tuỳ theo kết quả xác minh.',
  ] as const;

  protected setTab(tab: SupportTab): void {
    this.activeTab.set(tab);
  }

  protected openChat(): void {
    this.chat.show();
  }

  protected updateOrderCode(event: Event): void {
    this.orderCode.set((event.target as HTMLInputElement).value);
  }

  protected updateReason(event: Event): void {
    this.reason.set((event.target as HTMLSelectElement).value);
  }

  protected updateDetails(event: Event): void {
    this.details.set((event.target as HTMLTextAreaElement).value);
  }

  protected submitComplaint(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/customer-support' } });
      return;
    }
    this.complaintSent.set(true);
  }
}
