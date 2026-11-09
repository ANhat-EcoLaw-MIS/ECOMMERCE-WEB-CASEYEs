import { DecimalPipe } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudioCatalogService } from '../../services/studio-catalog';
import { SavedDesignItem, StudioState } from '../../services/studio-state';
import { SupabaseAuthService } from '../../../../core/supabase/supabase-auth.service';

// Dynamically import @google/model-viewer for rich WebGL 3D rendering in browser
if (typeof window !== 'undefined') {
  import('@google/model-viewer').catch((err) => {
    console.warn('Google Model Viewer dynamic import warning:', err);
  });
}

export interface TemplateReview {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5 stars
  date: string;
  deviceModel: string;
  comment: string;
  isVerifiedBuyer: boolean;
}

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
  detailedDescription: string;
  tagLabel: string;
  tagColor: string;
  rating: number;
  reviews: string;
  reviewCount: number;
  hashtags: string[];
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
  // 1. Dreamy Kitten (#pastel)
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
    detailedDescription:
      'Thiết kế Dreamy Kitten mang đến bầu không khí mộng mơ với những đám mây pastel bồng bềnh và chú mèo con ngọt ngào. Sử dụng công nghệ in UV đa lớp chống trầy xước, phôi ốp Polycarbonate tiêu chuẩn với viền TPU đệm khí 4 góc giúp bảo vệ máy tối đa.',
    tagLabel: '#pastel',
    tagColor: '#a855f7',
    rating: 4.9,
    reviews: '1.2k',
    reviewCount: 1240,
    hashtags: ['#pastel', '#cute', '#kitten', '#dreamy', '#catlover', '#pinksky', '#aesthetic'],
    isTrending: true,
    artType: 'dreamy-kitten',
  },
  // 2. Sakura Bloom (#floral)
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
    detailedDescription:
      'Lấy cảm hứng từ những cành hoa anh đào nở rộ trong gió xuân Tokyo. Từng chi tiết cánh hoa được xử lý chuyển sắc tinh tế trên nền kem ánh hồng sang trọng, phù hợp cho phong cách nữ tính, thanh lịch.',
    tagLabel: '#floral',
    tagColor: '#ec4899',
    rating: 4.8,
    reviews: '956',
    reviewCount: 956,
    hashtags: ['#floral', '#sakura', '#japan', '#cherryblossom', '#spring', '#aesthetic', '#pink'],
    isTrending: true,
    artType: 'sakura-bloom',
  },
  // 3. Mountain Escape (#nature)
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
    detailedDescription:
      'Phong cảnh núi tuyết phản chiếu mặt hồ tĩnh lặng mang lại cảm giác bình yên và phóng khoáng. Gam màu xanh ngọc bích hòa quyện cùng bầu trời trong trẻo, tôn lên nét cá tính cho người yêu xê dịch.',
    tagLabel: '#nature',
    tagColor: '#10b981',
    rating: 4.9,
    reviews: '742',
    reviewCount: 742,
    hashtags: ['#nature', '#mountain', '#alpine', '#lake', '#wanderlust', '#travel', '#freedom'],
    isTrending: false,
    artType: 'mountain-escape',
  },
  // 4. Minimal Cat (#minimal)
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
    detailedDescription:
      'Nét vẽ một nét (continuous line art) tinh giản khắc họa chú mèo nhỏ ngước nhìn trái tim đỏ ấm áp. Nền kem Warm Ivory dịu mắt, phù hợp tuyệt đối với những tín đồ phong cách tối giản Bắc Âu.',
    tagLabel: '#minimal',
    tagColor: '#3b82f6',
    rating: 4.9,
    reviews: '1.1k',
    reviewCount: 1120,
    hashtags: ['#minimal', '#lineart', '#cat', '#zen', '#cozy', '#modern', '#blackandwhite'],
    isTrending: true,
    artType: 'minimal-cat',
  },
  // 5. Anime Girl (#anime)
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
    detailedDescription:
      'Tác phẩm minh họa phong cách anime hiện đại với mái tóc xanh óng ánh và những hạt sao vũ trụ lung linh. Kỹ thuật in phủ bóng cục bộ tạo độ sâu quang học sống động dưới mọi góc nhìn.',
    tagLabel: '#anime',
    tagColor: '#6366f1',
    rating: 4.8,
    reviews: '933',
    reviewCount: 933,
    hashtags: ['#anime', '#kawaii', '#manga', '#bluehair', '#aesthetic', '#otaku', '#cyber'],
    isTrending: true,
    artType: 'anime-girl',
  },
  // 6. Abstract Waves (#abstract)
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
    detailedDescription:
      'Những dải sóng pastel nhịp nhàng uốn lượn mang cảm hứng Retro Futurism kết hợp hơi thở hiện đại. Sự chuyển giao màu sắc mềm mại tạo nên vẻ ngoài thời thượng.',
    tagLabel: '#abstract',
    tagColor: '#f97316',
    rating: 4.7,
    reviews: '685',
    reviewCount: 685,
    hashtags: ['#abstract', '#waves', '#retro', '#palette', '#modernart', '#flow', '#pastel'],
    isTrending: false,
    artType: 'abstract-waves',
  },
  // 7. Dino Friend (#cute)
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
    detailedDescription:
      'Chú khủng long xanh lá mũm mĩm với nụ cười rạng rỡ giữa những đóa hoa cúc vàng. Năng lượng tích cực và đáng yêu sẽ đồng hành cùng bạn suốt cả ngày dài.',
    tagLabel: '#cute',
    tagColor: '#84cc16',
    rating: 4.9,
    reviews: '721',
    reviewCount: 721,
    hashtags: ['#cute', '#dino', '#chibi', '#cartoon', '#green', '#happy', '#kawaii'],
    isTrending: true,
    artType: 'dino-friend',
  },
  // 8. Starry Night (#sky)
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
    detailedDescription:
      'Bầu trời đêm huyền ảo trong ánh trăng lưỡi liềm vàng kim và những dải mây tím bồng bềnh. Biểu tượng cho sự tĩnh lặng, sâu lắng và nguồn cảm hứng sáng tạo bất tận.',
    tagLabel: '#sky',
    tagColor: '#0ea5e9',
    rating: 4.8,
    reviews: '590',
    reviewCount: 590,
    hashtags: ['#sky', '#night', '#moon', '#stars', '#cosmic', '#dreamy', '#purple'],
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
    detailedDescription:
      'Thông điệp khẳng định bản thân đầy tự tin theo xu hướng "That Girl" với phông chữ serif thời trang và màu hồng cánh sen kiêu kỳ. Dành cho những cô nàng độc lập và phong cách.',
    tagLabel: '#typography',
    tagColor: '#d946ef',
    rating: 4.9,
    reviews: '820',
    reviewCount: 820,
    hashtags: ['#typography', '#thatgirl', '#y2k', '#positive', '#vibe', '#aesthetic', '#pink'],
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
    detailedDescription:
      'Phôi ốp trắng tinh khôi chuẩn bị sẵn sàng cho sự sáng tạo không giới hạn của bạn. Hãy nạp lên Studio để thêm ảnh cá nhân, chèn chữ nghệ thuật và ghép những nhãn sticker yêu thích.',
    tagLabel: '#custom',
    tagColor: '#433075',
    rating: 5.0,
    reviews: '2.4k',
    reviewCount: 2400,
    hashtags: ['#tự_thiết_kế', '#blank', '#diy', '#custom', '#minimal', '#canvas'],
    isTrending: false,
    isBlankCanvas: true,
    artType: 'blank',
  },
];

