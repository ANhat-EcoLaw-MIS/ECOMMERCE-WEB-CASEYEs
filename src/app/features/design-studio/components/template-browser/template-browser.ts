import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchService } from '../../../../core/search/search.service';
import { StudioCatalogService } from '../../services/studio-catalog';
import { SavedDesignItem, StudioState } from '../../services/studio-state';
import { CanvasLayer, ImageElement, TextElement } from '../../models/canvas-element.model';
import { SupabaseAuthService } from '../../../../core/supabase/supabase-auth.service';
import { AuthModal } from '../../../../core/auth/auth-modal';

/**
 * Universal SVG to Base64/UTF8 Data URI converter
 */
function svgToDataUri(svg: string): string {
  const trimmed = svg.trim();
  if (typeof btoa === 'function') {
    try {
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(trimmed)));
    } catch {
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(trimmed);
    }
  }
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(trimmed);
}

// ─── High-Definition Artwork SVGs for 1:1 Match with Studio Canvas ───
const TEMPLATE_SVG_KITTEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 350" width="400" height="350">
  <defs>
    <radialGradient id="cloudGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#fdf4ff"/>
    </radialGradient>
    <linearGradient id="blushGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f472b6" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <path d="M 50,280 C 20,280 0,250 15,220 C 5,185 35,160 70,170 C 90,130 150,120 180,150 C 210,110 280,115 305,155 C 345,145 385,175 380,215 C 405,245 385,280 350,280 Z" fill="url(#cloudGrad)"/>
  <g transform="translate(140, 160)">
    <polygon points="-50,-15 -25,-65 -5,-25" fill="#ffffff"/>
    <polygon points="-42,-20 -25,-55 -12,-28" fill="#fbcfe8"/>
    <polygon points="5,-25 25,-65 50,-15" fill="#ffffff"/>
    <polygon points="12,-28 25,-55 42,-20" fill="#fbcfe8"/>
    <circle cx="0" cy="0" r="55" fill="#ffffff"/>
    <path d="M -28,-6 Q -18,-18 -8,-6" fill="none" stroke="#db2777" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 8,-6 Q 18,-18 28,-6" fill="none" stroke="#db2777" stroke-width="3.5" stroke-linecap="round"/>
    <polygon points="-3,5 3,5 0,8" fill="#f472b6"/>
    <path d="M -8,11 Q 0,16 8,11" fill="none" stroke="#f472b6" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="-28" cy="8" rx="8" ry="5" fill="url(#blushGrad)"/>
    <ellipse cx="28" cy="8" rx="8" ry="5" fill="url(#blushGrad)"/>
    <ellipse cx="-25" cy="42" rx="12" ry="9" fill="#ffffff" stroke="#fce7f3" stroke-width="1.5"/>
    <ellipse cx="25" cy="42" rx="12" ry="9" fill="#ffffff" stroke="#fce7f3" stroke-width="1.5"/>
  </g>
  <g transform="translate(255, 185)">
    <polygon points="-38,-10 -20,-50 -5,-18" fill="#ffffff"/>
    <polygon points="-30,-14 -20,-42 -10,-20" fill="#fbcfe8"/>
    <polygon points="5,-18 20,-50 38,-10" fill="#ffffff"/>
    <polygon points="10,-20 20,-42 30,-14" fill="#fbcfe8"/>
    <circle cx="0" cy="0" r="44" fill="#ffffff"/>
    <path d="M -20,-4 Q -12,-14 -4,-4" fill="none" stroke="#db2777" stroke-width="3" stroke-linecap="round"/>
    <path d="M 4,-4 Q 12,-14 20,-4" fill="none" stroke="#db2777" stroke-width="3" stroke-linecap="round"/>
    <polygon points="-2.5,4 2.5,4 0,7" fill="#f472b6"/>
    <path d="M -6,9 Q 0,13 6,9" fill="none" stroke="#f472b6" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="-20" cy="7" rx="6.5" ry="4" fill="url(#blushGrad)"/>
    <ellipse cx="20" cy="7" rx="6.5" ry="4" fill="url(#blushGrad)"/>
  </g>
  <circle cx="65" cy="115" r="3.5" fill="#ffffff" opacity="0.9"/>
  <circle cx="330" cy="115" r="4" fill="#ffffff" opacity="0.9"/>
</svg>`;

const TEMPLATE_SVG_SAKURA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" width="400" height="700">
  <defs>
    <linearGradient id="sakuraWood" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#451a03"/>
      <stop offset="50%" stop-color="#78350f"/>
      <stop offset="100%" stop-color="#92400e"/>
    </linearGradient>
    <radialGradient id="sakuraPetalGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#fbcfe8"/>
      <stop offset="100%" stop-color="#f43f5e"/>
    </radialGradient>
    <g id="sakura_blossom">
      <circle cx="0" cy="-20" r="15" fill="url(#sakuraPetalGrad)" opacity="0.95"/>
      <circle cx="19" cy="-6" r="15" fill="url(#sakuraPetalGrad)" opacity="0.95"/>
      <circle cx="12" cy="16" r="15" fill="url(#sakuraPetalGrad)" opacity="0.95"/>
      <circle cx="-12" cy="16" r="15" fill="url(#sakuraPetalGrad)" opacity="0.95"/>
      <circle cx="-19" cy="-6" r="15" fill="url(#sakuraPetalGrad)" opacity="0.95"/>
      <circle cx="0" cy="0" r="7" fill="#be123c"/>
      <circle cx="0" cy="0" r="3.5" fill="#fde047"/>
    </g>
  </defs>
  <path d="M 40,680 Q 180,450 140,250 Q 120,110 300,50" fill="none" stroke="url(#sakuraWood)" stroke-width="16" stroke-linecap="round"/>
  <path d="M 150,320 Q 250,260 340,220" fill="none" stroke="url(#sakuraWood)" stroke-width="10" stroke-linecap="round"/>
  <path d="M 130,420 Q 80,350 40,320" fill="none" stroke="url(#sakuraWood)" stroke-width="8" stroke-linecap="round"/>
  <path d="M 230,160 Q 280,110 360,90" fill="none" stroke="url(#sakuraWood)" stroke-width="7" stroke-linecap="round"/>
  <use href="#sakura_blossom" x="140" y="250"/>
  <use href="#sakura_blossom" x="300" y="50"/>
  <use href="#sakura_blossom" x="340" y="220"/>
  <use href="#sakura_blossom" x="230" y="280"/>
  <use href="#sakura_blossom" x="280" y="110"/>
  <use href="#sakura_blossom" x="40" y="320"/>
  <use href="#sakura_blossom" x="90" y="380"/>
  <use href="#sakura_blossom" x="360" y="90"/>
  <use href="#sakura_blossom" x="180" y="180"/>
  <ellipse cx="90" cy="190" rx="9" ry="6" fill="#f43f5e" opacity="0.75" transform="rotate(35 90 190)"/>
  <ellipse cx="210" cy="380" rx="10" ry="7" fill="#f43f5e" opacity="0.8" transform="rotate(-25 210 380)"/>
  <ellipse cx="270" cy="480" rx="8" ry="5" fill="#f43f5e" opacity="0.65" transform="rotate(45 270 480)"/>
  <ellipse cx="140" cy="550" rx="9" ry="6" fill="#f43f5e" opacity="0.7" transform="rotate(15 140 550)"/>
</svg>`;

const TEMPLATE_SVG_MOUNTAIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <defs>
    <linearGradient id="mtnCenter" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="lakeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#075985"/>
    </linearGradient>
  </defs>
  <polygon points="140,360 280,150 400,360" fill="#0369a1"/>
  <polygon points="280,150 250,210 280,195 310,210" fill="#ffffff"/>
  <polygon points="0,380 90,240 220,380" fill="#0284c7"/>
  <polygon points="90,240 70,285 90,275 110,285" fill="#ffffff"/>
  <polygon points="40,360 200,90 360,360" fill="url(#mtnCenter)"/>
  <polygon points="200,90 150,180 200,160 250,180" fill="#ffffff"/>
  <polygon points="-20,400 80,270 200,400" fill="#0f766e"/>
  <polygon points="170,400 270,290 380,400" fill="#115e59"/>
  <rect x="0" y="380" width="400" height="120" fill="url(#lakeGrad)"/>
  <line x1="60" y1="410" x2="180" y2="410" stroke="#bae6fd" stroke-width="2" opacity="0.6"/>
  <line x1="220" y1="425" x2="340" y2="425" stroke="#bae6fd" stroke-width="2" opacity="0.5"/>
</svg>`;

const TEMPLATE_SVG_MINIMAL_CAT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360">
  <path d="M 150,55 C 150,40 135,25 118,25 C 98,25 85,42 85,62 C 85,95 130,125 150,140 C 170,125 215,95 215,62 C 215,42 202,25 182,25 C 165,25 150,40 150,55 Z" fill="#ef4444" transform="scale(0.55) translate(122, -10)"/>
  <g fill="none" stroke="#18181b" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 90,175 L 105,75 L 145,115 Q 150,110 155,115 L 195,75 L 210,175"/>
    <path d="M 90,175 C 65,265 80,320 120,335 C 150,340 180,340 210,335 C 245,320 245,260 210,175"/>
    <path d="M 195,310 C 260,300 270,240 245,200" stroke-width="8"/>
    <path d="M 135,338 L 135,320" stroke-width="7"/>
    <path d="M 165,338 L 165,320" stroke-width="7"/>
  </g>
</svg>`;

const TEMPLATE_SVG_WAVES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 650" width="400" height="650">
  <path d="M -20,150 Q 120,70 200,200 T 420,160 L 420,700 L -20,700 Z" fill="#fed7aa"/>
  <path d="M -20,250 Q 100,170 230,300 T 420,270 L 420,700 L -20,700 Z" fill="#fbcfe8"/>
  <path d="M -20,370 Q 140,290 250,420 T 420,380 L 420,700 L -20,700 Z" fill="#ddd6fe"/>
  <path d="M -20,490 Q 120,420 240,530 T 420,490 L 420,700 L -20,700 Z" fill="#bae6fd"/>
