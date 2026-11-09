import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudioCatalogService } from '../../services/studio-catalog';
import { SavedDesignItem, StudioState } from '../../services/studio-state';
import { SupabaseAuthService } from '../../../../core/supabase/supabase-auth.service';

export interface TemplateCard {
  id: string;
  name: string;
  creator: string;
  category: 'floral' | 'minimalist' | 'nature' | 'cartoon' | 'typography' | 'abstract' | 'cute';
  categories: string[];
  styleLabel: string;
  gradient: string;
  tagText: string;
  description: string;
  tagLabel: string;
  tagColor: string;
  rating: number;
  reviews: string;
  price: number;
  isTrending: boolean;
  isBlankCanvas?: boolean;
  artType:
    | 'dreamy-kitten'
    | 'sakura-bloom'
    | 'mountain-escape'
    | 'minimal-cat'
    | 'anime-girl'
    | 'abstract-waves'
    | 'dino-friend'
    | 'starry-night'
    | 'that-girl-era'
    | 'blank';
}

export const TEMPLATE_CATALOG: TemplateCard[] = [
  // 1. Dreamy Kitten (#pastel) - Top row card 1 in mockup
  {
    id: 'tpl-001',
    name: 'Dreamy Kitten',
    creator: 'PastelStudio',
    category: 'cute',
    categories: ['cute', 'all'],
    styleLabel: 'Dễ thương',
    gradient: 'linear-gradient(180deg, #93c5fd 0%, #c4b5fd 40%, #fbcfe8 100%)',
    tagText: 'DREAMY VIBES',
    description: 'Mây hồng pastel bồng bềnh cùng những chú mèo con đáng yêu mỉm cười.',
    tagLabel: '#pastel',
    tagColor: '#a855f7',
    rating: 4.9,
    reviews: '1.2k',
    price: 250000,
    isTrending: true,
    artType: 'dreamy-kitten',
  },
  // 2. Sakura Bloom (#floral) - Top row card 2 in mockup
  {
    id: 'tpl-002',
    name: 'Sakura Bloom',
    creator: 'TokyoVibe',
    category: 'floral',
    categories: ['floral', 'cute', 'all'],
    styleLabel: 'Hoa lá',
    gradient: 'linear-gradient(180deg, #fff1f2 0%, #fce7f3 40%, #fbcfe8 100%)',
    tagText: 'SAKURA BLOOM',
    description: 'Cành hoa anh đào Nhật Bản nở rộ trong trẻo, mang vẻ tươi mới mùa xuân.',
    tagLabel: '#floral',
    tagColor: '#ec4899',
    rating: 4.8,
    reviews: '956',
    price: 250000,
    isTrending: true,
    artType: 'sakura-bloom',
  },
  // 3. Mountain Escape (#nature) - Top row card 3 in mockup
  {
    id: 'tpl-003',
    name: 'Mountain Escape',
    creator: 'AlpineLab',
    category: 'nature',
    categories: ['nature', 'all'],
    styleLabel: 'Phong cảnh',
    gradient: 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 40%, #ecfeff 80%)',
    tagText: 'WILD & FREE',
    description: 'Dãy núi tuyết hùng vĩ soi bóng mặt hồ xanh biếc và rừng thông ngút ngàn.',
    tagLabel: '#nature',
    tagColor: '#10b981',
    rating: 4.9,
    reviews: '742',
    price: 250000,
    isTrending: false,
    artType: 'mountain-escape',
  },
  // 4. Minimal Cat (#minimal) - Top row card 4 in mockup
  {
    id: 'tpl-004',
    name: 'Minimal Cat',
    creator: 'ZenMinimal',
    category: 'minimalist',
    categories: ['minimalist', 'cute', 'all'],
    styleLabel: 'Tối giản',
    gradient: '#FAF8F5',
    tagText: 'MINIMAL CAT',
    description: 'Nét vẽ chú mèo tối giản nhìn lên trái tim đỏ tinh tế trên nền kem ấm.',
    tagLabel: '#minimal',
    tagColor: '#3b82f6',
    rating: 4.9,
    reviews: '1.1k',
    price: 250000,
    isTrending: true,
    artType: 'minimal-cat',
  },
  // 5. Anime Girl (#anime) - Bottom row card 1 in mockup
  {
    id: 'tpl-005',
    name: 'Anime Girl',
    creator: 'AnimeArtisan',
    category: 'cartoon',
    categories: ['cartoon', 'all'],
    styleLabel: 'Hoạt hình',
    gradient: 'linear-gradient(180deg, #c7d2fe 0%, #a5b4fc 40%, #818cf8 100%)',
    tagText: 'KAWAII SOUL',
    description: 'Cô gái anime tóc xanh xinh xắn trong ánh sao lấp lánh huyền ảo.',
    tagLabel: '#anime',
    tagColor: '#6366f1',
    rating: 4.8,
    reviews: '933',
    price: 250000,
    isTrending: true,
    artType: 'anime-girl',
  },
  // 6. Abstract Waves (#abstract) - Bottom row card 2 in mockup
  {
    id: 'tpl-006',
    name: 'Abstract Waves',
    creator: 'ChromaFlow',
    category: 'abstract',
    categories: ['abstract', 'all'],
    styleLabel: 'Abstract',
    gradient: '#fffbeb',
    tagText: 'FLOW STATE',
    description: 'Dải lụa sóng pastel mềm mại uốn lượn phong cách retro aesthetic.',
    tagLabel: '#abstract',
    tagColor: '#f97316',
    rating: 4.7,
    reviews: '685',
    price: 250000,
    isTrending: false,
    artType: 'abstract-waves',
  },
  // 7. Dino Friend (#cute) - Bottom row card 3 in mockup
  {
    id: 'tpl-007',
    name: 'Dino Friend',
    creator: 'ChibiStudio',
    category: 'cute',
    categories: ['cute', 'cartoon', 'all'],
    styleLabel: 'Dễ thương',
    gradient: '#f0fdf4',
    tagText: 'LITTLE DINO',
    description: 'Khủng long con màu xanh tinh nghịch mỉm cười giữa vườn hoa cúc.',
    tagLabel: '#cute',
    tagColor: '#84cc16',
    rating: 4.9,
    reviews: '721',
    price: 250000,
    isTrending: true,
    artType: 'dino-friend',
  },
  // 8. Starry Night (#sky) - Bottom row card 4 in mockup
  {
    id: 'tpl-008',
    name: 'Starry Night',
    creator: 'CosmicWander',
    category: 'nature',
    categories: ['nature', 'cute', 'all'],
    styleLabel: 'Phong cảnh',
    gradient: 'linear-gradient(180deg, #4f46e5 0%, #7c3aed 45%, #c084fc 100%)',
    tagText: 'MOONLIGHT',
    description: 'Bầu trời hoàng hôn tím mộng mơ với vầng trăng khuyết và mây bay.',
    tagLabel: '#sky',
    tagColor: '#0ea5e9',
    rating: 4.8,
    reviews: '590',
    price: 250000,
    isTrending: true,
    artType: 'starry-night',
  },
  // 9. That Girl Era (#typography)
  {
    id: 'tpl-009',
    name: 'That Girl Era',
    creator: 'VogueTypography',
    category: 'typography',
    categories: ['typography', 'all'],
    styleLabel: 'Typography',
    gradient: 'linear-gradient(160deg, #fce7f3 0%, #f5d0fe 50%, #e0e7ff 100%)',
    tagText: 'THAT GIRL ERA',
    description: 'Kiểu chữ Typography thời thượng khẳng định phong cách hiện đại.',
    tagLabel: '#typography',
    tagColor: '#d946ef',
    rating: 4.9,
    reviews: '820',
    price: 250000,
    isTrending: false,
    artType: 'that-girl-era',
  },
  // 10. Phôi Trắng Tiêu Chuẩn (Tự vẽ từ số 0)
  {
    id: 'tpl-blank',
    name: 'Ốp Lưng Trắng Tiêu Chuẩn',
    creator: 'CasEYE Studio',
    category: 'minimalist',
    categories: ['minimalist', 'all'],
    styleLabel: 'Tự vẽ từ số 0',
    gradient: '#FFFFFF',
    tagText: '',
    description: 'Bắt đầu từ phôi ốp trắng trơn. Tự do sáng tạo ảnh, chữ và sticker theo chất riêng.',
    tagLabel: '#custom',
    tagColor: '#433075',
    rating: 5.0,
    reviews: '2.4k',
    price: 220000,
    isTrending: false,
    isBlankCanvas: true,
    artType: 'blank',
  },
];