const INITIAL_REVIEWS: Record<string, TemplateReview[]> = {
  default: [
    {
      id: 'rev-1',
      userName: 'Ngọc Linh',
      rating: 5,
      date: 'Hôm qua',
      deviceModel: 'iPhone 15 Pro Max',
      comment:
        'Mẫu in ra thực tế màu sắc rất ngọt ngào, đường nét sắc sảo. Ốp ôm khít máy, bảo vệ viền camera nhô cao rất an tâm!',
      isVerifiedBuyer: true,
    },
    {
      id: 'rev-2',
      userName: 'Quốc Huy',
      rating: 5,
      date: '3 ngày trước',
      deviceModel: 'iPhone 15 Pro',
      comment:
        'Chất liệu ốp cứng cáp, bề mặt chống bám vân tay tốt. Đặt in hôm trước hôm sau đã nhận được hàng.',
      isVerifiedBuyer: true,
    },
    {
      id: 'rev-3',
      userName: 'Thu Trang',
      rating: 4,
      date: '1 tuần trước',
      deviceModel: 'iPhone 14',
      comment: 'Đẹp xỉu luôn mn ơi, đúng gu pastel nhẹ nhàng. Sẽ tiếp tục ủng hộ CasEYE’s!',
      isVerifiedBuyer: true,
    },
  ],
};

