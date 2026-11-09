import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudioCatalogService } from '../../services/studio-catalog';
import { SavedDesignItem, StudioState } from '../../services/studio-state';
import { CanvasLayer, ImageElement, TextElement } from '../../models/canvas-element.model';
import { SupabaseAuthService } from '../../../../core/supabase/supabase-auth.service';

// Dynamically import @google/model-viewer for rich WebGL 3D rendering in browser
if (typeof window !== 'undefined') {
  import('@google/model-viewer').catch((err) => {
    console.warn('Google Model Viewer dynamic import warning:', err);
  });
}

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

const TEMPLATE_SVG_ANIME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 420" width="360" height="420">
  <defs>
    <radialGradient id="animeHalo" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </radialGradient>
  </defs>
  <circle cx="180" cy="180" r="140" fill="url(#animeHalo)"/>
  <circle cx="180" cy="190" r="85" fill="#fef3c7"/>
  <path d="M 100,160 Q 140,210 160,190 Q 180,220 200,190 Q 220,210 260,160 Q 220,110 180,115 Q 140,110 100,160 Z" fill="#4338ca"/>
  <ellipse cx="145" cy="190" rx="15" ry="18" fill="#1e1b4b"/>
  <ellipse cx="215" cy="190" rx="15" ry="18" fill="#1e1b4b"/>
  <circle cx="140" cy="184" r="6" fill="#ffffff"/>
  <circle cx="210" cy="184" r="6" fill="#ffffff"/>
  <ellipse cx="130" cy="212" rx="14" ry="7" fill="#f472b6" opacity="0.8"/>
  <ellipse cx="230" cy="212" rx="14" ry="7" fill="#f472b6" opacity="0.8"/>
  <path d="M 172,216 Q 180,224 188,216" fill="none" stroke="#db2777" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 95,290 L 140,380 L 220,380 L 265,290 Z" fill="#312e81"/>
  <polygon points="160,290 180,335 200,290" fill="#f43f5e"/>
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
  // 2. Dreamy Kitten (#pastel)
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
];

const INITIAL_REVIEWS: Record<string, TemplateReview[]> = {};

