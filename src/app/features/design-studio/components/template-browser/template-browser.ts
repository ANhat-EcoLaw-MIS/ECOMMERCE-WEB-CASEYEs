import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudioCatalogService } from '../../services/studio-catalog';
import { StudioState } from '../../services/studio-state';

export interface TemplateCard {
  id: string;
  name: string;
  creator: string;
  style: string;
  styleLabel: string;
  gradient: string;
  tagText: string;
  price: number;
  isEditable: boolean;
  isTrending: boolean;
}

const TEMPLATE_CATALOG: TemplateCard[] = [
  { id: 'tpl-001', name: 'Retro Lavender Waves', creator: 'CaseCraftStudio', style: 'y2k', styleLabel: 'Y2K Vibe', gradient: 'linear-gradient(160deg,#D4C8FA 0%,#A58CF4 100%)', tagText: 'Good Vibes Only', price: 250000, isEditable: true, isTrending: true },
  { id: 'tpl-002', name: 'Night City Lights', creator: 'CyberNomad', style: 'cyberpunk', styleLabel: 'Cyberpunk', gradient: 'linear-gradient(160deg,#0a0a0a 0%,#433075 100%)', tagText: 'TOKYO NEON', price: 260000, isEditable: true, isTrending: false },
  { id: 'tpl-003', name: 'Clean Typography', creator: 'MinimalStudio', style: 'minimalist', styleLabel: 'Minimalist', gradient: 'linear-gradient(160deg,#FFFFFF 0%,#ECE6FD 100%)', tagText: 'less is more.', price: 230000, isEditable: true, isTrending: true },
  { id: 'tpl-004', name: 'Sakura Dream', creator: 'AnimeArtist', style: 'anime', styleLabel: 'Anime Manga', gradient: 'linear-gradient(160deg,#ffd1a8 0%,#ff7e8b 100%)', tagText: '桜 SAKURA ✨', price: 240000, isEditable: true, isTrending: true },
  { id: 'tpl-005', name: 'Pastel Bunny', creator: 'KawaiiShop', style: 'cute', styleLabel: 'Cute & Pastel', gradient: 'linear-gradient(160deg,#ffe3b8 0%,#ffa8d2 100%)', tagText: '🐰 kawaii', price: 235000, isEditable: true, isTrending: false },
  { id: 'tpl-006', name: 'Electric Ocean', creator: 'NeonWaves', style: 'cyberpunk', styleLabel: 'Cyberpunk', gradient: 'linear-gradient(160deg,#1a1a3d 0%,#0088ff 100%)', tagText: 'ELECTRIC BLUE', price: 255000, isEditable: true, isTrending: false },
  { id: 'tpl-007', name: 'Aesthetic Moodboard', creator: 'PastelFactory', style: 'y2k', styleLabel: 'Y2K Vibe', gradient: 'linear-gradient(160deg,#a58cf4 0%,#ffd1a8 100%)', tagText: 'that girl era', price: 245000, isEditable: true, isTrending: true },
  { id: 'tpl-008', name: 'Wabi Sabi Zen', creator: 'ZenStudio', style: 'minimalist', styleLabel: 'Minimalist', gradient: 'linear-gradient(160deg,#f5f0eb 0%,#d4c5b0 100%)', tagText: 'breath.', price: 220000, isEditable: true, isTrending: false },
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

  protected readonly aiPrompt = signal('');
  protected readonly selectedStyle = signal<string>('all');
  protected readonly isAiSearching = signal<boolean>(false);
  protected readonly showNoResults = signal<boolean>(false);

  protected readonly styles = [
    { id: 'all', name: 'Tất cả phong cách' },
    { id: 'y2k', name: 'Y2K Nostalgia' },
    { id: 'minimalist', name: 'Tối giản & Clean' },
    { id: 'cyberpunk', name: 'Cyberpunk & Neon' },
    { id: 'anime', name: 'Anime Manga' },
    { id: 'cute', name: 'Dễ thương & Pastel' },
  ];

  protected readonly templates = TEMPLATE_CATALOG;

  protected readonly filteredTemplates = computed(() => {
    const style = this.selectedStyle();
    return this.templates.filter(t => style === 'all' || t.style === style);
  });

  protected readonly trendingTemplates = computed(() =>
    this.templates.filter(t => t.isTrending)
  );

  protected setPrompt(text: string): void {
    this.aiPrompt.set(text);
    this.showNoResults.set(false);
  }

  protected onPromptInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.aiPrompt.set(input.value);
    this.showNoResults.set(false);
  }

  protected selectStyle(styleId: string): void {
    this.selectedStyle.set(styleId);
    this.showNoResults.set(false);
  }

  /**
   * FR-DES-05: Disable send when prompt is empty.
   * FR-DES-06/AF3: Show Trending when no results found.
   */
  protected onAiSearch(): void {
    if (!this.aiPrompt().trim()) return;
    this.isAiSearching.set(true);
    setTimeout(() => {
      this.isAiSearching.set(false);
      const prompt = this.aiPrompt().toLowerCase();
      const hasMatch = this.templates.some(
        t =>
          t.name.toLowerCase().includes(prompt) ||
          t.styleLabel.toLowerCase().includes(prompt) ||
          t.tagText.toLowerCase().includes(prompt),
      );
      this.showNoResults.set(!hasMatch);
    }, 900);
  }

  /**
   * FR-DES-08 / AF1: "Mua ngay" – check BaseSKU stock, skip canvas, add directly to cart.
   */
  protected onBuyNow(template: TemplateCard): void {
    const sku = this.catalog.selectedSku();
    if (!sku || !sku.isAvailable) {
      alert('Phiên bản ốp lưng cho dòng máy này hiện đang hết hàng. Vui lòng chọn dòng máy khác.');
      return;
    }
    // Production: inject CartState from core/ and add item. Using alert for demo scope.
    alert(
      `✅ Đã thêm mẫu "${template.name}" (${sku.colorName}) vào giỏ hàng!\nGiá: ${template.price.toLocaleString('vi-VN')}đ`,
    );
    this.router.navigate(['/cart']);
  }

  /**
   * FR-DES-08 / PF: "Thiết kế mẫu này" – load template layers into canvas and navigate to editor.
   */
  protected onDesignTemplate(_template: TemplateCard): void {
    // Production: dispatch template load action to StudioState before routing.
    this.router.navigate(['/design-studio/editor']);
  }
}
