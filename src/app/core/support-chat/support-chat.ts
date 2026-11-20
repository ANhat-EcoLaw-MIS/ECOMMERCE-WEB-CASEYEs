import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import { SupportChatState } from './support-chat-state';

@Component({
  selector: 'app-support-chat',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './support-chat.html',
  styleUrl: './support-chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'chat.close()' },
})
export class SupportChat {
  protected readonly chat = inject(SupportChatState);
  protected readonly auth = inject(SupabaseAuthService);
  protected readonly draft = signal('');
  protected readonly confirmingEnd = signal(false);

  protected updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected submit(): void {
    this.chat.send(this.draft());
    this.draft.set('');
  }

  protected requestEnd(): void { this.confirmingEnd.set(true); }
  protected cancelEnd(): void { this.confirmingEnd.set(false); }
  protected completeEnd(): void { this.chat.resolveAndClear(); this.draft.set(''); this.confirmingEnd.set(false); }

  protected useQuickReply(text: string): void {
    this.chat.send(text);
  }
}
