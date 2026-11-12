const fs = require('fs');
const path = require('path');

const stickersDir = path.join(__dirname, '..', 'public', 'assets', 'stickers');
const badgesDir = path.join(__dirname, '..', 'public', 'assets', 'badges');

fs.mkdirSync(stickersDir, { recursive: true });
fs.mkdirSync(badgesDir, { recursive: true });

// Helper to write SVG
function writeSvg(dir, filename, svgContent) {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, svgContent.trim(), 'utf-8');
  console.log(`Created: ${filename}`);
}

// ─────────────────────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────────────────────

// 1. Polycarbonate Military Shield
writeSvg(badgesDir, 'polycarbonate-shield.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="shieldGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A58CF4"/>
      <stop offset="50%" stop-color="#6A53B0"/>
      <stop offset="100%" stop-color="#433075"/>
    </linearGradient>
    <linearGradient id="shieldRim" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ECE6FD"/>
      <stop offset="100%" stop-color="#2A1D4D"/>
    </linearGradient>
    <linearGradient id="glassGloss" x1="20" y1="20" x2="60" y2="70" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="badgeShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#433075" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Outer Rim -->
  <path d="M50 8 L85 24 C85 58 50 88 50 88 C50 88 15 58 15 24 Z" fill="url(#shieldRim)" filter="url(#badgeShadow)"/>
  <!-- Inner Shield -->
  <path d="M50 14 L80 28 C80 55 50 82 50 82 C50 82 20 55 20 28 Z" fill="url(#shieldGrad)"/>
  <!-- Glass Reflection -->
  <path d="M50 15 L78 28.5 C72 50 50 70 50 70 L50 15 Z" fill="url(#glassGloss)"/>
  <!-- Star / Check Crest -->
  <path d="M50 32 L53.5 42.5 L64.5 43 L56 50 L59 60.5 L50 54.5 L41 60.5 L44 50 L35.5 43 L46.5 42.5 Z" fill="#FFFFFF"/>
  <circle cx="50" cy="48" r="4" fill="#A58CF4"/>
</svg>
`);

// 2. Uniform Price Tag 250k
writeSvg(badgesDir, 'uniform-price.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="tagGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <linearGradient id="purpleRing" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A58CF4"/>
      <stop offset="100%" stop-color="#433075"/>
    </linearGradient>
    <filter id="tagShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#D97706" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Ring Badge -->
  <rect x="12" y="12" width="76" height="76" rx="22" fill="url(#purpleRing)" filter="url(#tagShadow)"/>
  <!-- Inner Tag Body -->
  <rect x="18" y="18" width="64" height="64" rx="16" fill="url(#tagGrad)"/>
  <!-- Tag Hole -->
  <circle cx="50" cy="30" r="4.5" fill="#433075"/>
  <circle cx="50" cy="30" r="2.5" fill="#FFFFFF"/>
  <!-- Label 250K -->
  <text x="50" y="55" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="18" fill="#433075" text-anchor="middle">250K</text>
  <text x="50" y="69" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="8.5" fill="#433075" text-anchor="middle" letter-spacing="1">ĐỒNG GIÁ</text>
</svg>
`);

