import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudioCatalogService } from '../../services/studio-catalog';
import { SavedDesignItem, StudioState } from '../../services/studio-state';
import { SupabaseAuthService } from '../../../../core/supabase/supabase-auth.service';

export interface TemplateTag {
  label: string;
  color: string;
}

export interface TemplateCard {
  id: string;
  name: string;
  creator: string;
  style: string;
  styleLabel: string;
  gradient: string;
  tagText: string;
  description: string;
  tags: TemplateTag[];
  price: number;
  isTrending: boolean;
  isBlankCanvas?: boolean;
}

const TEMPLATE_CATALOG: TemplateCard[] = [
  // Card 1: Phôi trắng chuẩn – tự vẽ từ số 0 (Issue 4)
  {
    id: 'tpl-blank',
    name: 'Ốp Lưng Trắng Tiêu Chuẩn',
    creator: 'CasEYE Studio',
    style: 'all',
    styleLabel: 'Tự thiết kế',
    gradient: '#FFFFFF',
    tagText: '',
    description: 'Bắt đầu từ phôi ốp trắng trơn. Tự do sáng tạo ảnh, chữ và sticker theo chất riêng.',
    tags: [{ label: '#tự_thiết_kế', color: '#433075' }],
    price: 220000,
    isTrending: false,
    isBlankCanvas: true,
  },
  {
    id: 'tpl-001',
    name: 'Blossom Breeze',
    creator: 'CaseCraftStudio',
    style: 'y2k',
    styleLabel: 'Y2K Vibe',
    gradient: 'linear-gradient(160deg,#D4C8FA 0%,#f5b8d8 100%)',
    tagText: 'Good Vibes Only',
    description: 'Hoa anh đào nhẹ nhàng, trong trẻo, mang vẻ mùa xuân.',
    tags: [{ label: '#pastel', color: '#c084fc' }, { label: '#floral', color: '#f472b6' }],
    price: 250000,
    isTrending: true,
  },
  {
    id: 'tpl-002',
    name: 'Ocean Wave',
    creator: 'CyberNomad',
    style: 'cyberpunk',
    styleLabel: 'Cyberpunk',
    gradient: 'linear-gradient(160deg,#1a1a3d 0%,#0088cc 100%)',
    tagText: 'DEEP OCEAN',
    description: 'Những đường cong mềm mại lấy cảm hứng từ đại dương.',
    tags: [{ label: '#minimal', color: '#3b82f6' }, { label: '#blue', color: '#06b6d4' }],
    price: 260000,
    isTrending: false,
  },
  {
    id: 'tpl-003',
    name: 'Meow Daily',
    creator: 'MinimalStudio',
    style: 'cute',
    styleLabel: 'Cute & Pastel',
    gradient: 'linear-gradient(160deg,#fde68a 0%,#fca5a5 100%)',
    tagText: 'MEOW VIBES',
    description: 'Những chú mèo đáng yêu cho ngày vui vẻ của bạn.',
    tags: [{ label: '#cute', color: '#f97316' }, { label: '#cartoon', color: '#ec4899' }],
    price: 240000,
    isTrending: true,
  },
  {
    id: 'tpl-004',
    name: 'Galaxy Dream',
    creator: 'AnimeArtist',
    style: 'cyberpunk',
    styleLabel: 'Cyberpunk',
    gradient: 'linear-gradient(160deg,#0a0a0a 0%,#2a1d4d 100%)',
    tagText: '✦ COSMOS',
    description: 'Dải ngân hà tuyệt đẹp, những tầng lớp vũ trụ sâu thẳm.',
    tags: [{ label: '#space', color: '#433075' }, { label: '#dark', color: '#6d28d9' }],
    price: 265000,
    isTrending: true,
  },
  {
    id: 'tpl-005',
    name: 'Forest Path',
    creator: 'NatureStudio',
    style: 'minimalist',
    styleLabel: 'Minimalist',
    gradient: 'linear-gradient(160deg,#166534 0%,#86efac 100%)',
    tagText: 'NATURE GREEN',
    description: 'Con đường giữa rừng thông, bình yên và thư thái.',
    tags: [{ label: '#nature', color: '#16a34a' }, { label: '#green', color: '#059669' }],
    price: 235000,
    isTrending: false,
  },
  {
    id: 'tpl-006',
    name: 'Memory Lane',
    creator: 'PastelFactory',
    style: 'y2k',
    styleLabel: 'Y2K Vibe',
    gradient: 'linear-gradient(160deg,#fde68a 0%,#fca5a5 50%,#c4b5fd 100%)',
    tagText: 'THAT GIRL ERA',
    description: 'Những khoảnh khắc tinh tế, kiểu dáng đẹp, luôn bên bạn.',
    tags: [{ label: '#vintage', color: '#d97706' }, { label: '#aesthetic', color: '#db2777' }],
    price: 245000,
    isTrending: true,
  },
  {
    id: 'tpl-007',
    name: 'Purple Wings',
    creator: 'KawaiiShop',
    style: 'cute',
    styleLabel: 'Cute & Pastel',
    gradient: 'linear-gradient(160deg,#c4b5fd 0%,#f9a8d4 100%)',
    tagText: 'FLUTTER DREAMS',
    description: 'Cánh bướm mộng mơ, kiêu kỳ, nhẹ nhàng như giấc mơ.',
    tags: [{ label: '#purple', color: '#7c3aed' }, { label: '#butterfly', color: '#a855f7' }],
    price: 240000,
    isTrending: false,
  },
  {
    id: 'tpl-008',
    name: 'Sweet Square',
    creator: 'ZenStudio',
    style: 'y2k',
    styleLabel: 'Y2K Vibe',
    gradient: 'linear-gradient(160deg,#fde68a 0%,#f9a8d4 100%)',
    tagText: 'SWEET PASTEL',
    description: 'Hoạ tiết caro pastel ngọt ngào, dịu dàng và năng động.',
    tags: [{ label: '#pastel', color: '#f472b6' }, { label: '#pattern', color: '#fb923c' }],
    price: 230000,
    isTrending: false,
  },
];