@Component({
  selector: 'app-template-browser',
  standalone: true,
  imports: [RouterLink],
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
    this.isAutoRotate.set(false);
    this.userReviewText.set('');
    this.userRating.set(5);
    this.reviewSubmittedSuccess.set(false);
    setTimeout(() => {
      this.syncTemplate3dTexture(template);
      this.reset3dView();
    }, 150);
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

    // 1. Draw Background Gradient / Color
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

    // Clip to case silhouette
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(0, 0, W, H, [100, 100, 100, 100]);
    } else {
      ctx.rect(0, 0, W, H);
    }
    ctx.fill();
    ctx.clip();

    // 2. Draw Artwork on Canvas according to artType
    this.drawTemplateArtworkToCanvas(ctx, template, W, H);

    // 3. Punch Camera Cutout cleanly matching model
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

    // 4. Bumper Rim Stroke
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
   * Vẽ tác phẩm đặc trưng của từng Template lên Canvas 2D phục vụ 3D Texture
   */
  private drawTemplateArtworkToCanvas(
    ctx: CanvasRenderingContext2D,
    template: TemplateCard,
    W: number,
    H: number
  ): void {
    const art = template.artType;

    if (art === 'dreamy-kitten') {
      ctx.save();
      // Fluffy clouds at bottom
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.85, 170, 0, Math.PI * 2);
      ctx.arc(W * 0.28, H * 0.88, 130, 0, Math.PI * 2);
      ctx.arc(W * 0.72, H * 0.88, 130, 0, Math.PI * 2);
      ctx.fill();

      // Kitten 1 (Left)
      const catX = W * 0.42;
      const catY = H * 0.75;
      ctx.beginPath();
      ctx.arc(catX, catY, 78, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.beginPath();
      ctx.moveTo(catX - 65, catY - 40);
      ctx.lineTo(catX - 35, catY - 115);
      ctx.lineTo(catX - 5, catY - 60);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(catX + 5, catY - 60);
      ctx.lineTo(catX + 35, catY - 115);
      ctx.lineTo(catX + 65, catY - 40);
      ctx.fill();
      // Pink inner ears
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.moveTo(catX - 52, catY - 45);
      ctx.lineTo(catX - 35, catY - 98);
      ctx.lineTo(catX - 15, catY - 58);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(catX + 15, catY - 58);
      ctx.lineTo(catX + 35, catY - 98);
      ctx.lineTo(catX + 52, catY - 45);
      ctx.fill();
      // Eyes ^ ^
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(catX - 25, catY - 5, 14, Math.PI, 0, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(catX + 25, catY - 5, 14, Math.PI, 0, false);
      ctx.stroke();
      // Blush
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(catX - 38, catY + 16, 11, 0, Math.PI * 2);
      ctx.arc(catX + 38, catY + 16, 11, 0, Math.PI * 2);
      ctx.fill();

      // Kitten 2 (Right)
      const cat2X = W * 0.63;
      const cat2Y = H * 0.78;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cat2X, cat2Y, 65, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cat2X - 50, cat2Y - 30);
      ctx.lineTo(cat2X - 28, cat2Y - 90);
      ctx.lineTo(cat2X, cat2Y - 45);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cat2X, cat2Y - 45);
      ctx.lineTo(cat2X + 28, cat2Y - 90);
      ctx.lineTo(cat2X + 50, cat2Y - 30);
      ctx.fill();
      ctx.restore();
    } else if (art === 'sakura-bloom') {
      ctx.save();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(W * 0.1, H * 0.96);
      ctx.quadraticCurveTo(W * 0.45, H * 0.65, W * 0.35, H * 0.36);
      ctx.quadraticCurveTo(W * 0.3, H * 0.16, W * 0.75, H * 0.08);
      ctx.stroke();
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(W * 0.38, H * 0.46);
      ctx.quadraticCurveTo(W * 0.62, H * 0.38, W * 0.86, H * 0.32);
      ctx.stroke();
      const blossoms = [
        { x: W * 0.35, y: H * 0.36, r: 38 },
        { x: W * 0.75, y: H * 0.15, r: 42 },
        { x: W * 0.58, y: H * 0.33, r: 34 },
        { x: W * 0.84, y: H * 0.33, r: 38 },
        { x: W * 0.22, y: H * 0.6, r: 32 },
        { x: W * 0.48, y: H * 0.22, r: 30 },
        { x: W * 0.68, y: H * 0.46, r: 28 },
      ];
      for (const b of blossoms) {
        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (art === 'mountain-escape') {
      ctx.save();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(W * 0.1, H * 0.72);
      ctx.lineTo(W * 0.5, H * 0.22);
      ctx.lineTo(W * 0.9, H * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(W * 0.5, H * 0.22);
      ctx.lineTo(W * 0.38, H * 0.4);
      ctx.lineTo(W * 0.5, H * 0.35);
      ctx.lineTo(W * 0.62, H * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.moveTo(W * 0.35, H * 0.75);
      ctx.lineTo(W * 0.7, H * 0.36);
      ctx.lineTo(W, H * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f766e';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.85);
      ctx.lineTo(W * 0.25, H * 0.52);
      ctx.lineTo(W * 0.6, H * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, H * 0.78, W, H * 0.22);
      ctx.restore();
    } else if (art === 'minimal-cat') {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♥', W / 2, H * 0.54);
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const cX = W / 2;
      const cY = H * 0.75;
      ctx.beginPath();
      ctx.moveTo(cX - 70, cY - 80);
      ctx.lineTo(cX - 60, cY - 170);
      ctx.lineTo(cX - 20, cY - 130);
      ctx.quadraticCurveTo(cX, cY - 135, cX + 20, cY - 130);
      ctx.lineTo(cX + 60, cY - 170);
      ctx.lineTo(cX + 70, cY - 80);
      ctx.quadraticCurveTo(cX + 90, cY + 40, cX + 65, cY + 90);
      ctx.quadraticCurveTo(cX, cY + 100, cX - 65, cY + 90);
      ctx.quadraticCurveTo(cX - 90, cY + 40, cX - 70, cY - 80);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cX + 55, cY + 70);
      ctx.quadraticCurveTo(cX + 120, cY + 50, cX + 100, cY - 10);
      ctx.stroke();
      ctx.restore();
    } else if (art === 'anime-girl') {
      ctx.save();
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.65, 135, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.67, 88, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.arc(W / 2 - 36, H * 0.67, 14, 0, Math.PI * 2);
      ctx.arc(W / 2 + 36, H * 0.67, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(W / 2 - 42, H * 0.71, 12, 0, Math.PI * 2);
      ctx.arc(W / 2 + 42, H * 0.71, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(W / 2 - 82, H * 0.76, 164, 140, [32, 32, 0, 0]);
      } else {
        ctx.rect(W / 2 - 82, H * 0.76, 164, 140);
      }
      ctx.fill();
      ctx.restore();
    } else if (art === 'abstract-waves') {
      ctx.save();
      const colors = ['#fed7aa', '#fbcfe8', '#ddd6fe', '#bae6fd'];
      const waveHeights = [H * 0.35, H * 0.52, H * 0.7, H * 0.85];
      colors.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, waveHeights[idx]);
        ctx.bezierCurveTo(W * 0.35, waveHeights[idx] - 90, W * 0.65, waveHeights[idx] + 110, W, waveHeights[idx] - 40);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    } else if (art === 'dino-friend') {
      ctx.save();
      const dX = W / 2;
      const dY = H * 0.74;
      ctx.fillStyle = '#facc15';
      [-75, -40, -5].forEach((offset) => {
        ctx.beginPath();
        ctx.arc(dX - 76, dY + offset, 16, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(dX - 72, dY - 115, 144, 185, [52, 52, 42, 42]);
      } else {
        ctx.rect(dX - 72, dY - 115, 144, 185);
      }
      ctx.fill();
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.arc(dX - 25, dY - 60, 12, 0, Math.PI * 2);
      ctx.arc(dX + 25, dY - 60, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bbf7d0';
      ctx.beginPath();
      ctx.ellipse(dX, dY + 15, 46, 56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (art === 'starry-night') {
      ctx.save();
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(W * 0.76, H * 0.28, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(W * 0.72, H * 0.26, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.72, 90, 0, Math.PI * 2);
      ctx.arc(W * 0.35, H * 0.75, 70, 0, Math.PI * 2);
      ctx.arc(W * 0.65, H * 0.75, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STARRY', W / 2, H * 0.83);
      ctx.restore();
    } else if (art === 'that-girl-era') {
      ctx.save();
      ctx.fillStyle = '#db2777';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('THAT GIRL', W / 2, H * 0.65);
      ctx.fillText('ERA', W / 2, H * 0.72);
      ctx.restore();
    }
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

    if (art === 'anime-girl') {
      const imgLayer: ImageElement = {
        id: 'tpl_layer_anime_' + Date.now(),
        type: 'image',
        zIndex: 1,
        x: 50,
        y: 68,
        width: 75,
        height: 68,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        storageUrl: svgToDataUri(TEMPLATE_SVG_ANIME),
        fileType: 'image/png',
        fileSizeBytes: 4500,
        pixelWidth: 360,
        pixelHeight: 420,
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

    return [];
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
      const layers = this.createTemplateLayers(template);
      if (layers.length > 0) {
        this.state.setLayers(layers);
        this.state.selectLayer(layers[0].id);
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