@Component({
  selector: 'app-template-browser',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
  protected readonly previewTemplate = signal<TemplateCard | null>(null);
  protected readonly activeMenuDesignId = signal<string | null>(null);

  // 3D View Controls
  protected readonly viewMode = signal<'3d' | '2d'>('3d');
  protected readonly isAutoRotate = signal<boolean>(true);

  // Reviews State
  protected readonly reviewsMap = signal<Record<string, TemplateReview[]>>(INITIAL_REVIEWS);
  protected readonly currentTemplateReviews = computed(() => {
    const tpl = this.previewTemplate();
    if (!tpl) return [];
    return this.reviewsMap()[tpl.id] || INITIAL_REVIEWS['default'];
  });

  // User Interactive Review Submission State
  protected readonly userRating = signal<number>(5);
  protected readonly userReviewText = signal<string>('');
  protected readonly reviewSubmittedSuccess = signal<boolean>(false);

  // Delete & Rename Modals
  protected readonly designToDelete = signal<SavedDesignItem | null>(null);
  protected readonly designToRename = signal<SavedDesignItem | null>(null);
  protected readonly renameInput = signal<string>('');

  // Favorites Set
  protected readonly favoriteTemplates = signal<Set<string>>(new Set(['tpl-001', 'tpl-004']));

  // Filter & Search Signals
  protected readonly activeCategory = signal<string>('all');
  protected readonly activeHashtagFilter = signal<string | null>(null);
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

  /** Filtered templates based on category, hashtag and search */
  protected readonly filteredTemplates = computed(() => {
    const cat = this.activeCategory();
    const tag = this.activeHashtagFilter();
    return this.templates.filter((t) => {
      const matchCat = cat === 'all' || t.categories.includes(cat);
      const matchTag = !tag || t.hashtags.includes(tag) || t.tagLabel === tag;
      return matchCat && matchTag;
    });
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

  /** URL to 3D model for current phone model */
  protected readonly current3dModelUrl = computed(() => {
    const model = this.state.selectedModel();
    return model?.model3dUrl || '/models/iphone-15-pro-max.glb';
  });

  // --- Category and Hashtag Handlers ---
  protected selectCategory(catId: string): void {
    this.activeCategory.set(catId);
    this.activeHashtagFilter.set(null);
    this.showNoResults.set(false);
  }

  protected filterByHashtag(tag: string): void {
    this.closePreviewModal();
    this.activeHashtagFilter.set(tag);
    this.activeCategory.set('all');
    // Scroll down to template grid
    const target = document.getElementById('template-grid-section');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected clearHashtagFilter(): void {
    this.activeHashtagFilter.set(null);
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
    this.activeHashtagFilter.set(null);
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

  // --- Detail & 3D Preview Modal ---
  protected openDetailModal(template: TemplateCard, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.previewTemplate.set(template);
    this.viewMode.set('3d');
    this.isAutoRotate.set(true);
    this.userReviewText.set('');
    this.userRating.set(5);
    this.reviewSubmittedSuccess.set(false);
  }

  protected closePreviewModal(): void {
    this.previewTemplate.set(null);
    this.reviewSubmittedSuccess.set(false);
  }

  protected toggleViewMode(mode: '3d' | '2d'): void {
    this.viewMode.set(mode);
  }

  protected toggleAutoRotate(): void {
    this.isAutoRotate.update((v) => !v);
  }

  // --- User Review Submission ---
  protected setUserRating(star: number): void {
    this.userRating.set(star);
  }

  protected onReviewTextInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.userReviewText.set(target.value);
  }

  protected onSubmitUserReview(): void {
    const comment = this.userReviewText().trim();
    if (!comment) return;

    const tpl = this.previewTemplate();
    if (!tpl) return;

    const newRev: TemplateReview = {
      id: 'rev-' + Date.now(),
      userName: 'Bạn (Khách hàng)',
      rating: this.userRating(),
      date: 'Vừa xong',
      deviceModel: this.state.selectedModel().name,
      comment,
      isVerifiedBuyer: true,
    };

    const currentList = this.reviewsMap()[tpl.id] || [...INITIAL_REVIEWS['default']];
    this.reviewsMap.update((map) => ({
      ...map,
      [tpl.id]: [newRev, ...currentList],
    }));

    this.userReviewText.set('');
    this.reviewSubmittedSuccess.set(true);

    setTimeout(() => {
      this.reviewSubmittedSuccess.set(false);
    }, 4000);
  }

  // --- Template Loading / Creation ---
  protected onDesignTemplate(template: TemplateCard): void {
    this.closePreviewModal();
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
