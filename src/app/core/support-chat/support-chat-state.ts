import { Injectable, computed, signal } from '@angular/core';

export interface ChatMessage {
  readonly id: number;
  readonly from: 'agent' | 'customer' | 'system';
  readonly text: string;
  readonly time: string;
}

/**
 * Local UI-only conversation.
 * /api/support/ai-summary is an OPTIONAL secure backend endpoint; never put AI API keys in Angular.
 * No conversation is persisted in localStorage/sessionStorage by this state.
 */
@Injectable({ providedIn: 'root' })
export class SupportChatState {
  readonly open = signal(false);
  readonly unread = signal(0);
  readonly messages = signal<readonly ChatMessage[]>(this.greeting());
  readonly summary = signal('');
  readonly summaryMode = signal<'ai' | 'local' | ''>('');
  readonly summarizing = signal(false);
  readonly status = signal('');
  readonly quickReplies = computed(() => [
    'Mình muốn hỏi về đơn hàng',
    'Mình cần hỗ trợ khiếu nại',
    'Cho mình hỏi chính sách đổi trả',
  ]);

  show(): void { this.open.set(true); this.unread.set(0); }
  close(): void { this.open.set(false); }
  toggle(): void { this.open() ? this.close() : this.show(); }
  send(text: string): void {
    const content = text.trim();
    if (!content) return;
    const time = this.currentTime();
    this.messages.update(items => [
      ...items,
      { id: items.length + 1, from: 'customer', text: content, time },
      { id: items.length + 2, from: 'agent', text: 'Mình đã nhận thông tin. Bạn có thể bổ sung mã đơn hoặc vào tab Hỗ trợ để gửi khiếu nại chính thức.', time },
    ]);
    this.summary.set(''); this.summaryMode.set(''); this.status.set('');
    this.show();
  }

  async summarize(): Promise<void> {
    const customer = this.messages().filter(item => item.from === 'customer').map(item => item.text);
    if (!customer.length) { this.status.set('Bạn cần nhắn ít nhất một tin để hệ thống tóm tắt.'); return; }
    this.summarizing.set(true); this.status.set('');
    try {
      const controller = new AbortController();
      // Timeout guards a backend that is unavailable; no external AI credentials stored on client.
      const timeout = setTimeout(() => controller.abort(), 4500);
      let response: Response;
      try {
        response = await fetch('/api/support/ai-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: this.messages().map(({from,text}) => ({from,text})) }),
          signal: controller.signal,
        });
      } finally { clearTimeout(timeout); }
      if (!response.ok) throw new Error('AI service unavailable');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('summary' in data) || typeof data.summary !== 'string' || !data.summary.trim()) throw new Error('Invalid response');
      this.summary.set(data.summary.slice(0, 1500));
      this.summaryMode.set('ai');
    } catch {
      // Transparent fallback, NOT an LLM / AI-generated response.
      const last = customer.slice(-3).join(' · ').slice(0, 350);
      const text = customer.join(' ').toLowerCase();
      const category = /khiếu nại|in lệch|hỏng|sai màu|lỗi/.test(text) ? 'Khiếu nại sản phẩm' : /giao hàng|đơn hàng|vận chuyển|mã đơn/.test(text) ? 'Đơn hàng & giao nhận' : /đổi trả|hoàn tiền|refund/.test(text) ? 'Đổi trả / hoàn tiền' : 'Tư vấn chung';
      this.summary.set(`Nhóm vấn đề: ${category}.\nNội dung khách cung cấp: ${last}\nHướng xử lý tiếp theo: CSKH xác minh mã đơn, đối chiếu tình trạng và hướng dẫn khách tạo ticket trong tab Hỗ trợ nếu cần.`);
      this.summaryMode.set('local');
      this.status.set('Chưa kết nối AI backend. Đang hiển thị tóm tắt tự động theo quy tắc để thử giao diện.');
    } finally { this.summarizing.set(false); }
  }

  /** Called only after the user explicitly marks the case resolved and confirms deletion. */
  resolveAndClear(): void {
    this.messages.set(this.greeting());
    this.summary.set(''); this.summaryMode.set(''); this.status.set(''); this.unread.set(0);
    this.close();
  }

  private greeting(): readonly ChatMessage[] {
    return [{id: 1, from: 'agent', text: 'Xin chào! CasEYE’s có thể hỗ trợ gì cho bạn hôm nay?', time: this.currentTime()}];
  }
  private currentTime(): string {
    return new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  }
}