</svg>`;

const TEMPLATE_SVG_DINO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 400" width="360" height="400">
  <polygon points="105,150 75,170 105,190" fill="#facc15"/>
  <polygon points="105,200 75,220 105,240" fill="#facc15"/>
  <polygon points="108,250 80,270 110,290" fill="#facc15"/>
  <rect x="105" y="110" width="165" height="210" rx="65" fill="#86efac" stroke="#4ade80" stroke-width="5"/>
  <ellipse cx="185" cy="245" rx="55" ry="65" fill="#bbf7d0"/>
  <circle cx="155" cy="170" r="11" fill="#064e3b"/>
  <circle cx="215" cy="170" r="11" fill="#064e3b"/>
  <circle cx="152" cy="166" r="3.5" fill="#ffffff"/>
  <circle cx="212" cy="166" r="3.5" fill="#ffffff"/>
  <ellipse cx="140" cy="190" rx="10" ry="6" fill="#f472b6" opacity="0.8"/>
  <ellipse cx="230" cy="190" rx="10" ry="6" fill="#f472b6" opacity="0.8"/>
  <path d="M 175,195 Q 185,206 195,195" fill="none" stroke="#064e3b" stroke-width="3" stroke-linecap="round"/>
  <g transform="translate(130, 345)">
    <circle cx="0" cy="-8" r="5" fill="#ffffff"/>
    <circle cx="7" cy="-3" r="5" fill="#ffffff"/>
    <circle cx="5" cy="6" r="5" fill="#ffffff"/>
    <circle cx="-5" cy="6" r="5" fill="#ffffff"/>
    <circle cx="-7" cy="-3" r="5" fill="#ffffff"/>
    <circle cx="0" cy="0" r="4" fill="#facc15"/>
  </g>
  <g transform="translate(235, 345)">
    <circle cx="0" cy="-8" r="5" fill="#ffffff"/>
    <circle cx="7" cy="-3" r="5" fill="#ffffff"/>
    <circle cx="5" cy="6" r="5" fill="#ffffff"/>
    <circle cx="-5" cy="6" r="5" fill="#ffffff"/>
    <circle cx="-7" cy="-3" r="5" fill="#ffffff"/>
    <circle cx="0" cy="0" r="4" fill="#facc15"/>
  </g>
</svg>`;

const TEMPLATE_SVG_MOON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 400" width="360" height="400">
  <defs>
    <filter id="moonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <path d="M 270,70 A 50,50 0 1 0 240,165 A 40,40 0 0 1 270,70 Z" fill="#fde047" filter="url(#moonGlow)"/>
  <path d="M 80,90 Q 90,90 90,80 Q 90,90 100,90 Q 90,90 90,100 Q 90,90 80,90 Z" fill="#ffffff"/>
  <path d="M 160,60 Q 166,60 166,54 Q 166,60 172,60 Q 166,60 166,66 Q 166,60 160,60 Z" fill="#fef08a"/>
  <path d="M 130,160 Q 138,160 138,152 Q 138,160 146,160 Q 138,160 138,168 Q 138,160 130,160 Z" fill="#ffffff"/>
  <g fill="#ffffff" opacity="0.85">
    <circle cx="180" cy="300" r="75"/>
    <circle cx="120" cy="315" r="55"/>
    <circle cx="240" cy="315" r="55"/>
    <rect x="75" y="315" width="210" height="50" rx="20"/>
  </g>