@Component({
  selector: 'app-template-browser',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './template-browser.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateBrowser {
  protected readonly state = inject(StudioState);
  private readonly catalog = inject(StudioCatalogService);
  private readonly router = inject(Router);
  private readonly auth = inject(SupabaseAuthService);

  // My Designs for logged-in user only (Issue 8 & 13)
  protected readonly isLoggedIn = this.auth.isAuthenticated;
  protected readonly myDesigns = this.state.savedDesigns;

  protected readonly aiPrompt = signal('');
  protected readonly selectedStyle = signal<string>('all');
  protected readonly isAiSearching = signal<boolean>(false);
  protected readonly showNoResults = signal<boolean>(false);

  protected readonly styles = [
    { id: 'all', name: 'Tất cả phong cách' },
    { id: 'y2k', name: 'Y2K Nostalgia' },
    { id: 'minimalist', name: 'Tối giản & Clean' },
    { id: 'cyberpunk', name: 'Cyberpunk & Neon' },
    { id: 'cute', name: 'Dễ thương & Pastel' },
  ];

  protected readonly templates = TEMPLATE_CATALOG;

  protected readonly filteredTemplates = computed(() => {
    const style = this.selectedStyle();
    return this.templates.filter((t) => style === 'all' || t.style === style);
  });

  protected readonly trendingTemplates = computed(() =>
    this.templates.filter((t) => t.isTrending)
  );

  protected setPrompt(text: string): void {
    this.aiPrompt.set(text);
    this.showNoResults.set(false);
  }

  protected onPromptInput(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.aiPrompt.set(input.value);
    this.showNoResults.set(false);
  }

  protected selectStyle(styleId: string): void {
    this.selectedStyle.set(styleId);
    this.showNoResults.set(false);
  }

  /** FR-DES-06/AF3: Trigger AI suggestion. Show Trending when no match. */
  protected onAiSearch(): void {
    if (!this.aiPrompt().trim()) return;
    this.isAiSearching.set(true);
    setTimeout(() => {
      this.isAiSearching.set(false);
      const prompt = this.aiPrompt().toLowerCase();
      const hasMatch = this.templates.some(
        (t) =>
          t.name.toLowerCase().includes(prompt) ||
          t.styleLabel.toLowerCase().includes(prompt) ||
          t.tagText.toLowerCase().includes(prompt) ||
          t.description.toLowerCase().includes(prompt)
      );
      this.showNoResults.set(!hasMatch);
    }, 900);
  }

  /** F16: Regenerate / clear and retry */
  protected onRetry(): void {
    this.aiPrompt.set('');
    this.showNoResults.set(false);
    this.selectedStyle.set('all');
  }

  /**
   * Action: "Thiết kế mẫu này" – nạp dữ liệu template lên Canvas và mở editor.
   */
  protected onDesignTemplate(template: TemplateCard): void {
    if (template.isBlankCanvas) {
      this.state.clearCanvas();
      this.state.caseBg.set('#FFFFFF');
      this.state.designName.set(`Ốp lưng ${this.state.selectedModel().name} - Trắng`);
    } else {
      this.state.clearCanvas();
      this.state.caseBg.set(template.gradient);
      this.state.designName.set(`Ốp ${template.name} - ${this.state.selectedModel().name}`);
      if (template.tagText) {
        this.state.addText(template.tagText, 'Plus Jakarta Sans', '#FFFFFF', 20);
      }
    }
    this.router.navigate(['/design-studio/editor']);
  }

  // Delete confirmation modal state (Custom Popup Modal - Bug Fix)
  protected readonly designToDelete = signal<SavedDesignItem | null>(null);

  /** Load saved design from My Designs (Issue 8) */
  protected onContinueSavedDesign(saved: SavedDesignItem): void {
    this.state.clearCanvas();
    this.state.caseBg.set(saved.bg);
    this.state.designName.set(saved.name);
    this.state.selectMaterial(saved.material);
    if (saved.modelId) {
      this.catalog.selectModel(saved.modelId);
    }
    if (saved.layers && saved.layers.length > 0) {
      this.state.setLayers(saved.layers);
    }
    this.router.navigate(['/design-studio/editor']);
  }

  /** Trigger delete confirmation modal */
  protected onDeleteSavedDesign(item: SavedDesignItem, event: MouseEvent): void {
    event.stopPropagation();
    this.designToDelete.set(item);
  }

  /** Confirm deletion of saved design */
  protected confirmDelete(): void {
    const target = this.designToDelete();
    if (target) {
      this.state.savedDesigns.update((list) => list.filter((item) => item.id !== target.id));
    }
    this.designToDelete.set(null);
  }

  /** Cancel deletion */
  protected cancelDelete(): void {
    this.designToDelete.set(null);
  }
}