@Component({
  selector: 'app-template-browser',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './template-browser.html',
  styleUrl: './template-browser.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateBrowser {
  protected readonly state = inject(StudioState);
  private readonly catalog = inject(StudioCatalogService);
  private readonly router = inject(Router);
  private readonly auth = inject(SupabaseAuthService);

  // Authentication & Designs State
  protected readonly isLoggedIn = this.auth.isAuthenticated;
  protected readonly myDesigns = this.state.savedDesigns;

  /** First 4 designs displayed on the main page */
  protected readonly displayedMyDesigns = computed(() => this.myDesigns().slice(0, 4));

  /** Whether designs count exceeds 4 (triggers "Xem tất cả →" button) */
  protected readonly hasMoreMyDesigns = computed(() => this.myDesigns().length > 4);

  // Modal & Popup States
  protected readonly showAllDesignsModal = signal<boolean>(false);
  protected readonly searchMyDesignQuery = signal<string>('');
  protected readonly preview3dTemplate = signal<TemplateCard | null>(null);
  protected readonly activeMenuDesignId = signal<string | null>(null);

  // Delete & Rename Modals
  protected readonly designToDelete = signal<SavedDesignItem | null>(null);
  protected readonly designToRename = signal<SavedDesignItem | null>(null);
  protected readonly renameInput = signal<string>('');

  // Favorites Set
  protected readonly favoriteTemplates = signal<Set<string>>(new Set(['tpl-001', 'tpl-004']));

  // Filter & Search Signals
  protected readonly activeCategory = signal<string>('all');
  protected readonly aiPrompt = signal<string>('');
  protected readonly isAiSearching = signal<boolean>(false);
  protected readonly showNoResults = signal<boolean>(false);

  // Categories matching the image tabs
  protected readonly categories = [
    { id: 'all', name: 'Tất cả' },
    { id: 'floral', name: 'Hoa lá' },
    { id: 'minimalist', name: 'Tối giản' },
    { id: 'nature', name: 'Phong cảnh' },
    { id: 'cartoon', name: 'Hoạt hình' },
    { id: 'typography', name: 'Typography' },
    { id: 'abstract', name: 'Abstract' },
    { id: 'cute', name: 'Cute' },
  ];

  protected readonly templates = TEMPLATE_CATALOG;

  /** Filtered templates based on category and search */
  protected readonly filteredTemplates = computed(() => {
    const cat = this.activeCategory();
    return this.templates.filter((t) => cat === 'all' || t.categories.includes(cat));
  });

  /** Filtered designs inside the "Xem tất cả" Modal */
  protected readonly filteredModalDesigns = computed(() => {
    const q = this.searchMyDesignQuery().trim().toLowerCase();
    const list = this.myDesigns();
    if (!q) return list;
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.modelName.toLowerCase().includes(q) ||
        (d.thumbnailText && d.thumbnailText.toLowerCase().includes(q))
    );
  });

  /** Trending templates for fallback recommendations */
  protected readonly trendingTemplates = computed(() =>
    this.templates.filter((t) => t.isTrending).slice(0, 4)
  );

  // --- Category and Search Handlers ---
  protected selectCategory(catId: string): void {
    this.activeCategory.set(catId);
    this.showNoResults.set(false);
  }

  protected setPrompt(text: string): void {
    this.aiPrompt.set(text);
    this.showNoResults.set(false);
  }

  protected onPromptInput(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.aiPrompt.set(input.value);
    this.showNoResults.set(false);
  }

  /** Trigger AI suggestion based on user's prompt (F13 shortcut or click) */
  protected onAiSearch(): void {
    const query = this.aiPrompt().trim().toLowerCase();
    if (!query) return;

    this.isAiSearching.set(true);
    setTimeout(() => {
      this.isAiSearching.set(false);

      // Intelligent keyword matching
      let matchedCategory = 'all';
      if (/hoa|cherry|blossom|sakura|rose/i.test(query)) {
        matchedCategory = 'floral';
      } else if (/tối giản|minimal|đơn giản|clean/i.test(query)) {
        matchedCategory = 'minimalist';
      } else if (/núi|sơn thủy|phong cảnh|nature|mountain|hồ/i.test(query)) {
        matchedCategory = 'nature';
      } else if (/anime|hoạt hình|manga|chibi/i.test(query)) {
        matchedCategory = 'cartoon';
      } else if (/chữ|quote|typography|slogan/i.test(query)) {
        matchedCategory = 'typography';
      } else if (/sóng|abstract|loang|wave/i.test(query)) {
        matchedCategory = 'abstract';
      } else if (/mèo|cat|dino|khủng long|cute|dễ thương|pastel/i.test(query)) {
        matchedCategory = 'cute';
      }

      this.activeCategory.set(matchedCategory);

      // Check if any template matches
      const hasDirectMatch = this.templates.some(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tagLabel.toLowerCase().includes(query) ||
          t.categories.includes(matchedCategory)
      );

      this.showNoResults.set(!hasDirectMatch);

      // Smooth scroll to template section
      const target = document.getElementById('template-grid-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 650);
  }

  protected onRetry(): void {
    this.aiPrompt.set('');
    this.showNoResults.set(false);
    this.activeCategory.set('all');
  }

  // --- Favorite Toggle ---
  protected toggleFavorite(templateId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteTemplates.update((set) => {
      const next = new Set(set);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  }

  protected isFavorite(templateId: string): boolean {
    return this.favoriteTemplates().has(templateId);
  }

  // --- 3D Preview Modal ---
  protected openPreview3d(template: TemplateCard, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.preview3dTemplate.set(template);
  }

  protected closePreview3d(): void {
    this.preview3dTemplate.set(null);
  }

  // --- Template Loading / Creation ---
  protected onDesignTemplate(template: TemplateCard): void {
    this.closePreview3d();
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

  protected createNewDesign(): void {
    this.state.clearCanvas();
    this.state.caseBg.set('#FFFFFF');
    this.state.designName.set(`Ốp lưng ${this.state.selectedModel().name} - Thiết kế mới`);
    this.closeAllDesignsModal();
    this.router.navigate(['/design-studio/editor']);
  }

  // --- My Designs Actions ---
  protected onContinueSavedDesign(saved: SavedDesignItem): void {
    this.closeCardMenu();
    this.closeAllDesignsModal();
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

  protected toggleCardMenu(designId: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeMenuDesignId() === designId) {
      this.activeMenuDesignId.set(null);
    } else {
      this.activeMenuDesignId.set(designId);
    }
  }

  protected closeCardMenu(): void {
    this.activeMenuDesignId.set(null);
  }

  // --- "Xem tất cả" Modal Popup ---
  protected openAllDesignsModal(): void {
    this.closeCardMenu();
    this.searchMyDesignQuery.set('');
    this.showAllDesignsModal.set(true);
  }

  protected closeAllDesignsModal(): void {
    this.showAllDesignsModal.set(false);
  }

  protected onSearchMyDesignsInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchMyDesignQuery.set(target.value);
  }

  // --- Duplicate Saved Design ---
  protected duplicateSavedDesign(item: SavedDesignItem, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.closeCardMenu();

    const cloned: SavedDesignItem = {
      ...item,
      id: 'saved_' + Date.now(),
      name: `${item.name} (Bản sao)`,
      savedAt: 'Vừa xong',
    };

    this.state.savedDesigns.update((list) => [cloned, ...list]);
  }

  // --- Rename Saved Design ---
  protected startRenameDesign(item: SavedDesignItem, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.closeCardMenu();
    this.designToRename.set(item);
    this.renameInput.set(item.name);
  }

  protected confirmRename(): void {
    const target = this.designToRename();
    const newName = this.renameInput().trim();
    if (target && newName) {
      this.state.savedDesigns.update((list) =>
        list.map((d) => (d.id === target.id ? { ...d, name: newName } : d))
      );
    }
    this.designToRename.set(null);
  }

  protected cancelRename(): void {
    this.designToRename.set(null);
  }

  // --- Delete Saved Design ---
  protected onDeleteSavedDesign(item: SavedDesignItem, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.closeCardMenu();
    this.designToDelete.set(item);
  }

  protected confirmDelete(): void {
    const target = this.designToDelete();
    if (target) {
      this.state.savedDesigns.update((list) => list.filter((item) => item.id !== target.id));
    }
    this.designToDelete.set(null);
  }

  protected cancelDelete(): void {
    this.designToDelete.set(null);
  }
}
