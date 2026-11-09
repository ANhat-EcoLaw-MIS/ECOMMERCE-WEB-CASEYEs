import { CanvasLayer, ImageElement, TextElement } from '../models/canvas-element.model';

/**
 * Chuyá»ƒn Ä‘á»•i chuá»—i SVG sang Data URI (Base64 hoáº·c UTF-8 an toÃ n cho má» i trÃ¬nh duyá»‡t vÃ  SSR)
 */
export function svgToDataUri(svg: string): string {
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

// ─── SVG Artworks Chuáº©n Studio Vector 1:1 vá»›i Model 3D & Catalog ───

export const TEMPLATE_SVG_KITTEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 350" width="400" height="350">
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

export const TEMPLATE_SVG_SAKURA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" width="400" height="700">
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

export const TEMPLATE_SVG_MOUNTAIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
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

export const TEMPLATE_SVG_MINIMAL_CAT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360">
  <path d="M 150,55 C 150,40 135,25 118,25 C 98,25 85,42 85,62 C 85,95 130,125 150,140 C 170,125 215,95 215,62 C 215,42 202,25 182,25 C 165,25 150,40 150,55 Z" fill="#ef4444" transform="scale(0.55) translate(122, -10)"/>
  <g fill="none" stroke="#18181b" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 90,175 L 105,75 L 145,115 Q 150,110 155,115 L 195,75 L 210,175"/>
    <path d="M 90,175 C 65,265 80,320 120,335 C 150,340 180,340 210,335 C 245,320 245,260 210,175"/>
    <path d="M 195,310 C 260,300 270,240 245,200" stroke-width="8"/>
    <path d="M 135,338 L 135,320" stroke-width="7"/>
    <path d="M 165,338 L 165,320" stroke-width="7"/>
  </g>
</svg>`;

export const TEMPLATE_SVG_ANIME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 420" width="360" height="420">
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

export const TEMPLATE_SVG_WAVES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 650" width="400" height="650">
  <path d="M -20,150 Q 120,70 200,200 T 420,160 L 420,700 L -20,700 Z" fill="#fed7aa"/>
  <path d="M -20,250 Q 100,170 230,300 T 420,270 L 420,700 L -20,700 Z" fill="#fbcfe8"/>
  <path d="M -20,370 Q 140,290 250,420 T 420,380 L 420,700 L -20,700 Z" fill="#ddd6fe"/>
  <path d="M -20,490 Q 120,420 240,530 T 420,490 L 420,700 L -20,700 Z" fill="#bae6fd"/>
</svg>`;

export const TEMPLATE_SVG_DINO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 400" width="360" height="400">
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

export const TEMPLATE_SVG_MOON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 400" width="360" height="400">
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

/**
 * Sinh cÃ¡c CanvasLayer chuáº©n cho má»—i ArtType Ä‘á»ƒ Canvas Studio & 3D Preview hiá»ƒn thá»‹ giá»‘ng 100%
 */
export function buildTemplateLayers(art: string): CanvasLayer[] {
  const ts = Date.now();

  if (art === 'blank') {
    return [];
  }

  if (art === 'dreamy-kitten' || art === 'dreamy-sky') {
    const imgLayer: ImageElement = {
      id: 'tpl_layer_kitten_' + ts,
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

  if (art === 'sakura-bloom' || art === 'sakura') {
    const imgLayer: ImageElement = {
      id: 'tpl_layer_sakura_' + ts,
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

  if (art === 'mountain-escape' || art === 'mountain') {
    const imgLayer: ImageElement = {
      id: 'tpl_layer_mountain_' + ts,
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

  if (art === 'minimal-cat' || art === 'cat') {
    const imgLayer: ImageElement = {
      id: 'tpl_layer_min_cat_' + ts,
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
      id: 'tpl_layer_anime_' + ts,
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
      id: 'tpl_layer_waves_' + ts,
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
      id: 'tpl_layer_dino_' + ts,
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

  if (art === 'starry-night' || art === 'starry') {
    const imgLayer: ImageElement = {
      id: 'tpl_layer_moon_' + ts,
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
      id: 'tpl_layer_starry_txt_' + ts,
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
      id: 'tpl_layer_that_girl_' + ts,
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
      id: 'tpl_layer_era_' + ts,
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