// 3. 360 Orbit Rotate
writeSvg(badgesDir, '360-rotate.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="orbitGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A58CF4"/>
      <stop offset="100%" stop-color="#433075"/>
    </linearGradient>
  </defs>
  <ellipse cx="50" cy="50" rx="36" ry="18" stroke="url(#orbitGrad)" stroke-width="4" stroke-dasharray="8 4" stroke-linecap="round"/>
  <!-- Arrow Heads -->
  <path d="M86 50 L82 42 L74 48 Z" fill="#433075"/>
  <path d="M14 50 L18 58 L26 52 Z" fill="#A58CF4"/>
  <!-- Hand / Finger Touch Center -->
  <circle cx="50" cy="50" r="14" fill="#FFFFFF" stroke="#433075" stroke-width="2.5"/>
  <text x="50" y="54" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="10" fill="#433075" text-anchor="middle">360°</text>
</svg>
`);

// ─────────────────────────────────────────────────────────────
// 24 GEN-Z DIE-CUT STICKERS
// ─────────────────────────────────────────────────────────────

const stickerItems = [
  {
    file: 'y2k-heart.svg',
    title: 'Trái tim Y2K',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="heartGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF5E98"/>
      <stop offset="45%" stop-color="#A58CF4"/>
      <stop offset="100%" stop-color="#433075"/>
    </linearGradient>
    <filter id="stickerGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#433075" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- Die Cut White Border -->
  <path d="M60 98 C35 80 15 62 15 42 C15 25 28 14 44 14 C52 14 60 20 60 20 C60 20 68 14 76 14 C92 14 105 25 105 42 C105 62 85 80 60 98 Z"
        fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round" filter="url(#stickerGlow)"/>
  <!-- Gradient Heart Body -->
  <path d="M60 98 C35 80 15 62 15 42 C15 25 28 14 44 14 C52 14 60 20 60 20 C60 20 68 14 76 14 C92 14 105 25 105 42 C105 62 85 80 60 98 Z"
        fill="url(#heartGrad)"/>
  <!-- Gloss Specular Highlight -->
  <path d="M30 36 C30 27 38 22 47 22 C49 22 45 27 38 31 C32 35 30 40 30 40 Z" fill="#FFFFFF" opacity="0.75"/>
  <circle cx="34" cy="48" r="2.5" fill="#FFFFFF" opacity="0.6"/>
</svg>`
  },
  {
    file: 'cyber-star.svg',
    title: 'Ngôi sao Cyber',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="starGrad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="40%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#A58CF4"/>
    </linearGradient>
    <filter id="starGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#6B21A8" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Die Cut White Border -->
  <path d="M60 10 Q60 48 22 60 Q60 72 60 110 Q60 72 98 60 Q60 48 60 10 Z"
        fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round" filter="url(#starGlow)"/>
  <!-- Star Core -->
  <path d="M60 10 Q60 48 22 60 Q60 72 60 110 Q60 72 98 60 Q60 48 60 10 Z" fill="url(#starGrad)"/>
  <!-- 4-point Sparkle Accent -->
  <circle cx="60" cy="60" r="10" fill="#FFFFFF" opacity="0.85"/>
  <circle cx="60" cy="60" r="5" fill="#FDE047"/>
</svg>`
  },
  {
    file: 'sakura-blossom.svg',
    title: 'Hoa anh đào Sakura',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="sakuraGrad" x1="30" y1="30" x2="90" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFE4E6"/>
      <stop offset="60%" stop-color="#FDA4AF"/>
      <stop offset="100%" stop-color="#F43F5E"/>
    </linearGradient>
    <filter id="sakuraGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#BE185D" flood-opacity="0.25"/>
    </filter>
  </defs>
  <g filter="url(#sakuraGlow)" stroke="#FFFFFF" stroke-width="7" stroke-linejoin="round" fill="#FFFFFF">
    <circle cx="60" cy="60" r="42"/>
  </g>
  <!-- 5 Petals -->
  <g transform="translate(60,60)">
    <path d="M0 -10 C-18 -25 -15 -48 0 -52 C15 -48 18 -25 0 -10 Z" fill="url(#sakuraGrad)"/>
    <path d="M0 -10 C-18 -25 -15 -48 0 -52 C15 -48 18 -25 0 -10 Z" fill="url(#sakuraGrad)" transform="rotate(72)"/>
    <path d="M0 -10 C-18 -25 -15 -48 0 -52 C15 -48 18 -25 0 -10 Z" fill="url(#sakuraGrad)" transform="rotate(144)"/>
    <path d="M0 -10 C-18 -25 -15 -48 0 -52 C15 -48 18 -25 0 -10 Z" fill="url(#sakuraGrad)" transform="rotate(216)"/>
    <path d="M0 -10 C-18 -25 -15 -48 0 -52 C15 -48 18 -25 0 -10 Z" fill="url(#sakuraGrad)" transform="rotate(288)"/>
    <circle cx="0" cy="0" r="10" fill="#FEF08A"/>
    <circle cx="0" cy="0" r="5" fill="#E11D48"/>
  </g>
</svg>`
  },
  {
    file: 'retro-smiley.svg',
    title: 'Mặt cười Retro',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="smileGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="100%" stop-color="#FBBF24"/>
    </linearGradient>
    <filter id="smileGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#D97706" flood-opacity="0.3"/>
    </filter>
  </defs>
  <circle cx="60" cy="60" r="46" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" filter="url(#smileGlow)"/>
  <circle cx="60" cy="60" r="44" fill="url(#smileGrad)"/>
  <!-- Eyes -->
  <ellipse cx="44" cy="48" rx="5" ry="8" fill="#1E1B4B"/>
  <ellipse cx="76" cy="48" rx="5" ry="8" fill="#1E1B4B"/>
  <circle cx="43" cy="45" r="2" fill="#FFFFFF"/>
  <circle cx="75" cy="45" r="2" fill="#FFFFFF"/>
  <!-- Smile -->
  <path d="M40 68 Q60 90 80 68" stroke="#1E1B4B" stroke-width="6" stroke-linecap="round" fill="none"/>
  <!-- Rosy Cheeks -->
  <circle cx="34" cy="66" r="6" fill="#FB7185" opacity="0.6"/>
  <circle cx="86" cy="66" r="6" fill="#FB7185" opacity="0.6"/>
</svg>`
  },
  {
    file: 'pastel-rainbow.svg',
    title: 'Cầu vồng Pastel',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <filter id="rbGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#433075" flood-opacity="0.2"/>
    </filter>
  </defs>
  <g filter="url(#rbGlow)">
    <!-- White Die Cut Backing -->
    <path d="M15 85 C15 45 40 20 60 20 C80 20 105 45 105 85 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="10" stroke-linejoin="round"/>
    <!-- Rainbow Arcs -->
    <path d="M22 82 A42 42 0 0 1 98 82" stroke="#F472B6" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M32 82 A32 32 0 0 1 88 82" stroke="#FBBF24" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M42 82 A22 22 0 0 1 78 82" stroke="#38BDF8" stroke-width="10" fill="none" stroke-linecap="round"/>
    <!-- Clouds -->
    <circle cx="28" cy="82" r="14" fill="#FFFFFF"/>
    <circle cx="38" cy="84" r="11" fill="#FFFFFF"/>
    <circle cx="92" cy="82" r="14" fill="#FFFFFF"/>
    <circle cx="82" cy="84" r="11" fill="#FFFFFF"/>
  </g>
</svg>`
  },
  {
    file: 'hologram-butterfly.svg',
    title: 'Bướm Hologram',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="bfGradL" x1="10" y1="20" x2="60" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="50%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#F43F5E"/>
    </linearGradient>
    <filter id="bfGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#7C3AED" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#bfGlow)">
    <!-- White Die Cut Outline -->
    <path d="M60 55 C50 20 15 20 18 50 C20 70 45 75 60 85 C75 75 100 70 102 50 C105 20 70 20 60 55 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="10" stroke-linejoin="round"/>
    <!-- Upper Left Wing -->
    <path d="M60 55 C45 15 15 25 20 52 C24 72 48 70 60 62 Z" fill="url(#bfGradL)"/>
    <!-- Upper Right Wing -->
    <path d="M60 55 C75 15 105 25 100 52 C96 72 72 70 60 62 Z" fill="url(#bfGradL)"/>
    <!-- Lower Left Wing -->
    <path d="M60 62 C40 68 25 78 35 92 C45 100 55 85 60 70 Z" fill="url(#bfGradL)"/>
    <!-- Lower Right Wing -->
    <path d="M60 62 C80 68 95 78 85 92 C75 100 65 85 60 70 Z" fill="url(#bfGradL)"/>
    <!-- Body -->
    <ellipse cx="60" cy="62" rx="4" ry="18" fill="#1E1B4B"/>
    <!-- Antennae -->
    <path d="M58 46 Q50 35 44 38 M62 46 Q70 35 76 38" stroke="#1E1B4B" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`
  },
  {
    file: 'glossy-strawberry.svg',
    title: 'Dâu tây đỏ mọng',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="sbGrad" x1="30" y1="30" x2="90" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FB7185"/>
      <stop offset="60%" stop-color="#E11D48"/>
      <stop offset="100%" stop-color="#9F1239"/>
    </linearGradient>
    <filter id="sbGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#9F1239" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#sbGlow)">
    <!-- Die Cut Backing -->
    <path d="M60 102 C35 102 24 65 26 46 C28 32 40 28 60 28 C80 28 92 32 94 46 C96 65 85 102 60 102 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="9" stroke-linejoin="round"/>
    <!-- Strawberry Body -->
    <path d="M60 100 C36 100 26 66 28 47 C30 34 42 30 60 30 C78 30 90 34 92 47 C94 66 84 100 60 100 Z" fill="url(#sbGrad)"/>
    <!-- Gloss -->
    <path d="M38 42 C36 50 38 64 42 68 C40 60 40 50 48 44 C42 42 40 40 38 42 Z" fill="#FFFFFF" opacity="0.6"/>
    <!-- Seeds -->
    <ellipse cx="50" cy="55" rx="2" ry="3" fill="#FDE047"/>
    <ellipse cx="70" cy="55" rx="2" ry="3" fill="#FDE047"/>
    <ellipse cx="60" cy="70" rx="2" ry="3" fill="#FDE047"/>
    <ellipse cx="45" cy="80" rx="2" ry="3" fill="#FDE047"/>
    <ellipse cx="75" cy="78" rx="2" ry="3" fill="#FDE047"/>
    <!-- Leaves -->
    <path d="M60 32 C50 18 36 26 42 34 C48 38 56 36 60 32 Z" fill="#22C55E"/>
    <path d="M60 32 C70 18 84 26 78 34 C72 38 64 36 60 32 Z" fill="#22C55E"/>
    <path d="M60 32 C60 16 68 14 62 30 Z" fill="#15803D"/>
  </g>
</svg>`
  },
  {
    file: 'magic-sparkles.svg',
    title: 'Tia sáng lấp lánh',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="spkGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#F43F5E"/>
    </linearGradient>
    <filter id="spkGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#7C3AED" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#spkGlow)">
    <!-- Big Sparkle Backing -->
    <path d="M60 14 Q60 50 30 60 Q60 70 60 106 Q60 70 90 60 Q60 50 60 14 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round"/>
    <path d="M60 14 Q60 50 30 60 Q60 70 60 106 Q60 70 90 60 Q60 50 60 14 Z" fill="url(#spkGrad)"/>
    <circle cx="60" cy="60" r="6" fill="#FFFFFF"/>
    <!-- Small Sparkle Top-Right -->
    <path d="M96 24 Q96 38 84 42 Q96 46 96 60 Q96 46 108 42 Q96 38 96 24 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round"/>
    <path d="M96 24 Q96 38 84 42 Q96 46 96 60 Q96 46 108 42 Q96 38 96 24 Z" fill="#FDE047"/>
    <!-- Small Sparkle Bottom-Left -->
    <path d="M26 78 Q26 86 18 90 Q26 94 26 102 Q26 94 34 90 Q26 86 26 78 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round"/>
    <path d="M26 78 Q26 86 18 90 Q26 94 26 102 Q26 94 34 90 Q26 86 26 78 Z" fill="#38BDF8"/>
  </g>
</svg>`
  },
  {
    file: 'cool-puppy.svg',
    title: 'Cún Corgi ngầu',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <filter id="corgiGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#D97706" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#corgiGlow)">
    <circle cx="60" cy="65" r="42" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8"/>
    <!-- Ears -->
    <path d="M30 40 L16 12 C30 18 42 30 42 38 Z" fill="#F59E0B" stroke="#FFFFFF" stroke-width="4"/>
    <path d="M90 40 L104 12 C90 18 78 30 78 38 Z" fill="#F59E0B" stroke="#FFFFFF" stroke-width="4"/>
    <!-- Face -->
    <circle cx="60" cy="65" r="38" fill="#FBBF24"/>
    <path d="M46 65 C46 50 74 50 74 65 C74 85 46 85 46 65 Z" fill="#FFFFFF"/>
    <!-- Sunglasses -->
    <rect x="28" y="52" width="28" height="18" rx="6" fill="#1E1B4B"/>
    <rect x="64" y="52" width="28" height="18" rx="6" fill="#1E1B4B"/>
    <rect x="54" y="58" width="12" height="4" fill="#1E1B4B"/>
    <!-- Glasses Glint -->
    <line x1="32" y1="56" x2="42" y2="66" stroke="#A58CF4" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="68" y1="56" x2="78" y2="66" stroke="#A58CF4" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Nose & Mouth -->
    <ellipse cx="60" cy="74" rx="5" ry="3.5" fill="#1E1B4B"/>
    <path d="M60 77 Q60 84 54 84 M60 77 Q60 84 66 84" stroke="#1E1B4B" stroke-width="2" fill="none"/>
  </g>
</svg>`
  },
  {
    file: 'crescent-moon.svg',
    title: 'Trăng khuyết mơ màng',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="moonGrad" x1="20" y1="20" x2="90" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="60%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
    <filter id="moonGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#433075" flood-opacity="0.25"/>
    </filter>
  </defs>
  <g filter="url(#moonGlow)">
    <!-- White Die Cut Backing -->
    <path d="M72 18 C42 18 20 40 20 70 C20 95 40 108 65 108 C78 108 92 102 98 94 C70 92 52 70 52 46 C52 32 60 22 72 18 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="9" stroke-linejoin="round"/>
    <!-- Moon Body -->
    <path d="M72 18 C42 18 20 40 20 70 C20 95 40 108 65 108 C78 108 92 102 98 94 C70 92 52 70 52 46 C52 32 60 22 72 18 Z" fill="url(#moonGrad)"/>
    <!-- Sleeping Face -->
    <path d="M42 58 Q46 64 50 58" stroke="#78350F" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <circle cx="38" cy="66" r="3.5" fill="#FB7185" opacity="0.6"/>
    <!-- Hanging Star -->
    <path d="M88 38 L90 46 L98 48 L90 50 L88 58 L86 50 L78 48 L86 46 Z" fill="#A58CF4"/>
  </g>
</svg>`
  },
  {
    file: 'lucky-clover.svg',
    title: 'Cỏ 4 lá may mắn',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="cloverGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4ADE80"/>
      <stop offset="60%" stop-color="#22C55E"/>
      <stop offset="100%" stop-color="#15803D"/>
    </linearGradient>
    <filter id="cloverGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#15803D" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#cloverGlow)">
    <circle cx="60" cy="55" r="40" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8"/>
    <!-- 4 Leaves -->
    <g transform="translate(60,55)">
      <path d="M0 0 C-18 -22 -6 -35 0 -22 C6 -35 18 -22 0 0 Z" fill="url(#cloverGrad)"/>
      <path d="M0 0 C-18 -22 -6 -35 0 -22 C6 -35 18 -22 0 0 Z" fill="url(#cloverGrad)" transform="rotate(90)"/>
      <path d="M0 0 C-18 -22 -6 -35 0 -22 C6 -35 18 -22 0 0 Z" fill="url(#cloverGrad)" transform="rotate(180)"/>
      <path d="M0 0 C-18 -22 -6 -35 0 -22 C6 -35 18 -22 0 0 Z" fill="url(#cloverGrad)" transform="rotate(270)"/>
    </g>
    <!-- Stem -->
    <path d="M60 55 Q56 95 38 105" stroke="#15803D" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="56" cy="46" r="3" fill="#FFFFFF" opacity="0.6"/>
  </g>
</svg>`
  },
  {
    file: 'cyber-flame.svg',
    title: 'Ngọn lửa Cyber',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="flameGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F43F5E"/>
      <stop offset="50%" stop-color="#A58CF4"/>
      <stop offset="100%" stop-color="#433075"/>
    </linearGradient>
    <filter id="flameGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#433075" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g filter="url(#flameGlow)">
    <path d="M60 14 C60 14 74 38 74 54 C74 62 82 66 84 56 C88 80 75 106 55 106 C35 106 24 88 28 68 C30 58 40 50 42 40 C42 28 60 14 60 14 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="9" stroke-linejoin="round"/>
    <path d="M60 16 C60 16 74 39 74 54 C74 62 82 66 84 56 C88 80 75 104 55 104 C35 104 26 87 29 68 C31 58 41 50 43 40 C43 29 60 16 60 16 Z" fill="url(#flameGrad)"/>
    <!-- Inner Core -->
    <path d="M56 58 C56 58 64 70 64 78 C64 88 56 94 48 94 C42 94 38 88 40 82 C42 76 56 58 56 58 Z" fill="#FEF08A"/>
  </g>
</svg>`
  },
  {
    file: 'coquette-bow.svg',
    title: 'Ruy băng Coquette',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="bowGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FCE7F3"/>
      <stop offset="60%" stop-color="#F472B6"/>
      <stop offset="100%" stop-color="#DB2777"/>
    </linearGradient>
    <filter id="bowGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#DB2777" flood-opacity="0.25"/>
    </filter>
  </defs>
  <g filter="url(#bowGlow)">
    <!-- White Die Cut Backing -->
    <path d="M60 52 C45 32 15 35 15 55 C15 75 48 65 60 62 C72 65 105 75 105 55 C105 35 75 32 60 52 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round"/>
    <path d="M54 62 L32 102 L48 98 L58 70 Z M66 62 L88 102 L72 98 L62 70 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="6"/>
    <!-- Wings -->
    <path d="M60 54 C46 36 18 38 18 56 C18 73 48 64 60 60 Z" fill="url(#bowGrad)"/>
    <path d="M60 54 C74 36 102 38 102 56 C102 73 72 64 60 60 Z" fill="url(#bowGrad)"/>
    <!-- Tails -->
    <path d="M54 60 L34 100 L48 96 L58 68 Z" fill="url(#bowGrad)"/>
    <path d="M66 60 L86 100 L72 96 L62 68 Z" fill="url(#bowGrad)"/>
    <!-- Knot -->
    <circle cx="60" cy="58" r="8" fill="#F43F5E"/>
    <circle cx="58" cy="56" r="3" fill="#FFFFFF" opacity="0.6"/>
  </g>
</svg>`
  },
  {
    file: 'happy-sunflower.svg',
    title: 'Hoa hướng dương',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <filter id="sfGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#D97706" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#sfGlow)">
    <circle cx="60" cy="60" r="46" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8"/>
    <!-- Petals Ring -->
    <g transform="translate(60,60)">
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(30)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(60)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(90)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(120)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(150)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(180)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(210)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(240)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(270)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(300)"/>
      <path d="M0 -22 C-10 -38 0 -50 0 -50 C0 -50 10 -38 0 -22 Z" fill="#FBBF24" transform="rotate(330)"/>
    </g>
    <!-- Center Disk -->
    <circle cx="60" cy="60" r="22" fill="#78350F"/>
    <!-- Face -->
    <circle cx="53" cy="56" r="3" fill="#FFFFFF"/>
    <circle cx="67" cy="56" r="3" fill="#FFFFFF"/>
    <path d="M52 64 Q60 72 68 64" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  </g>
</svg>`
  },
  {
    file: 'dreamy-cloud.svg',
    title: 'Mây hồng bồng bềnh',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="cloudGrad" x1="20" y1="30" x2="100" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="70%" stop-color="#FCE7F3"/>
      <stop offset="100%" stop-color="#E9D5FF"/>
    </linearGradient>
    <filter id="cloudGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#A58CF4" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#cloudGlow)">
    <path d="M35 78 L85 78 A20 20 0 0 0 85 45 A25 25 0 0 0 42 42 A20 20 0 0 0 35 78 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round"/>
    <path d="M35 76 L85 76 A18 18 0 0 0 85 46 A23 23 0 0 0 43 43 A18 18 0 0 0 35 76 Z" fill="url(#cloudGrad)"/>
    <!-- Cute Blushing Face -->
    <ellipse cx="50" cy="58" rx="2" ry="3" fill="#433075"/>
    <ellipse cx="70" cy="58" rx="2" ry="3" fill="#433075"/>
    <path d="M57 63 Q60 66 63 63" stroke="#433075" stroke-width="2" stroke-linecap="round" fill="none"/>
    <circle cx="44" cy="63" r="3.5" fill="#F43F5E" opacity="0.5"/>
    <circle cx="76" cy="63" r="3.5" fill="#F43F5E" opacity="0.5"/>
  </g>
</svg>`
  },
  {
    file: 'shooting-star.svg',
    title: 'Sao băng vút bay',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="tailGrad" x1="10" y1="100" x2="80" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A58CF4" stop-opacity="0"/>
      <stop offset="50%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#FDE047"/>
    </linearGradient>
    <filter id="ssGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#38BDF8" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#ssGlow)">
    <path d="M15 105 L80 40 L70 30 L10 90 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="6"/>
    <!-- Rainbow Comet Tail -->
    <path d="M18 102 L80 40 L70 30 L12 88 Z" fill="url(#tailGrad)"/>
    <!-- Head Star -->
    <g transform="translate(85,35) scale(0.9)">
      <path d="M0 -24 L7 -7 L24 0 L7 7 L0 24 L-7 7 L-24 0 L-7 -7 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="6"/>
      <path d="M0 -24 L7 -7 L24 0 L7 7 L0 24 L-7 7 L-24 0 L-7 -7 Z" fill="#FBBF24"/>
      <circle cx="0" cy="0" r="5" fill="#FFFFFF"/>
    </g>
  </g>
</svg>`
  },
  {
    file: 'neon-lightning.svg',
    title: 'Tia sét Neon',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="boltGrad" x1="30" y1="10" x2="80" y2="110" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#FACC15"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
    <filter id="boltGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#CA8A04" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g filter="url(#boltGlow)">
    <path d="M68 10 L30 64 L58 64 L48 110 L92 48 L64 48 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="9" stroke-linejoin="round"/>
    <path d="M68 12 L32 64 L60 64 L50 108 L90 50 L64 50 Z" fill="url(#boltGrad)"/>
    <path d="M62 25 L45 58 L62 58 Z" fill="#FFFFFF" opacity="0.6"/>
  </g>
</svg>`
  },
  {
    file: 'kawaii-avocado.svg',
    title: 'Quả bơ Kawaii',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <filter id="avoGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#15803D" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#avoGlow)">
    <!-- Die Cut Outer Skin -->
    <path d="M60 16 C40 16 34 35 34 50 C34 76 42 104 60 104 C78 104 86 76 86 50 C86 35 80 16 60 16 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round"/>
    <path d="M60 18 C42 18 36 36 36 51 C36 76 44 102 60 102 C76 102 84 76 84 51 C84 36 78 18 60 18 Z" fill="#15803D"/>
    <!-- Flesh -->
    <path d="M60 25 C46 25 42 40 42 54 C42 74 48 96 60 96 C72 96 78 74 78 54 C78 40 74 25 60 25 Z" fill="#BBF7D0"/>
    <!-- Seed -->
    <circle cx="60" cy="70" r="16" fill="#854D0E"/>
    <!-- Seed Face -->
    <circle cx="55" cy="68" r="2.5" fill="#FFFFFF"/>
    <circle cx="65" cy="68" r="2.5" fill="#FFFFFF"/>
    <path d="M57 74 Q60 77 63 74" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <circle cx="51" cy="72" r="2" fill="#F43F5E" opacity="0.6"/>
    <circle cx="69" cy="72" r="2" fill="#F43F5E" opacity="0.6"/>
  </g>
</svg>`
  },
  {
    file: 'twin-cherries.svg',
    title: 'Cặp cherry bóng',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="chGrad" x1="20" y1="40" x2="70" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FB7185"/>
      <stop offset="60%" stop-color="#E11D48"/>
      <stop offset="100%" stop-color="#881337"/>
    </linearGradient>
    <filter id="chGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#881337" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#chGlow)">
    <circle cx="40" cy="80" r="24" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="6"/>
    <circle cx="80" cy="72" r="24" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="6"/>
    <path d="M40 76 C50 40 68 20 70 16 M80 68 C76 40 68 20 70 16" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
    <path d="M40 76 C50 40 68 20 70 16 M80 68 C76 40 68 20 70 16" stroke="#15803D" stroke-width="4" stroke-linecap="round"/>
    <!-- Leaf -->
    <path d="M70 16 C85 10 95 24 80 26 Z" fill="#22C55E"/>
    <!-- Cherries -->
    <circle cx="40" cy="80" r="20" fill="url(#chGrad)"/>
    <circle cx="80" cy="72" r="20" fill="url(#chGrad)"/>
    <ellipse cx="34" cy="74" rx="4" ry="7" fill="#FFFFFF" opacity="0.65" transform="rotate(-25 34 74)"/>
    <ellipse cx="74" cy="66" rx="4" ry="7" fill="#FFFFFF" opacity="0.65" transform="rotate(-25 74 66)"/>
  </g>
</svg>`
  },
  {
    file: 'artist-palette.svg',
    title: 'Bảng màu nghệ thuật',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <filter id="palGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#78350F" flood-opacity="0.25"/>
    </filter>
  </defs>
  <g filter="url(#palGlow)">
    <path d="M60 16 C25 16 14 45 20 75 C24 95 55 105 75 95 C88 88 84 76 96 74 C106 72 108 55 102 38 C96 22 80 16 60 16 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round"/>
    <path d="M60 18 C27 18 16 46 22 74 C26 93 55 102 74 93 C86 86 82 75 95 73 C104 71 106 55 100 39 C95 24 79 18 60 18 Z" fill="#FDE68A"/>
    <!-- Thumb hole -->
    <circle cx="78" cy="78" r="8" fill="#FFFFFF"/>
    <!-- Paint Blobs -->
    <circle cx="36" cy="38" r="7" fill="#EF4444"/>
    <circle cx="56" cy="30" r="7" fill="#F59E0B"/>
    <circle cx="78" cy="34" r="7" fill="#3B82F6"/>
    <circle cx="34" cy="62" r="7" fill="#8B5CF6"/>
    <circle cx="48" cy="80" r="7" fill="#10B981"/>
  </g>
</svg>`
  },
  {
    file: 'saturn-cosmos.svg',
    title: 'Sao Thổ Cosmos',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="satGrad" x1="30" y1="30" x2="90" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#433075"/>
    </linearGradient>
    <filter id="satGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#433075" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#satGlow)">
    <circle cx="60" cy="60" r="34" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8"/>
    <ellipse cx="60" cy="60" rx="55" ry="16" fill="none" stroke="#FFFFFF" stroke-width="12" transform="rotate(-20 60 60)"/>
    <!-- Planet Base -->
    <circle cx="60" cy="60" r="30" fill="url(#satGrad)"/>
    <!-- Ring -->
    <ellipse cx="60" cy="60" rx="52" ry="14" fill="none" stroke="#FDE047" stroke-width="6" transform="rotate(-20 60 60)"/>
    <!-- Twinkle Stars -->
    <path d="M25 25 L27 31 L33 33 L27 35 L25 41 L23 35 L17 33 L23 31 Z" fill="#FFFFFF"/>
    <path d="M95 85 L96 89 L100 90 L96 91 L95 95 L94 91 L90 90 L94 89 Z" fill="#FDE047"/>
  </g>
</svg>`
  },
  {
    file: 'magical-unicorn.svg',
    title: 'Kỳ lân cầu vồng',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <filter id="uniGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#A855F7" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#uniGlow)">
    <circle cx="60" cy="60" r="44" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8"/>
    <!-- Golden Horn -->
    <path d="M68 25 L76 8 L60 20 Z" fill="#FACC15" stroke="#FFFFFF" stroke-width="2"/>
    <!-- Head -->
    <path d="M35 85 C35 60 45 42 65 42 C80 42 85 55 85 75 C85 92 65 98 48 95 Z" fill="#F8FAFC"/>
    <!-- Rainbow Mane -->
    <path d="M42 45 C32 40 25 55 35 65 Z" fill="#F43F5E"/>
    <path d="M34 60 C24 58 20 72 32 78 Z" fill="#38BDF8"/>
    <path d="M30 75 C20 74 18 88 32 92 Z" fill="#FACC15"/>
    <!-- Eye & Muzzle -->
    <path d="M70 65 Q74 70 78 65" stroke="#433075" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <circle cx="78" cy="74" r="2" fill="#F43F5E"/>
  </g>
</svg>`
  },
  {
    file: 'party-popper.svg',
    title: 'Pháo giấy Party',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="popGrad" x1="20" y1="60" x2="70" y2="110" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
    <filter id="popGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#EF4444" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#popGlow)">
    <path d="M22 102 L20 72 L64 54 L68 92 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round"/>
    <!-- Cone -->
    <path d="M24 100 L22 74 L62 56 L66 90 Z" fill="url(#popGrad)"/>
    <path d="M22 74 L62 56" stroke="#FEF08A" stroke-width="4"/>
    <!-- Confetti Stars & Ribbons -->
    <circle cx="82" cy="40" r="5" fill="#3B82F6"/>
    <circle cx="95" cy="55" r="4" fill="#10B981"/>
    <circle cx="70" cy="25" r="4" fill="#EC4899"/>
    <path d="M85 20 Q95 28 88 36" stroke="#F59E0B" stroke-width="3" fill="none"/>
    <path d="M60 16 Q72 12 70 24" stroke="#8B5CF6" stroke-width="3" fill="none"/>
  </g>
</svg>`
  },
  {
    file: 'iced-coffee.svg',
    title: 'Trà sữa Cà phê',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="teaGrad" x1="30" y1="40" x2="80" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="60%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
    <filter id="teaGlow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#78350F" flood-opacity="0.25"/>
    </filter>
  </defs>
  <g filter="url(#teaGlow)">
    <path d="M40 38 L32 98 C32 104 42 108 60 108 C78 108 88 104 88 98 L80 38 Z"
          fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round"/>
    <!-- Cup Body -->
    <path d="M41 40 L34 96 C34 102 44 106 60 106 C76 106 86 102 86 96 L79 40 Z" fill="url(#teaGrad)"/>
    <!-- Tapioca Pearls / Boba -->
    <circle cx="48" cy="94" r="4.5" fill="#1E1B4B"/>
    <circle cx="62" cy="96" r="4.5" fill="#1E1B4B"/>
    <circle cx="74" cy="92" r="4.5" fill="#1E1B4B"/>
    <circle cx="56" cy="86" r="4.5" fill="#1E1B4B"/>
    <!-- Lid & Straw -->
    <rect x="36" y="32" width="48" height="8" rx="4" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2"/>
    <rect x="38" y="33" width="44" height="6" rx="3" fill="#E2E8F0"/>
    <path d="M60 32 L70 12" stroke="#F43F5E" stroke-width="6" stroke-linecap="round"/>
    <!-- Heart on Cup -->
    <path d="M60 70 C56 64 50 64 50 70 C50 76 60 82 60 82 C60 82 70 76 70 70 C70 64 64 64 60 70 Z" fill="#FFFFFF"/>
  </g>
</svg>`
  }
];

// Write all stickers
for (const stk of stickerItems) {
  writeSvg(stickersDir, stk.file, stk.svg);
}

console.log('\\nAll assets successfully generated in public/assets/!');