</svg>`;

export interface TemplateReview {
  id: string;
  userName: string;
  userAvatar?: string;
  rating?: number;
  date: string;
  deviceModel: string;
  comment: string;
  isVerifiedBuyer?: boolean;
  tag?: string;
}

export interface TemplateCard {
  id: string;
  name: string;
  creator: string;
  category: string;
  categories: string[];
  styleLabel: string;
  gradient: string;
  bgImage?: string;
  elementImage?: string;
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
  artType: string;
}

export const TEMPLATE_CATALOG: TemplateCard[] = [
  // 1. Phôi Trắng Tiêu Chuẩn (Mẫu đầu tiên - Tự thiết kế từ đầu theo yêu cầu)
  {
    id: 'tpl-blank',
    name: 'Ốp Lưng Trắng Tiêu Chuẩn',
    creator: 'CasEYE Studio',
    category: 'minimalist',
    categories: ['all', 'minimalist', 'cute', 'floral', 'nature', 'cartoon', 'typography', 'abstract'],
    styleLabel: 'Tự vẽ từ đầu',
    gradient: '#FFFFFF',
    tagText: '+ TỰ THIẾT KẾ',
    description: 'Bắt đầu từ phôi ốp trắng trơn. Tự do tải ảnh, gõ chữ và ghép sticker theo chất riêng của bạn.',
    detailedDescription:
      'Phôi ốp trắng tinh khôi chuẩn bị sẵn sàng cho sự sáng tạo không giới hạn của bạn. Bạn có thể tự do tải lên hình ảnh cá nhân, gõ chữ nghệ thuật với hàng trăm phông chữ và chèn những bộ sticker Y2K/Cute độc quyền theo phong cách riêng.',
    tagLabel: '#tự_thiết_kế',
    tagColor: '#433075',
    rating: 5.0,
    reviews: '2.4k',
    reviewCount: 2400,
    hashtags: ['#tự_thiết_kế', '#tự_vẽ', '#phôi_trắng', '#diy', '#custom', '#minimal'],
    isTrending: false,
    isBlankCanvas: true,
    artType: 'blank',
  },
  // 2. The Creators • Đội Ngũ CasEYE (#creators)
  {
    id: 'tpl-creators-real',
    name: 'The Creators • Đội Ngũ CasEYE',
    creator: 'CasEYE Team',
    category: 'typography',
    categories: ['typography', 'cute', 'all'],
    styleLabel: 'Đội ngũ CasEYE',
    gradient: 'linear-gradient(180deg, #faf5ff 0%, #f3e8ff 45%, #e0e7ff 100%)',
    elementImage: '/assets/templates/the-creators-real.webp',
    tagText: 'WE ARE THE CREATORS',
    description: 'Bản thiết kế chân dung độc quyền tôn vinh tinh thần sáng tạo từ đội ngũ CasEYE.',
    detailedDescription:
      'Tác phẩm "We Are The Creators" phiên bản đời thật tôn vinh tinh thần sáng tạo không giới hạn của các bạn trẻ tài năng. Tone màu tím mộng mơ kết hợp sắc nét với chân dung các thành viên CasEYE, in nhiệt UV siêu bền màu.',
    tagLabel: '#creators',
    tagColor: '#7c3aed',
    rating: 5.0,
    reviews: '2.8k',
    reviewCount: 2800,
    hashtags: ['#thecreators', '#caseye', '#teamwork', '#creators', '#youth', '#purplevibe'],
    isTrending: true,
    artType: 'the-creators-real',
  },
  // 3. The Creators • Chibi Squad (#chibi)
  {
    id: 'tpl-creators-chibi',
    name: 'The Creators • Chibi Squad',
    creator: 'CasEYE Team',
    category: 'cute',
    categories: ['cute', 'cartoon', 'all'],
    styleLabel: 'Chibi đáng yêu',
    gradient: 'linear-gradient(180deg, #fdf4ff 0%, #fae8ff 50%, #ede9fe 100%)',
    elementImage: '/assets/templates/the-creators-chibi.webp',
    tagText: 'CHIBI CREATORS',
    description: 'Phiên bản hoạt hình Chibi siêu đáng yêu của 5 thành viên Thắm, Đức, Nhật, Mai Anh, Thy.',
    detailedDescription:
      'Phiên bản hoạt hình Chibi siêu đáng yêu của 5 thành viên sáng lập CasEYE: Thắm, Đức, Nhật, Mai Anh, Thy. Phong cách chibi ngộ nghĩnh, tươi vui, lan tỏa năng lượng tích cực và sự gắn kết cho chiếc ốp lưng của bạn.',
    tagLabel: '#chibi',
    tagColor: '#ec4899',
    rating: 5.0,
    reviews: '3.1k',
    reviewCount: 3100,
    hashtags: ['#chibi', '#creators', '#cute', '#friends', '#squad', '#caseye'],
    isTrending: true,
    artType: 'the-creators-chibi',
  },
  // 4. Fluffy Cloud Kittens (#pastel, #cute, #mèo_con)
  {
    id: 'tpl-cloud-kittens',
    name: 'Fluffy Cloud Kittens',
    creator: 'PastelStudio',
    category: 'cute',
    categories: ['cute', 'pastel', 'cat', 'all'],
    styleLabel: 'Pastel mộng mơ',
    gradient: 'linear-gradient(180deg, #e0e7ff 0%, #c4b5fd 40%, #fce7f3 100%)',
    bgImage: '/assets/templates/background/tpl-cloud-kittens-bg.webp',
    elementImage: '/assets/templates/elements/tpl-cloud-kittens-element.png',
    tagText: 'DREAMY KITTENS',
    description: 'Mây hồng pastel bồng bềnh cùng hai chú mèo con đáng yêu ôm nhau ngủ say.',
    detailedDescription:
      'Thiết kế Fluffy Cloud Kittens mang đến bầu không khí mộng mơ với những đám mây pastel bồng bềnh và đôi mèo con ngọt ngào. Layer nền gradient êm dịu kết hợp sticker mèo die-cut tách nền sắc nét 300 DPI.',
    tagLabel: '#pastel',
    tagColor: '#a855f7',
    rating: 5.0,
    reviews: '1.8k',
    reviewCount: 1840,
    hashtags: ['#pastel', '#cute', '#mèo_con', '#dreamy', '#catlover', '#aesthetic'],
    isTrending: true,
    artType: 'cloud-kittens',
  },
  // 5. Matcha Boba Corgi (#cute, #genz)
  {
    id: 'tpl-matcha-corgi',
    name: 'Matcha Boba Corgi',
    creator: 'BobaCafe',
    category: 'cute',
    categories: ['cute', 'genz', 'pastel', 'all'],
    styleLabel: 'Foodie dễ thương',
    gradient: 'linear-gradient(180deg, #dcfce7 0%, #f0fdf4 50%, #fefce8 100%)',
    bgImage: '/assets/templates/background/tpl-matcha-corgi-bg.webp',
    elementImage: '/assets/templates/elements/tpl-matcha-corgi-element.png',
    tagText: 'MATCHA CORGI',
    description: 'Chú chó Corgi mỉm cười ngồi trong ly trà sữa matcha trân châu thơm ngon.',
    detailedDescription:
      'Họa tiết bé Corgi ngồi trong ly trà sữa matcha trân châu béo ngậy mang đậm năng lượng vui tươi của giới trẻ Gen-Z. Nền xanh bơ pastel dịu mắt kết hợp sticker Corgi tách nền sống động.',
    tagLabel: '#cute',
    tagColor: '#16a34a',
    rating: 4.9,
    reviews: '1.4k',
    reviewCount: 1420,
    hashtags: ['#cute', '#genz', '#corgi', '#foodie', '#matcha', '#pastel'],
    isTrending: true,
    artType: 'matcha-corgi',
  },
  // 6. Baby Dino Picnic (#cute, #hoạt_hình)
  {
    id: 'tpl-baby-dino',
    name: 'Baby Dino Picnic',
    creator: 'ChibiStudio',
    category: 'cute',
    categories: ['cute', 'cartoon', 'chibi', 'all'],
    styleLabel: 'Dã ngoại vui vẻ',
    gradient: 'linear-gradient(180deg, #fefce8 0%, #ecfdf5 60%, #d1fae5 100%)',
    bgImage: '/assets/templates/background/tpl-baby-dino-bg.webp',
    elementImage: '/assets/templates/elements/tpl-baby-dino-element.png',
    tagText: 'BABY DINO',
    description: 'Khủng long con xanh mint đội nón vàng dã ngoại picnic giữa vườn hoa.',
    detailedDescription:
      'Bé khủng long xanh mint đáng yêu đội mũ bucket vàng rực rỡ ngồi trên thảm picnic hoa cúc. Phong cách hoạt hình ngọt ngào, tinh nghịch tạo điểm nhấn tươi vui cho chiếc điện thoại của bạn.',
    tagLabel: '#hoạt_hình',
    tagColor: '#84cc16',
    rating: 4.9,
    reviews: '980',
    reviewCount: 980,
    hashtags: ['#cute', '#hoạt_hình', '#chibi', '#dino', '#picnic'],
    isTrending: true,
    artType: 'baby-dino',
  },
  // 7. Cyber Chrome Heart (#y2k, #cyberpunk)
  {
    id: 'tpl-y2k-chrome-heart',
    name: 'Cyber Chrome Heart',
    creator: 'CyberLab',
    category: 'abstract',
    categories: ['abstract', 'streetwear', 'y2k', 'cyberpunk', 'all'],
    styleLabel: 'Y2K Cyberpunk',
    gradient: 'linear-gradient(180deg, #1e1435 0%, #0f0a1c 60%, #1e1b4b 100%)',
    bgImage: '/assets/templates/background/tpl-y2k-chrome-heart-bg.webp',
    elementImage: '/assets/templates/elements/tpl-y2k-chrome-heart-element.png',
    tagText: 'CHROME HEART',
    description: 'Trái tim chrome 3D kim loại lỏng thủy ngân với đôi cánh gai nhọn cyberpunk.',
    detailedDescription:
      'Thiết kế trái tim chrome kim loại lỏng bóng bẩy phản chiếu ánh hologram ngũ sắc trên nền vũ trụ tím huyền ảo. Tuyên ngôn thời trang Y2K tương lai cực chất dành cho tín đồ streetwear.',
    tagLabel: '#y2k',
    tagColor: '#ec4899',
    rating: 5.0,
    reviews: '2.1k',
    reviewCount: 2150,
    hashtags: ['#y2k', '#cyberpunk', '#aesthetic', '#chrome', '#streetwear', '#heart'],
    isTrending: true,
    artType: 'y2k-chrome-heart',
  },
  // 8. Holographic Cosmic Butterfly (#y2k, #aesthetic)
  {
    id: 'tpl-holo-butterfly',
    name: 'Holographic Cosmic Butterfly',
    creator: 'PrismStudio',
    category: 'abstract',
    categories: ['abstract', 'y2k', 'aesthetic', 'all'],
    styleLabel: 'Bướm Hologram',
    gradient: 'linear-gradient(180deg, #2a1d4d 0%, #433075 50%, #312e81 100%)',
    bgImage: '/assets/templates/background/tpl-holo-butterfly-bg.webp',
    elementImage: '/assets/templates/elements/tpl-holo-butterfly-element.png',
    tagText: 'HOLO BUTTERFLY',
    description: 'Cánh bướm pha lê hologram ngũ sắc tỏa ánh sáng tím lơ kiêu kỳ.',
    detailedDescription:
      'Cánh bướm thủy tinh pha lê lấp lánh với hiệu ứng khúc xạ ánh sáng cầu vồng holographic rực rỡ trên tone tím thương hiệu CasEYE. Vẻ đẹp kiêu sa, quyến rũ và đầy tính nghệ thuật thị giác.',
    tagLabel: '#aesthetic',
    tagColor: '#8b5cf6',
    rating: 4.9,
    reviews: '1.6k',
    reviewCount: 1620,
    hashtags: ['#y2k', '#aesthetic', '#hologram', '#purple', '#butterfly'],
    isTrending: true,
    artType: 'holo-butterfly',
  },
  // 9. Retro Arcade 1998 (#retro, #vintage)
  {
    id: 'tpl-retro-arcade',
    name: 'Retro Arcade 1998',
    creator: 'PixelZone',
    category: 'cartoon',
    categories: ['cartoon', 'retro', 'vintage', 'genz', 'all'],
    styleLabel: 'Synthwave 90s',
    gradient: 'linear-gradient(180deg, #181028 0%, #2e1065 60%, #4c1d95 100%)',
    bgImage: '/assets/templates/background/tpl-retro-arcade-bg.webp',
    elementImage: '/assets/templates/elements/tpl-retro-arcade-element.png',
    tagText: 'GAME OVER 1998',
    description: 'Máy chơi game cầm tay 8-bit hoài niệm thập niên 90 và lưới chân trời synthwave.',
    detailedDescription:
      'Hồi tưởng ký ức tuổi thơ với máy chơi game retro 8-bit trong suốt, băng game pixel và dòng chữ "GAME OVER" phong cách arcade Nhật Bản trên nền lưới synthwave ánh tím neon bắt mắt.',
    tagLabel: '#retro',
    tagColor: '#06b6d4',
    rating: 4.8,
    reviews: '890',
    reviewCount: 890,
    hashtags: ['#retro', '#pixel', '#hoạt_hình', '#vintage', '#arcade', '#genz'],
    isTrending: false,
    artType: 'retro-arcade',
  },
  // 10. Tokyo Night Sakura (#hoa_lá, #phong_cảnh)
  {
    id: 'tpl-tokyo-sakura',
    name: 'Tokyo Night Sakura',
    creator: 'TokyoVibe',
    category: 'floral',
    categories: ['floral', 'nature', 'aesthetic', 'all'],
    styleLabel: 'Hoa anh đào đêm',
    gradient: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    bgImage: '/assets/templates/background/tpl-tokyo-sakura-bg.webp',
    elementImage: '/assets/templates/elements/tpl-tokyo-sakura-element.png',
    tagText: 'TOKYO SAKURA',
    description: 'Cành hoa anh đào Nhật Bản nở rộ thanh nhã dưới ánh trăng bạc đêm Tokyo.',
    detailedDescription:
      'Những nhánh hoa anh đào cánh hồng phấn bừng nở kiêu hãnh dưới ánh trăng khuyết lãng mạn. Nền đêm lam tím mộng ảo tạo chiều sâu thanh tao, thoát tục cho chiếc ốp lưng của bạn.',
    tagLabel: '#hoa_lá',
    tagColor: '#ec4899',
    rating: 5.0,
    reviews: '2.3k',
    reviewCount: 2300,
    hashtags: ['#hoa_lá', '#phong_cảnh', '#japan', '#sakura', '#aesthetic', '#night'],
    isTrending: true,
    artType: 'tokyo-sakura',
  },
  // 11. Fuji Lavender Sunset (#phong_cảnh, #tối_giản)
  {
    id: 'tpl-fuji-sunset',
    name: 'Fuji Lavender Sunset',
    creator: 'AlpineLab',
    category: 'nature',
    categories: ['nature', 'minimalist', 'all'],
    styleLabel: 'Hoàng hôn Phú Sĩ',
    gradient: 'linear-gradient(180deg, #e9d5ff 0%, #fed7aa 60%, #fef08a 100%)',
    bgImage: '/assets/templates/background/tpl-fuji-sunset-bg.webp',
    elementImage: '/assets/templates/elements/tpl-fuji-sunset-element.png',
    tagText: 'MOUNT FUJI',
    description: 'Đỉnh núi Phú Sĩ tuyết trắng cùng mặt trời đỏ rực giữa hoàng hôn tím vàng êm đềm.',
    detailedDescription:
      'Phong cảnh núi Phú Sĩ biểu tượng với đỉnh tuyết trắng ngần in bóng lên nền trời hoàng hôn chuyển sắc oải hương và hổ phách. Nét vẽ tối giản tranh khắc gỗ Nhật Bản mang lại sự an yên, tĩnh tại.',
    tagLabel: '#phong_cảnh',
    tagColor: '#f97316',
    rating: 4.9,
    reviews: '1.5k',
    reviewCount: 1540,
    hashtags: ['#phong_cảnh', '#nature', '#japan', '#tối_giản', '#sunset', '#fuji'],
    isTrending: true,
    artType: 'fuji-sunset',
  },
  // 12. Wild Botanical Garden (#hoa_lá, #vintage)
  {
    id: 'tpl-botanical-garden',
    name: 'Wild Botanical Garden',
    creator: 'AtelierParis',
    category: 'floral',
    categories: ['floral', 'vintage', 'minimalist', 'all'],
    styleLabel: 'Vườn hoa Vintage',
    gradient: 'linear-gradient(180deg, #fdfbf7 0%, #fefce8 60%, #f5f5f4 100%)',
    bgImage: '/assets/templates/background/tpl-botanical-garden-bg.webp',
    elementImage: '/assets/templates/elements/tpl-botanical-garden-element.png',
    tagText: 'HERBARIUM',
    description: 'Cành hoa oải hương và lá bạch đàn vintage ép thủ công trên giấy mỹ thuật Pháp.',
    detailedDescription:
      'Họa tiết hoa cỏ dại pressed flower tinh tế phong cách bảo tàng thực vật Paris. Đường nét mạ vàng thanh lịch trên nền giấy mỹ thuật kem ngà cổ điển, toát lên phong thái tao nhã và quý phái.',
    tagLabel: '#vintage',
    tagColor: '#84cc16',
    rating: 4.8,
    reviews: '810',
    reviewCount: 810,
    hashtags: ['#hoa_lá', '#vintage', '#tối_giản', '#cottagecore', '#lavender'],
    isTrending: false,
    artType: 'botanical-garden',
  },
  // 13. Manifesting Good Vibes (#typography, #genz)
  {
    id: 'tpl-good-vibes',
    name: 'Manifesting Good Vibes',
    creator: 'VogueTypography',
    category: 'typography',
    categories: ['typography', 'genz', 'streetwear', 'all'],
    styleLabel: 'Typography 70s',
    gradient: 'linear-gradient(180deg, #f3e8ff 0%, #fef08a 60%, #fce7f3 100%)',
    bgImage: '/assets/templates/background/tpl-good-vibes-bg.webp',
    elementImage: '/assets/templates/elements/tpl-good-vibes-element.png',
    tagText: 'GOOD VIBES',
    description: 'Dòng chữ uốn lượn retro 70s lan tỏa năng lượng tích cực và hoa mặt cười.',
    detailedDescription:
      'Thông điệp "Manifesting Good Vibes" thiết kế phông chữ puffy 3D retro thập niên 70 rực rỡ, điểm xuyết hoa mặt cười và ngôi sao lấp lánh. Sự lựa chọn hoàn hảo tiếp thêm năng lượng tươi vui mỗi ngày.',
    tagLabel: '#typography',
    tagColor: '#d946ef',
    rating: 4.9,
    reviews: '1.3k',
    reviewCount: 1350,
    hashtags: ['#typography', '#genz', '#streetwear', '#aesthetic', '#positive'],
    isTrending: true,
    artType: 'good-vibes',
  },
  // 14. Create Your Own Luck (#streetwear, #typography)
  {
    id: 'tpl-lucky-clover',
    name: 'Create Your Own Luck',
    creator: 'TechKicks',
    category: 'typography',
    categories: ['typography', 'streetwear', 'y2k', 'all'],
    styleLabel: 'Techwear Street',
    gradient: 'linear-gradient(180deg, #09090b 0%, #18181b 60%, #27272a 100%)',
    bgImage: '/assets/templates/background/tpl-lucky-clover-bg.webp',
    elementImage: '/assets/templates/elements/tpl-lucky-clover-element.png',
    tagText: 'LUCKY 2026',
    description: 'Cỏ bốn lá kim loại chrome 3D kết hợp chữ typography thời thượng trên nền đen nhám.',
    detailedDescription:
      'Huy hiệu cỏ bốn lá chrome 3D siêu bóng bẩy mang biểu tượng may mắn, kết hợp mã tọa độ công nghệ và chữ STREETWEAR sắc lạnh trên nền đen mờ sang trọng. Đậm chất cá tính cho giới trẻ hiện đại.',
    tagLabel: '#streetwear',
    tagColor: '#10b981',
    rating: 5.0,
    reviews: '1.9k',
    reviewCount: 1940,
    hashtags: ['#typography', '#streetwear', '#lucky', '#y2k', '#clover'],
    isTrending: true,
    artType: 'lucky-clover',
  },
  // 15. Liquid Amethyst Waves (#abstract, #nghệ_thuật)
  {
    id: 'tpl-amethyst-waves',
    name: 'Liquid Amethyst Waves',
    creator: 'ChromaFlow',
    category: 'abstract',
    categories: ['abstract', 'aesthetic', 'all'],
    styleLabel: 'Cẩm thạch thạch anh',
    gradient: 'linear-gradient(180deg, #3b0764 0%, #6b21a8 50%, #a855f7 100%)',
    bgImage: '/assets/templates/background/tpl-amethyst-waves-bg.webp',
    elementImage: '/assets/templates/elements/tpl-amethyst-waves-element.png',
    tagText: 'LIQUID MARBLE',
    description: 'Dải lụa cẩm thạch thạch anh tím lượn sóng cuộn trào cùng nhũ vàng óng ánh.',
    detailedDescription:
      'Những dải sóng chất lỏng cẩm thạch tím thạch anh uốn lượn mềm mại hòa cùng các đường vân vàng kim loại bắt sáng. Nghệ thuật trừu tượng cao cấp biến chiếc ốp lưng thành một tác phẩm nghệ thuật.',
    tagLabel: '#abstract',
    tagColor: '#9333ea',
    rating: 4.8,
    reviews: '760',
    reviewCount: 760,
    hashtags: ['#abstract', '#nghệ_thuật', '#purple', '#aesthetic', '#liquid', '#marble'],
    isTrending: false,
    artType: 'amethyst-waves',
  },
  // 16. Aura Gradient Energy (#genz, #aesthetic)
  {
    id: 'tpl-aura-gradient',
    name: 'Aura Gradient Energy',
    creator: 'AuraMind',
    category: 'abstract',
    categories: ['abstract', 'pastel', 'genz', 'aesthetic', 'all'],
    styleLabel: 'Hào quang tâm linh',
    gradient: 'linear-gradient(180deg, #ede9fe 0%, #fef08a 50%, #e0f2fe 100%)',
    bgImage: '/assets/templates/background/tpl-aura-gradient-bg.webp',
    elementImage: '/assets/templates/elements/tpl-aura-gradient-element.png',
    tagText: 'PROTECT PEACE',
    description: 'Quầng hào quang năng lượng bình an chuyển sắc pastel và thông điệp chữa lành.',
    detailedDescription:
      'Hào quang năng lượng tâm linh aura mờ ảo hòa quyện sắc tím lilac, vàng nhạt và xanh thiên thanh, mang thông điệp "PROTECT YOUR PEACE". Xu hướng thịnh hành Pinterest giúp xua tan âu lo và nạp đầy năng lượng tích cực.',
    tagLabel: '#genz',
    tagColor: '#0ea5e9',
    rating: 4.9,
    reviews: '1.2k',
    reviewCount: 1220,
    hashtags: ['#aesthetic', '#abstract', '#pastel', '#genz', '#aura', '#peace'],
    isTrending: true,
    artType: 'aura-gradient',
  },
];

const INITIAL_REVIEWS: Record<string, TemplateReview[]> = {};

@Component({
  selector: 'app-template-browser',
  standalone: true,
  imports: [],
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
  private readonly authModal = inject(AuthModal);
  private readonly route = inject(ActivatedRoute);
  /** Site-wide search: "Gợi ý theo mô tả" button next to the title. */
  private readonly search = inject(SearchService);
  /** Idea typed in search ("Tự thiết kế với ý tưởng này", ?y=…). */
  protected readonly idea = signal('');

  // Authentication & Designs State
  protected readonly isLoggedIn = this.auth.isAuthenticated;
  protected readonly myDesigns = this.state.savedDesigns;

  /** Display name of current user */
  protected readonly userDisplayName = computed(() => {
    const user = this.auth.user();
    if (!user) return 'Khách hàng';
    return (
      user.user_metadata?.['full_name'] ||
      user.user_metadata?.['name'] ||
      user.email?.split('@')[0] ||
      'Bạn'
    );
  });

  /** Open the global Auth Modal */
  protected openLoginModal(): void {
    this.authModal.open('login');
  }

  /** First 4 designs displayed on the main page */
  protected readonly displayedMyDesigns = computed(() => this.myDesigns().slice(0, 4));

  /** Whether designs count exceeds 4 (triggers "Xem tất cả →" button) */
  protected readonly hasMoreMyDesigns = computed(() => this.myDesigns().length > 4);

  // Modal & Popup States
  protected readonly showModelSelectorModal = signal<boolean>(false);
  protected readonly modalSelectedBrandId = signal<string>('brand-apple');
  protected readonly modalSelectedModelId = signal<string>('iphone-15-pro-max');

  protected readonly brands = this.catalog.brands;
  protected readonly allModels = this.catalog.models;

  protected readonly modalAvailableModels = computed(() => {
    const brandId = this.modalSelectedBrandId();
    return this.allModels().filter((m) => m.brandId === brandId && m.isActive);
  });

  protected readonly showAllDesignsModal = signal<boolean>(false);
  protected readonly searchMyDesignQuery = signal<string>('');
  protected readonly previewTemplate = signal<TemplateCard | null>(null);
  protected readonly activeMenuDesignId = signal<string | null>(null);

  // Delete & Rename Modals
  protected readonly designToDelete = signal<SavedDesignItem | null>(null);
  protected readonly designToRename = signal<SavedDesignItem | null>(null);
  protected readonly renameInput = signal<string>('');

  /** Computes whether ANY modal is currently open to freeze body scrolling */
  protected readonly isAnyModalOpen = computed(() => {
    return (
      this.showModelSelectorModal() ||
      this.showAllDesignsModal() ||
      this.previewTemplate() !== null ||
      this.designToDelete() !== null ||
      this.designToRename() !== null
    );
  });

  // 3D View Controls
  protected readonly viewMode = signal<'3d' | '2d'>('3d');
  protected readonly isAutoRotate = signal<boolean>(false);

  // Reviews State (Khử sạch NPC comments, chỉ hiển thị review thực từ khách hàng)
  protected readonly reviewsMap = signal<Record<string, TemplateReview[]>>(INITIAL_REVIEWS);
  protected readonly currentTemplateReviews = computed(() => {
    const tpl = this.previewTemplate();
    if (!tpl) return [];
    return this.reviewsMap()[tpl.id] || [];
  });

  // User Interactive Review Submission State
  protected readonly userRating = signal<number>(5);
  protected readonly userReviewText = signal<string>('');
  protected readonly reviewSubmittedSuccess = signal<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined') {
      import('@google/model-viewer').catch((err) => {
        console.warn('Google Model Viewer dynamic import warning:', err);
      });
    }

    this.preloadTemplateArtworks();

    // Links from the site-wide search: ?template=ID opens that template, ?y=… shows the idea banner.
    const params = this.route.snapshot.queryParamMap;
    this.idea.set((params.get('y') ?? '').trim().slice(0, 200));
    const fromSearch = TEMPLATE_CATALOG.find((t) => t.id === params.get('template'));
    if (fromSearch) {
      setTimeout(() => this.openDetailModal(fromSearch));
    } else {
      // Tự động mở modal chọn dòng máy khi mới vào chưa có model lưu hoặc có query param ?selectModel=true
      const hasSavedModel =
        typeof localStorage !== 'undefined'
          ? !!localStorage.getItem('caseyes_active_model')
          : false;
      const shouldPromptModel =
        params.get('selectModel') === 'true' || !hasSavedModel;

      if (shouldPromptModel) {
        setTimeout(() => this.openModelSelectorModal(), 150);
      }
    }

    // Freeze body scroll when ANY modal is open
    effect(() => {
      if (typeof document === 'undefined') return;
      if (this.isAnyModalOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  // Model Selector Modal Handlers
  protected openModelSelectorModal(): void {
    this.modalSelectedBrandId.set(this.state.selectedModel().brandId || 'brand-apple');
    this.modalSelectedModelId.set(this.state.selectedModel().id || 'iphone-15-pro-max');
    this.showModelSelectorModal.set(true);
  }

  protected closeModelSelectorModal(): void {
    this.showModelSelectorModal.set(false);
    if (this.route.snapshot.queryParamMap.has('selectModel')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { selectModel: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  protected selectModalBrand(brandId: string): void {
    this.modalSelectedBrandId.set(brandId);
    const models = this.allModels().filter((m) => m.brandId === brandId && m.isActive);
    if (models.length > 0) {
      this.modalSelectedModelId.set(models[0].id);
    }
  }

  protected selectModalModel(modelId: string): void {
    this.modalSelectedModelId.set(modelId);
  }

  protected applySelectedModel(): void {
    const modelId = this.modalSelectedModelId();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('caseyes_active_model', modelId);
    }
    this.catalog.selectModel(modelId);
    this.state.requestModelChange(modelId);
    this.closeModelSelectorModal();
  }

  private loadInitialFavorites(): Set<string> {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('caseyes_favorite_templates');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) return new Set(arr);
        }
      } catch {}
    }
    return new Set();
  }

  // Favorites Set & Count (Module 4: Synchronized with localStorage, starting cleanly at 0)
  protected readonly favoriteTemplates = signal<Set<string>>(this.loadInitialFavorites());
  protected readonly favoriteCount = computed(() => this.favoriteTemplates().size);

  // Filter & Search Signals
  protected readonly selectedCategories = signal<string[]>(['all']);
  protected readonly isCategoriesExpanded = signal<boolean>(false);
  protected readonly activeHashtagFilter = signal<string | null>(null);

  protected readonly hasActiveFilters = computed(() => {
    const cats = this.selectedCategories();
    const hasCat = !cats.includes('all') && cats.length > 0;
    const hasTag = !!this.activeHashtagFilter();
    return hasCat || hasTag;
  });

  protected clearAllFilters(): void {
    this.selectedCategories.set(['all']);
    this.activeHashtagFilter.set(null);
  }

  // Categories matching the image tabs (Định dạng Hashtag #, đồng bộ 100% tất cả hashtag trong từng mẫu)
  protected readonly categories = this.generateSynchronizedCategories();

  private generateSynchronizedCategories(): { id: string; name: string }[] {
    const list: { id: string; name: string }[] = [
      { id: 'all', name: 'Tất cả' },
      { id: 'favorites', name: 'Đã thích ❤️' },
    ];

    // Danh sách ưu tiên các hashtag hot/nổi bật để xếp ở hàng đầu tiên
    const priorityTags = [
      '#Creators', '#Chibi', '#Hoa_lá', '#Cute', '#Pastel', '#Tối_giản',
      '#Phong_cảnh', '#Hoạt_hình', '#Typography', '#Abstract', '#Aesthetic',
      '#Mèo_con', '#Y2K', '#Retro', '#Streetwear', '#Vintage', '#Cyberpunk',
      '#GenZ', '#TheCreators', '#Tự_thiết_kế', '#Phôi_trắng', '#Tự_vẽ',
      '#Japan', '#Sakura', '#Sunset', '#Nature', '#Hologram', '#Butterfly',
      '#Pixel', '#Arcade', '#Positive', '#Lucky', '#Clover', '#Nghệ_thuật',
      '#Liquid', '#Marble', '#Aura', '#Peace', '#Diy', '#Custom', '#Minimal',
      '#PurpleVibe', '#Friends', '#Squad', '#Corgi', '#Foodie', '#Matcha',
      '#Dino', '#Picnic', '#Chrome', '#Heart', '#Cottagecore', '#Lavender',
      '#Dreamy', '#CatLover', '#Night', '#Fuji'
    ];

    const seen = new Set<string>();

    // Thu thập tất cả hashtag có mặt trong kho mẫu TEMPLATE_CATALOG
    const allCatalogHashtags = new Set<string>();
    for (const tpl of TEMPLATE_CATALOG) {
      if (tpl.hashtags) {
        tpl.hashtags.forEach((h) => allCatalogHashtags.add(h.toLowerCase().trim()));
      }
      if (tpl.tagLabel) {
        allCatalogHashtags.add(tpl.tagLabel.toLowerCase().trim());
      }
    }

    // Thêm các tag ưu tiên nếu có trong kho mẫu
    for (const p of priorityTags) {
      const lower = p.toLowerCase().trim();
      const id = lower.replace(/^#/, '');
      if (allCatalogHashtags.has(lower) && !seen.has(id)) {
        seen.add(id);
        list.push({ id, name: p });
      }
    }

    // Tự động quét và bổ sung MỌI hashtag còn lại từ từng mẫu đảm bảo không bao giờ sót bất kỳ tag nào
    for (const tpl of TEMPLATE_CATALOG) {
      if (tpl.hashtags) {
        for (const h of tpl.hashtags) {
          const lower = h.toLowerCase().trim();
          const id = lower.replace(/^#/, '');
          if (!seen.has(id)) {
            seen.add(id);
            const formatted = h.startsWith('#') ? h : '#' + h;
            const displayName = formatted.length > 2
              ? '#' + formatted.charAt(1).toUpperCase() + formatted.slice(2)
              : formatted;
            list.push({ id, name: displayName });
          }
        }
      }
    }

    return list;
  }

  protected readonly templates = TEMPLATE_CATALOG;

  /** Filtered templates based on category (multi-select), hashtag and search */
  protected readonly filteredTemplates = computed(() => {
    const cats = this.selectedCategories();
    const tag = this.activeHashtagFilter();
    const favs = this.favoriteTemplates();

    return this.templates.filter((t) => {
      // 1. Check category criteria
      let matchCat = false;
      if (cats.includes('all')) {
        matchCat = true;
      } else {
        const matchFavorites = cats.includes('favorites') && favs.has(t.id);
        const matchOtherCats = cats.some((c) => {
          if (c === 'favorites') return false;
          const cleanC = c.toLowerCase().trim();
          return (
            (t.categories && t.categories.includes(c)) ||
            (t.hashtags && t.hashtags.some((h) => {
              const cleanH = h.replace(/^#/, '').toLowerCase().trim();
              return cleanH === cleanC || cleanH.includes(cleanC) || cleanC.includes(cleanH);
            })) ||
            (t.tagLabel && (
              t.tagLabel.replace(/^#/, '').toLowerCase().trim() === cleanC ||
              t.tagLabel.toLowerCase().includes(cleanC)
            )) ||
            (cleanC === 'cat' && (t.name.toLowerCase().includes('cat') || t.name.toLowerCase().includes('mèo') || t.name.toLowerCase().includes('kitten')))
          );
        });
        matchCat = matchFavorites || matchOtherCats;
      }

      // 2. Check hashtag criteria
      const matchTag = !tag || (t.hashtags && t.hashtags.some((h) => h.toLowerCase() === tag.toLowerCase())) || (t.tagLabel && t.tagLabel.toLowerCase() === tag.toLowerCase());
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

  /**
   * Bộ artwork SVG vector & Element PNG 1:1 đồng bộ tuyệt đối với Canvas Studio
   */
  protected readonly artworkMap: Record<
    string,
    { url: string; x: number; y: number; width: number; height: number; text?: string; textY?: number }
  > = {
    // 13 mẫu thiết kế trọn gói mới (Layer Element tách nền trong suốt)
    'cloud-kittens': { url: '/assets/templates/elements/tpl-cloud-kittens-element.png', x: 50, y: 65, width: 88, height: 75 },
    'matcha-corgi': { url: '/assets/templates/elements/tpl-matcha-corgi-element.png', x: 50, y: 62, width: 86, height: 80 },
    'baby-dino': { url: '/assets/templates/elements/tpl-baby-dino-element.png', x: 50, y: 64, width: 84, height: 76 },
    'y2k-chrome-heart': { url: '/assets/templates/elements/tpl-y2k-chrome-heart-element.png', x: 50, y: 56, width: 88, height: 82 },
    'holo-butterfly': { url: '/assets/templates/elements/tpl-holo-butterfly-element.png', x: 50, y: 55, width: 90, height: 85 },
    'retro-arcade': { url: '/assets/templates/elements/tpl-retro-arcade-element.png', x: 50, y: 58, width: 86, height: 80 },
    'tokyo-sakura': { url: '/assets/templates/elements/tpl-tokyo-sakura-element.png', x: 50, y: 54, width: 92, height: 88 },
    'fuji-sunset': { url: '/assets/templates/elements/tpl-fuji-sunset-element.png', x: 50, y: 58, width: 92, height: 80 },
    'botanical-garden': { url: '/assets/templates/elements/tpl-botanical-garden-element.png', x: 50, y: 55, width: 88, height: 88 },
    'good-vibes': { url: '/assets/templates/elements/tpl-good-vibes-element.png', x: 50, y: 56, width: 88, height: 78 },
    'lucky-clover': { url: '/assets/templates/elements/tpl-lucky-clover-element.png', x: 50, y: 55, width: 86, height: 82 },
    'amethyst-waves': { url: '/assets/templates/elements/tpl-amethyst-waves-element.png', x: 50, y: 55, width: 92, height: 88 },
    'aura-gradient': { url: '/assets/templates/elements/tpl-aura-gradient-element.png', x: 50, y: 55, width: 86, height: 82 },

    // The Creators
    'the-creators-real': { url: '/assets/templates/the-creators-real.webp', x: 50, y: 55, width: 92, height: 80 },
    'the-creators-chibi': { url: '/assets/templates/the-creators-chibi.webp', x: 50, y: 56, width: 92, height: 82 },

    // Backward-compatibility aliases
    'dreamy-kitten': { url: '/assets/templates/elements/tpl-cloud-kittens-element.png', x: 50, y: 65, width: 88, height: 75 },
    'sakura-bloom': { url: '/assets/templates/elements/tpl-tokyo-sakura-element.png', x: 50, y: 54, width: 92, height: 88 },
    'mountain-escape': { url: '/assets/templates/elements/tpl-fuji-sunset-element.png', x: 50, y: 58, width: 92, height: 80 },
    'minimal-cat': { url: svgToDataUri(TEMPLATE_SVG_MINIMAL_CAT), x: 50, y: 68, width: 62, height: 62 },
    'abstract-waves': { url: '/assets/templates/elements/tpl-amethyst-waves-element.png', x: 50, y: 55, width: 92, height: 88 },
    'dino-friend': { url: '/assets/templates/elements/tpl-baby-dino-element.png', x: 50, y: 64, width: 84, height: 76 },
    'starry-night': { url: svgToDataUri(TEMPLATE_SVG_MOON), x: 50, y: 48, width: 86, height: 70, text: 'STARRY', textY: 83 },
  };

  protected getArtwork(artType: string) {
    return this.artworkMap[artType] || null;
  }

  protected getSavedDesignArtwork(item: SavedDesignItem): {
    url?: string;
    x: number;
    y: number;
    width: number;
    text?: string;
    textY?: number;
  } | null {
    if (item.thumbnailType === 'dreamy-sky') return this.artworkMap['dreamy-kitten'] || null;
    if (item.thumbnailType === 'sakura') return this.artworkMap['sakura-bloom'] || null;
    if (item.thumbnailType === 'cat') return this.artworkMap['minimal-cat'] || null;
    if (item.thumbnailType === 'mountain') return this.artworkMap['mountain-escape'] || null;
    if (item.thumbnailType === 'starry') return this.artworkMap['starry-night'] || null;

    if (item.layers && item.layers.length > 0) {
      const imgLayer = item.layers.find((l) => l.type === 'image' && (l as any).storageUrl);
      const txtLayer = item.layers.find((l) => l.type === 'text');
      if (imgLayer) {
        return {
          url: (imgLayer as any).storageUrl,
          x: imgLayer.x,
          y: imgLayer.y,
          width: imgLayer.width,
          text: txtLayer ? (txtLayer as any).content : undefined,
          textY: txtLayer ? txtLayer.y : undefined,
        };
      }
      if (txtLayer) {
        return {
          x: txtLayer.x,
          y: txtLayer.y,
          width: 80,
          text: (txtLayer as any).content,
          textY: txtLayer.y,
        };
      }
    }
    return null;
  }

  // --- Category Multi-Select and Hashtag Handlers ---
  protected isCategorySelected(catId: string): boolean {
    return this.selectedCategories().includes(catId);
  }

  protected toggleCategory(catId: string): void {
    this.activeHashtagFilter.set(null);

    // Rule: "khi chọn nhiều nút thì không được chọn cái tất cả nha"
    if (catId === 'all') {
      // Selecting "Tất cả" clears all specific categories
      this.selectedCategories.set(['all']);
      return;
    }

    const current = this.selectedCategories().filter((c) => c !== 'all');
    const index = current.indexOf(catId);

    if (index >= 0) {
      current.splice(index, 1);
      // If no categories left, revert to ['all']
      if (current.length === 0) {
        this.selectedCategories.set(['all']);
      } else {
        this.selectedCategories.set([...current]);
      }
    } else {
      current.push(catId);
      this.selectedCategories.set([...current]);
    }
  }

  protected toggleExpandCategories(): void {
    this.isCategoriesExpanded.update((v) => !v);
  }

  protected filterByHashtag(tag: string): void {
    this.closePreviewModal();
    this.activeHashtagFilter.set(tag);
    this.selectedCategories.set(['all']);
    // Scroll down to template grid
    const target = document.getElementById('template-grid-section');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected clearHashtagFilter(): void {
    this.activeHashtagFilter.set(null);
  }

  // --- Favorite Toggle ---
  protected toggleFavorite(templateId: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (!this.auth.isAuthenticated()) {
      this.authModal.open('login');
      return;
    }
    this.favoriteTemplates.update((set) => {
      const next = new Set(set);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('caseyes_favorite_templates', JSON.stringify([...next]));
        } catch {}
      }
      return next;
    });
  }

  protected isFavorite(templateId: string): boolean {
    return this.favoriteTemplates().has(templateId);
  }

  protected openSuggest(): void {
    this.search.open('suggest', this.idea());
  }

  /** Idea banner: start from the blank case. */
  protected startFromIdea(): void {
    const blank = TEMPLATE_CATALOG.find((t) => t.isBlankCanvas);
    if (blank) this.openDetailModal(blank);
  }

  // --- Detail & 3D Preview Modal ---
  protected openDetailModal(template: TemplateCard, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.previewTemplate.set(template);
    const has3d = this.state.selectedModel().has3dModel && !!this.state.selectedModel().model3dUrl;
    if (has3d) {
      this.viewMode.set('3d');
    } else {
      this.viewMode.set('2d');
    }
    this.isAutoRotate.set(false);
    this.userReviewText.set('');
    this.userRating.set(5);
    this.reviewSubmittedSuccess.set(false);
    if (has3d) {
      setTimeout(() => {
        this.syncTemplate3dTexture(template);
        this.reset3dView();
      }, 150);
    }
  }

  protected closePreviewModal(): void {
    this.previewTemplate.set(null);
    this.reviewSubmittedSuccess.set(false);
  }

  protected toggleViewMode(mode: '3d' | '2d'): void {
    this.viewMode.set(mode);
    if (mode === '3d' && this.previewTemplate()) {
      setTimeout(() => {
        this.syncTemplate3dTexture(this.previewTemplate()!);
        this.reset3dView();
      }, 150);
    }
  }

  protected onModalModelViewerLoad(): void {
    if (this.previewTemplate()) {
      this.syncTemplate3dTexture(this.previewTemplate()!);
      this.reset3dView();
    }
  }

  protected reset3dView(): void {
    const mv = document.querySelector('#modalTemplateViewer, model-viewer') as any;
    if (mv) {
      mv.cameraOrbit = '0deg 85deg 105%';
      if (typeof mv.resetTurntableRotation === 'function') {
        mv.resetTurntableRotation();
      }
      if (typeof mv.jumpCameraToGoal === 'function') {
        mv.jumpCameraToGoal();
      }
    }
  }

  protected toggleAutoRotate(): void {
    this.isAutoRotate.update((v) => !v);
  }

  /**
   * Đồng bộ ốp lưng mẫu lên mô hình 3D WebGL (Chuẩn Canvas Studio)
   * Renders background, artwork, camera punch hole and bumper, then injects Three.js texture
   */
  private syncTemplate3dTexture(template: TemplateCard): void {
    if (typeof document === 'undefined') return;
    const mv = document.querySelector('#modalTemplateViewer, model-viewer') as any;
    if (!mv || !mv.model) return;

    const W = 600;
    const H = 1264;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clip to case silhouette matching 2D canvas frame radius (50px * 2)
    ctx.save();
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(0, 0, W, H, [100, 100, 100, 100]);
    } else {
      ctx.rect(0, 0, W, H);
    }
    ctx.clip();

    // 2. Draw Background Image or Gradient / Color
    if (template.bgImage) {
      let bgImg = this.templateArtImageCache.get(template.bgImage);
      if (!bgImg) {
        bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.onload = () => {
          this.templateArtImageCache.set(template.bgImage!, bgImg!);
          if (this.previewTemplate()?.id === template.id) {
            this.syncTemplate3dTexture(template);
          }
        };
        bgImg.src = template.bgImage;
      }
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, W, H);
      } else {
        ctx.fillStyle = template.gradient || '#FFFFFF';
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      const bg = template.gradient || '#FFFFFF';
      if (bg.includes('gradient')) {
        const colorMatches = bg.match(/#[a-fA-F0-9]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g);
        if (colorMatches && colorMatches.length >= 2) {
          const angleMatch = bg.match(/(\d+)deg/);
          const angle = angleMatch ? parseInt(angleMatch[1], 10) : 180;
          const rad = ((angle - 90) * Math.PI) / 180;
          const cx = W / 2;
          const cy = H / 2;
          const length = Math.sqrt(W * W + H * H) / 2;
          const x0 = cx - Math.cos(rad) * length;
          const y0 = cy - Math.sin(rad) * length;
          const x1 = cx + Math.cos(rad) * length;
          const y1 = cy + Math.sin(rad) * length;

          const linGrad = ctx.createLinearGradient(x0, y0, x1, y1);
          colorMatches.forEach((col, idx) => {
            linGrad.addColorStop(idx / (colorMatches.length - 1), col);
          });
          ctx.fillStyle = linGrad;
        } else {
          const grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, '#FAFAFA');
          grad.addColorStop(1, '#ECE6FD');
          ctx.fillStyle = grad;
        }
      } else {
        const lower = bg.toLowerCase();
        ctx.fillStyle = (lower === '#ffffff' || lower === '#fff' || lower === '#fafafa') ? '#f3f3f6' : bg;
      }
      ctx.fillRect(0, 0, W, H);
    }

    // 3. Draw Artwork on Canvas according to artType / elementImage
    this.drawTemplateArtworkToCanvas(ctx, template, W, H);

    // 4. Punch Camera Cutout cleanly matching model
    const model = this.state.selectedModel();
    const cam = model.safeZoneMask.cameraCutout;
    const camX = (cam.xPercent / 100) * W;
    const camY = (cam.yPercent / 100) * H;
    const camW = (cam.widthPercent / 100) * W;
    const camH = (cam.heightPercent / 100) * H;
    const camRadius = cam.borderRadius * 2;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    if (model.id === 'galaxy-s24') {
      const cx = camX + camW / 2;
      const r = camW * 0.42;
      ctx.arc(cx, camY + r + 4, r, 0, Math.PI * 2);
      ctx.arc(cx, camY + camH * 0.5, r, 0, Math.PI * 2);
      ctx.arc(cx, camY + camH - r - 4, r, 0, Math.PI * 2);
    } else if (model.id === 'xiaomi-14-ultra') {
      const cx = W / 2;
      const cy = camY + camH / 2;
      const r = camW / 2;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else {
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(camX, camY, camW, camH, [camRadius, camRadius, camRadius, camRadius]);
      } else {
        ctx.rect(camX, camY, camW, camH);
      }
    }
    ctx.fill();
    ctx.restore();

    // 5. Bumper Rim Stroke
    ctx.save();
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#18181b';
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(9, 9, W - 18, H - 18, [92, 92, 92, 92]);
    } else {
      ctx.rect(9, 9, W - 18, H - 18);
    }
    ctx.stroke();

    // Camera Bezel Ring
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#18181b';
    ctx.beginPath();
    if (model.id === 'galaxy-s24') {
      const cx = camX + camW / 2;
      const r = camW * 0.42;
      ctx.arc(cx, camY + r + 4, r + 2, 0, Math.PI * 2);
      ctx.arc(cx, camY + camH * 0.5, r + 2, 0, Math.PI * 2);
      ctx.arc(cx, camY + camH - r - 4, r + 2, 0, Math.PI * 2);
    } else if (model.id === 'xiaomi-14-ultra') {
      const cx = W / 2;
      const cy = camY + camH / 2;
      const r = camW / 2;
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    } else {
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(camX, camY, camW, camH, [camRadius, camRadius, camRadius, camRadius]);
      } else {
        ctx.rect(camX, camY, camW, camH);
      }
    }
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Restore case clip context

    // 5. Inject Three.js Texture & Meshes into <model-viewer>
    const sceneSymbol = Object.getOwnPropertySymbols(mv).find((s) => s.toString().includes('scene'));
    const scene = sceneSymbol ? mv[sceneSymbol] : null;

    if (scene) {
      let backMesh: any = null;
      let sampleMesh: any = null;
      let foundTex: any = null;

      scene.traverse((o: any) => {
        if (o.isMesh) {
          if (!sampleMesh && o.name !== 'CaseOverlayMesh') sampleMesh = o;
          if (o.material?.map && !foundTex) foundTex = o.material.map;
          if (
            o.name === 'wLfSXtbwRlBrwof' ||
            o.material?.name === 'oZRkkORNzkufnGD' ||
            o.material?.name === 'glass' ||
            o.name?.toLowerCase().includes('back')
          ) {
            backMesh = o;
          }
          if (o.name === 'IykfmVvLplTsTEW' || o.material?.name === 'PaletteMaterial004') {
            o.visible = false;
          }
        }
      });

      if (!backMesh && sampleMesh) backMesh = sampleMesh;

      if (backMesh && sampleMesh) {
        const MeshConstructor = sampleMesh.constructor;
        const MaterialConstructor = sampleMesh.material.constructor;
        const BufferGeometryConstructor = sampleMesh.geometry.constructor;
        const BufferAttributeConstructor = sampleMesh.geometry.attributes.position.constructor;
        const TexConstructor = foundTex?.constructor;

        if (TexConstructor) {
          const glCvs = document.createElement('canvas');
          glCvs.width = W;
          glCvs.height = H;
          const glCtx = glCvs.getContext('2d');
          if (glCtx) {
            glCtx.translate(W, H);
            glCtx.scale(-1, -1);
            glCtx.drawImage(canvas, 0, 0);

            const tex = new TexConstructor(glCvs);
            if ('colorSpace' in tex) tex.colorSpace = 'srgb';
            if ('encoding' in tex) (tex as any).encoding = 3001;
            tex.needsUpdate = true;

            const hw = 3.90;
            const hh = 8.00;
            const z = 0.425;

            const positions = new Float32Array([
              -hw, -hh, z,
               hw, -hh, z,
               hw,  hh, z,
              -hw,  hh, z
            ]);
            const uvs = new Float32Array([
              1, 1,
              0, 1,
              0, 0,
              1, 0
            ]);
            const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
            const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);

            const geo = new BufferGeometryConstructor();
            geo.setAttribute('position', new BufferAttributeConstructor(positions, 3));
            geo.setAttribute('uv', new BufferAttributeConstructor(uvs, 2));
            geo.setAttribute('normal', new BufferAttributeConstructor(normals, 3));
            geo.setIndex(new BufferAttributeConstructor(indices, 1));

            let overlay = backMesh.parent.getObjectByName('CaseOverlayMesh');
            if (!overlay) {
              const mat = new MaterialConstructor();
              mat.map = tex;
              mat.transparent = true;
              mat.side = 2;
              mat.roughness = 0.88;
              mat.metalness = 0.0;

              overlay = new MeshConstructor(geo, mat);
              overlay.name = 'CaseOverlayMesh';
              overlay.scale.copy(backMesh.scale);
              backMesh.parent.add(overlay);
            } else {
              overlay.geometry = geo;
              if (overlay.material) {
                overlay.material.map = tex;
                overlay.material.transparent = true;
                overlay.material.roughness = 0.88;
                overlay.material.metalness = 0.0;
                overlay.material.needsUpdate = true;
              }
            }

            // CaseExtrusionBumper
            const rOut = 1.20;
            const hwIn = 3.74;
            const hhIn = 7.85;
            const rIn = 1.05;
            const zBack = 0.435;
            const zFront = -0.52;
            const segmentsPerCorner = 12;
            const N = segmentsPerCorner * 4;

            const generatePoints = (wVal: number, hVal: number, rVal: number) => {
              const pts: { x: number; y: number }[] = [];
              const corners = [
                { cx: wVal - rVal, cy: hVal - rVal, startAngle: 0, endAngle: Math.PI / 2 },
                { cx: -wVal + rVal, cy: hVal - rVal, startAngle: Math.PI / 2, endAngle: Math.PI },
                { cx: -wVal + rVal, cy: -hVal + rVal, startAngle: Math.PI, endAngle: Math.PI * 1.5 },
                { cx: wVal - rVal, cy: -hVal + rVal, startAngle: Math.PI * 1.5, endAngle: Math.PI * 2 }
              ];
              for (const c of corners) {
                for (let i = 0; i < segmentsPerCorner; i++) {
                  const theta = c.startAngle + (i / segmentsPerCorner) * (c.endAngle - c.startAngle);
                  pts.push({
                    x: c.cx + rVal * Math.cos(theta),
                    y: c.cy + rVal * Math.sin(theta)
                  });
                }
              }
              return pts;
            };

            const ptsOut = generatePoints(hw, hh, rOut);
            const ptsIn = generatePoints(hwIn, hhIn, rIn);
            const bumperPos: number[] = [];
            const bumperIndices: number[] = [];

            for (let i = 0; i < N; i++) bumperPos.push(ptsOut[i].x, ptsOut[i].y, zBack);
            for (let i = 0; i < N; i++) bumperPos.push(ptsOut[i].x, ptsOut[i].y, zFront);
            for (let i = 0; i < N; i++) bumperPos.push(ptsIn[i].x, ptsIn[i].y, zBack);

            for (let i = 0; i < N; i++) {
              const next = (i + 1) % N;
              bumperIndices.push(i, N + i, next);
              bumperIndices.push(next, N + i, N + next);
            }
            for (let i = 0; i < N; i++) {
              const next = (i + 1) % N;
              bumperIndices.push(2 * N + i, i, 2 * N + next);
              bumperIndices.push(2 * N + next, i, next);
            }

            const bumperGeo = new BufferGeometryConstructor();
            bumperGeo.setAttribute('position', new BufferAttributeConstructor(new Float32Array(bumperPos), 3));
            bumperGeo.setIndex(new BufferAttributeConstructor(new Uint16Array(bumperIndices), 1));
            bumperGeo.computeVertexNormals();

            let bumper = backMesh.parent.getObjectByName('CaseExtrusionBumper');
            if (!bumper) {
              const bumperMat = new MaterialConstructor();
              bumperMat.color.set('#18181b');
              bumperMat.roughness = 0.85;
              bumperMat.metalness = 0.1;
              bumperMat.side = 2;

              bumper = new MeshConstructor(bumperGeo, bumperMat);
              bumper.name = 'CaseExtrusionBumper';
              bumper.scale.copy(backMesh.scale);
              backMesh.parent.add(bumper);
            } else {
              bumper.geometry = bumperGeo;
              if (bumper.material) {
                bumper.material.color.set('#18181b');
                bumper.material.needsUpdate = true;
              }
            }

            if (scene) {
              scene.isDirty = true;
              if (typeof scene.queueRender === 'function') {
                scene.queueRender();
                requestAnimationFrame(() => {
                  if (typeof scene.queueRender === 'function') scene.queueRender();
                });
              }
            }
            return;
          }
        }
      }
    }

    // Fallback: ModelViewer createTexture API
    const targetMat = mv.model?.materials?.find(
      (m: any) =>
        m.name === 'oZRkkORNzkufnGD' ||
        m.name === 'glass' ||
        m.name === 'back' ||
        m.name?.toLowerCase().includes('case')
    );
    if (targetMat?.pbrMetallicRoughness?.baseColorTexture) {
      mv.createTexture(canvas.toDataURL('image/png')).then((texture: any) => {
        targetMat.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
        targetMat.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
        if (scene) {
          scene.isDirty = true;
          if (typeof scene.queueRender === 'function') scene.queueRender();
        }
      });
    }
  }

  /**
   * Bộ nhớ đệm Image cho SVG vector phục vụ render 3D texture
   */
  private readonly templateArtImageCache = new Map<string, HTMLImageElement>();

  /**
   * Preload toàn bộ các artwork SVG vector ngay khi khởi tạo
   */
  private preloadTemplateArtworks(): void {
    if (typeof window === 'undefined') return;
    Object.values(this.artworkMap).forEach((art) => {
      if (art.url && !this.templateArtImageCache.has(art.url)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.templateArtImageCache.set(art.url, img);
        };
        img.src = art.url;
      }
    });
  }

  /**
   * Vẽ tác phẩm đặc trưng của từng Template lên Canvas 2D phục vụ 3D Texture (1:1 với Artwork Vector)
   */
  private drawTemplateArtworkToCanvas(
    ctx: CanvasRenderingContext2D,
    template: TemplateCard,
    W: number,
    H: number
  ): void {
    const artInfo = this.getArtwork(template.artType);

    if (artInfo?.url) {
      let img = this.templateArtImageCache.get(artInfo.url);
      if (!img) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.templateArtImageCache.set(artInfo.url, img!);
          if (this.previewTemplate()?.id === template.id) {
            this.syncTemplate3dTexture(template);
          }
        };
        img.src = artInfo.url;
      }

      if (img.complete && img.naturalWidth > 0) {
        const artW = (artInfo.width / 100) * W;
        const artH = artW * (img.naturalHeight / (img.naturalWidth || 1));
        const artX = (artInfo.x / 100) * W;
        const artY = (artInfo.y / 100) * H;
        ctx.save();
        ctx.drawImage(img, artX - artW / 2, artY - artH / 2, artW, artH);
        ctx.restore();
      }
    }

    if (template.artType === 'that-girl-era') {
      ctx.save();
      ctx.font = '900 50px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#db2777';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(219, 39, 119, 0.35)';
      ctx.shadowBlur = 8;
      ctx.fillText('THAT GIRL', W / 2, H * 0.58);
      ctx.font = '900 56px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('ERA', W / 2, H * 0.65);
      ctx.restore();
    } else if (artInfo?.text && artInfo.textY) {
      ctx.save();
      ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 8;
      ctx.fillText(artInfo.text, (artInfo.x / 100) * W, (artInfo.textY / 100) * H);
      ctx.restore();
    }
  }


  // --- User Comment / Feedback Submission (Phải đăng nhập mới được gửi) ---
  protected onReviewTextInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.userReviewText.set(target.value);
  }

  protected onSubmitUserReview(): void {
    if (!this.isLoggedIn()) {
      this.openLoginModal();
      return;
    }

    const comment = this.userReviewText().trim();
    if (!comment) return;

    const tpl = this.previewTemplate();
    if (!tpl) return;

    const newRev: TemplateReview = {
      id: 'rev-' + Date.now(),
      userName: this.userDisplayName(),
      date: 'Vừa xong',
      deviceModel: this.state.selectedModel().name,
      comment,
      isVerifiedBuyer: true,
      tag: 'Góp ý thẩm mỹ',
    };

    const currentList = this.reviewsMap()[tpl.id] || [];
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

  /**
   * Tạo bộ Layers đồ họa Vector/Typography chuẩn 1:1 cho từng Template
   * Đảm bảo khi người dùng nhấn "Dùng mẫu này" thì Canvas Studio hiện giống y hệt mẫu bên ngoài
   */
  private createTemplateLayers(template: TemplateCard): CanvasLayer[] {
    const art = template.artType;

    if (art === 'blank') {
      return [];
    }

    if (art === 'dreamy-kitten') {
      const imgLayer: ImageElement = {
        id: 'tpl_layer_kitten_' + Date.now(),
        type: 'image',
        zIndex: 1,
        x: 50,
        y: 72,
        width: 85,
        height: 60,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: svgToDataUri(TEMPLATE_SVG_KITTEN),
        fileType: 'image/png',
        fileSizeBytes: 6200,
        pixelWidth: 400,
        pixelHeight: 350,
        dpi: 300,
        isLowResAcknowledged: true,
      };
      return [imgLayer];
    }

    if (art === 'sakura-bloom') {
      const imgLayer: ImageElement = {
        id: 'tpl_layer_sakura_' + Date.now(),
        type: 'image',
        zIndex: 1,
        x: 50,
        y: 50,
        width: 94,
        height: 86,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: svgToDataUri(TEMPLATE_SVG_SAKURA),
        fileType: 'image/png',
        fileSizeBytes: 5400,
        pixelWidth: 400,
        pixelHeight: 700,
        dpi: 300,
        isLowResAcknowledged: true,
      };
      return [imgLayer];
    }

    if (art === 'mountain-escape') {
      const imgLayer: ImageElement = {
        id: 'tpl_layer_mountain_' + Date.now(),
        type: 'image',
        zIndex: 1,
        x: 50,
        y: 64,
        width: 96,
        height: 72,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: svgToDataUri(TEMPLATE_SVG_MOUNTAIN),
        fileType: 'image/png',
        fileSizeBytes: 4200,
        pixelWidth: 400,
        pixelHeight: 500,
        dpi: 300,
        isLowResAcknowledged: true,
      };
      return [imgLayer];
    }

    if (art === 'minimal-cat') {
      const imgLayer: ImageElement = {
        id: 'tpl_layer_min_cat_' + Date.now(),
        type: 'image',
        zIndex: 1,
        x: 50,
        y: 68,
        width: 62,
        height: 62,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: svgToDataUri(TEMPLATE_SVG_MINIMAL_CAT),
        fileType: 'image/png',
        fileSizeBytes: 3100,
        pixelWidth: 300,
        pixelHeight: 360,
        dpi: 300,
        isLowResAcknowledged: true,
      };
      return [imgLayer];
    }

    if (art === 'abstract-waves') {
      const imgLayer: ImageElement = {
        id: 'tpl_layer_waves_' + Date.now(),
        type: 'image',
        zIndex: 1,
        x: 50,
        y: 58,
        width: 100,
        height: 92,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: svgToDataUri(TEMPLATE_SVG_WAVES),
        fileType: 'image/png',
        fileSizeBytes: 3200,
        pixelWidth: 400,
        pixelHeight: 650,
        dpi: 300,
        isLowResAcknowledged: true,
      };
      return [imgLayer];
    }

    if (art === 'dino-friend') {
      const imgLayer: ImageElement = {
        id: 'tpl_layer_dino_' + Date.now(),
        type: 'image',
        zIndex: 1,
        x: 50,
        y: 70,
        width: 75,
        height: 68,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: svgToDataUri(TEMPLATE_SVG_DINO),
        fileType: 'image/png',
        fileSizeBytes: 4800,
        pixelWidth: 360,
        pixelHeight: 400,
        dpi: 300,
        isLowResAcknowledged: true,
      };
      return [imgLayer];
    }

    if (art === 'starry-night') {
      const imgLayer: ImageElement = {
        id: 'tpl_layer_moon_' + Date.now(),
        type: 'image',
        zIndex: 1,
        x: 50,
        y: 48,
        width: 86,
        height: 70,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: svgToDataUri(TEMPLATE_SVG_MOON),
        fileType: 'image/png',
        fileSizeBytes: 3800,
        pixelWidth: 360,
        pixelHeight: 400,
        dpi: 300,
        isLowResAcknowledged: true,
      };
      const textLayer: TextElement = {
        id: 'tpl_layer_starry_txt_' + Date.now(),
        type: 'text',
        zIndex: 2,
        content: 'STARRY',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 22,
        textColor: '#FFFFFF',
        textAlign: 'center',
        fontWeight: '800',
        x: 50,
        y: 83,
        width: 50,
        height: 12,
        rotation: 0,
        opacity: 1,
        isLocked: false,
      };
      return [imgLayer, textLayer];
    }

    if (art === 'that-girl-era') {
      const textLayer1: TextElement = {
        id: 'tpl_layer_that_girl_' + Date.now(),
        type: 'text',
        zIndex: 1,
        content: 'THAT GIRL',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 30,
        textColor: '#db2777',
        textAlign: 'center',
        fontWeight: '800',
        x: 50,
        y: 62,
        width: 70,
        height: 14,
        rotation: 0,
        opacity: 1,
        isLocked: false,
      };
      const textLayer2: TextElement = {
        id: 'tpl_layer_era_' + Date.now(),
        type: 'text',
        zIndex: 2,
        content: 'ERA',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 30,
        textColor: '#db2777',
        textAlign: 'center',
        fontWeight: '800',
        x: 50,
        y: 72,
        width: 45,
        height: 14,
        rotation: 0,
        opacity: 1,
        isLocked: false,
      };
      return [textLayer1, textLayer2];
    }

    if (template.elementImage) {
      const isChibi = art === 'the-creators-chibi';
      const isReal = art === 'the-creators-real';
      const artInfo = this.getArtwork(template.artType);
      const imgLayer: ImageElement = {
        id: 'tpl_layer_' + template.id + '_' + Date.now(),
        type: 'image',
        zIndex: 1,
        x: artInfo?.x ?? 50,
        y: artInfo?.y ?? 55,
        width: artInfo?.width ?? 85,
        height: artInfo?.height ?? 80,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: template.elementImage,
        fileType: isChibi || isReal ? 'image/webp' : 'image/png',
        fileSizeBytes: 350000,
        pixelWidth: 1600,
        pixelHeight: 1600,
        dpi: 300,
        isLowResAcknowledged: true,
      };
      return [imgLayer];
    }

    if (art === 'the-creators-real' || art === 'the-creators-chibi') {
      const isChibi = art === 'the-creators-chibi';
      const imgLayer: ImageElement = {
        id: (isChibi ? 'tpl_layer_chibi_' : 'tpl_layer_real_') + Date.now(),
        type: 'image',
        zIndex: 1,
        x: 50,
        y: 55,
        width: 92,
        height: 80,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: isChibi ? '/assets/templates/the-creators-chibi.webp' : '/assets/templates/the-creators-real.webp',
        fileType: 'image/webp',
        fileSizeBytes: isChibi ? 964108 : 1597886,
        pixelWidth: isChibi ? 941 : 1103,
        pixelHeight: isChibi ? 1672 : 1426,
        dpi: 300,
        isLowResAcknowledged: true,
      };
      return [imgLayer];
    }

    return [];
  }

  // --- Template Loading / Creation ---
  protected onDesignTemplate(template: TemplateCard): void {
    this.closePreviewModal();
    if (template.isBlankCanvas) {
      this.state.clearCanvas();
      this.state.caseBg.set('#FFFFFF');
      this.state.designName.set('Thiết kế chưa đặt tên');
      this.state.suggestedDesignName.set(`Ốp lưng ${this.state.selectedModel().name} - Trắng`);
      this.state.isFirstSave.set(true);
    } else {
      this.state.clearCanvas();
      if (template.bgImage) {
        this.state.caseBg.set(`url('${template.bgImage}') center / cover no-repeat`);
      } else {
        this.state.caseBg.set(template.gradient);
      }
      this.state.designName.set('Thiết kế chưa đặt tên');
      this.state.suggestedDesignName.set(`Ốp ${template.name} - ${this.state.selectedModel().name}`);
      this.state.isFirstSave.set(true);
      const layers = this.createTemplateLayers(template);
      if (layers.length > 0) {
        this.state.setLayers(layers, false);
        this.state.selectLayer(layers[0].id);
      }
    }
    this.state.resetHistory();
    this.router.navigate(['/design-studio/editor']);
  }

  protected createNewDesign(): void {
    this.state.clearCanvas();
    this.state.caseBg.set('#FFFFFF');
    this.state.designName.set('Thiết kế chưa đặt tên');
    this.state.suggestedDesignName.set(`Ốp lưng ${this.state.selectedModel().name} - Thiết kế mới`);
    this.state.isFirstSave.set(true);
    this.state.resetHistory();
    this.closeAllDesignsModal();
    this.router.navigate(['/design-studio/editor']);
  }

  // --- My Designs Actions ---
  protected onContinueSavedDesign(saved: SavedDesignItem): void {
    this.closeCardMenu();
    this.closeAllDesignsModal();
    this.state.restoreSavedDesign(saved);
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

  protected openDeleteConfirmModal(item: SavedDesignItem, event?: MouseEvent): void {
    this.onDeleteSavedDesign(item, event);
  }

  protected openRenameModal(item: SavedDesignItem, event?: MouseEvent): void {
    this.startRenameDesign(item, event);
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
