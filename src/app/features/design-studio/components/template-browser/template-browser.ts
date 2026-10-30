import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StudioState } from '../../services/studio-state';

@Component({
  selector: 'app-template-browser',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './template-browser.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateBrowser {
  protected readonly state = inject(StudioState);
  protected readonly aiPrompt = signal('');
  protected readonly selectedStyle = signal<string>('all');

  protected readonly styles = [
    { id: 'all', name: 'Tất cả phong cách' },
    { id: 'y2k', name: 'Y2K Nostalgia' },
    { id: 'minimalist', name: 'Tối giản & Clean' },
    { id: 'cyberpunk', name: 'Cyberpunk & Neon' },
    { id: 'anime', name: 'Anime Manga' },
    { id: 'cute', name: 'Dễ thương & Pastel' },
  ];

  protected onPromptInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.aiPrompt.set(input.value);
  }

  protected selectStyle(styleId: string): void {
    this.selectedStyle.set(styleId);
  }
}
