import type { DeviceBrand, DeviceOption, StylePreset } from './models/onboarding.model';

export const STYLE_PRESETS = [
  {
    key: 'y2k',
    label: 'Y2K Cyberpunk & Chrome',
    description: 'Kim loại lỏng, hologram & typography.',
    icon: '⚡',
    iconClass:
      'bg-gradient-to-tr from-purple-900 via-indigo-800 to-fuchsia-600 text-white',
    previewBadge: 'Y2K CYBER',
    previewTitleLines: ['FUTURE', 'PUNK'],
    canvasBackgroundClass:
      'w-full h-full rounded-[36px] overflow-hidden relative flex flex-col justify-between p-5 transition-all duration-700 bg-gradient-to-b from-brand-900 via-brand-800 to-brand-900',
    titleGradientClass:
      'font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-100 to-cyan-200 leading-tight',
    glowClass:
      'absolute inset-0 bg-brand-400/40 rounded-[50px] blur-2xl -z-10 scale-95 transition-colors duration-700',
  },
  {
    key: 'minimal',
    label: 'Minimalist Typo & Mono',
    description: 'Tạp chí Thụy Sĩ, sans-serif đơn sắc.',
    icon: 'Aa',
    iconClass: 'bg-zinc-900 font-mono text-base font-bold text-white',
    previewBadge: 'SWISS EDITORIAL',
    previewTitleLines: ['LESS IS', 'MORE.'],
    canvasBackgroundClass:
      'w-full h-full rounded-[36px] overflow-hidden relative flex flex-col justify-between p-5 transition-all duration-700 bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-950',
    titleGradientClass:
      'font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 leading-tight',
    glowClass:
      'absolute inset-0 bg-zinc-400/30 rounded-[50px] blur-2xl -z-10 scale-95 transition-colors duration-700',
  },
  {
    key: 'grunge',
    label: 'Streetwear & Grunge',
    description: 'Xích kim loại, distressed, barcode.',
    icon: '🖤',
    iconClass: 'bg-gradient-to-br from-zinc-800 to-black text-white',
    previewBadge: 'RAW GRUNGE',
    previewTitleLines: ['ACID', 'DISTORT'],
    canvasBackgroundClass:
      'w-full h-full rounded-[36px] overflow-hidden relative flex flex-col justify-between p-5 transition-all duration-700 bg-gradient-to-b from-stone-900 via-stone-800 to-stone-950',
    titleGradientClass:
      'font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-stone-200 to-zinc-400 leading-tight',
    glowClass:
      'absolute inset-0 bg-stone-500/30 rounded-[50px] blur-2xl -z-10 scale-95 transition-colors duration-700',
  },
  {
    key: 'anime',
    label: 'Anime Manga Art',
    description: 'Manga 90s, mecha, screentone.',
    icon: '🎨',
    iconClass:
      'bg-gradient-to-br from-purple-700 via-pink-600 to-rose-500 text-white',
    previewBadge: 'MECHA 1999',
    previewTitleLines: ['TOKYO', 'DREAM'],
    canvasBackgroundClass:
      'w-full h-full rounded-[36px] overflow-hidden relative flex flex-col justify-between p-5 transition-all duration-700 bg-gradient-to-b from-purple-950 via-purple-900 to-indigo-950',
    titleGradientClass:
      'font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-200 to-cyan-300 leading-tight',
    glowClass:
      'absolute inset-0 bg-pink-500/30 rounded-[50px] blur-2xl -z-10 scale-95 transition-colors duration-700',
  },
  {
    key: 'pastel',
    label: 'Pastel & 3D Clay',
    description: 'Puffy 3D marshmallow mềm mại.',
    icon: '🌸',
    iconClass: 'bg-gradient-to-tr from-rose-200 via-purple-200 to-sky-200 text-purple-900',
    previewBadge: 'PUFFY 3D',
    previewTitleLines: ['CLOUD', 'SOFT'],
    canvasBackgroundClass:
      'w-full h-full rounded-[36px] overflow-hidden relative flex flex-col justify-between p-5 transition-all duration-700 bg-gradient-to-b from-rose-100 via-purple-100 to-indigo-100',
    titleGradientClass:
      'font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-800 via-pink-700 to-rose-900 leading-tight',
    glowClass:
      'absolute inset-0 bg-pink-300/40 rounded-[50px] blur-2xl -z-10 scale-95 transition-colors duration-700',
  },
  {
    key: 'gorpcore',
    label: 'Gorpcore Techwear',
    description: 'Tone rêu rừng, tọa độ GPS outdoor.',
    icon: '🧭',
    iconClass: 'bg-gradient-to-br from-emerald-800 to-teal-950 text-white',
    previewBadge: 'TACTICAL GPS',
    previewTitleLines: ['EXPEDITION', 'NORTH'],
    canvasBackgroundClass:
      'w-full h-full rounded-[36px] overflow-hidden relative flex flex-col justify-between p-5 transition-all duration-700 bg-gradient-to-b from-emerald-900 via-teal-700 to-teal-950',
    titleGradientClass:
      'font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-100 to-cyan-200 leading-tight',
    glowClass:
      'absolute inset-0 bg-teal-400/30 rounded-[50px] blur-2xl -z-10 scale-95 transition-colors duration-700',
  },
] as const satisfies readonly StylePreset[];

export const DEVICE_CATALOG: Record<DeviceBrand, readonly DeviceOption[]> = {
  apple: [
    { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', spec: 'Màn hình 6.9"', sub: 'Viền siêu mỏng' },
    { id: 'iphone-16-pro', name: 'iPhone 16 Pro', spec: 'Màn hình 6.3"', sub: 'Vừa tay hoàn hảo' },
    { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', spec: 'Màn hình 6.7"', sub: 'Phổ biến nhất ★' },
    { id: 'iphone-15-pro', name: 'iPhone 15 Pro', spec: 'Màn hình 6.1"', sub: 'Gọn gàng' },
    { id: 'iphone-15-plus', name: 'iPhone 15 Plus', spec: 'Màn hình 6.7"', sub: 'Camera kép' },
    { id: 'iphone-14-series', name: 'iPhone 14 Series', spec: 'Tương thích 4 mẫu', sub: 'Khớp 100%' },
  ],
  samsung: [
    { id: 'galaxy-s24-ultra', name: 'Galaxy S24 Ultra', spec: 'Khung Titan phẳng', sub: 'Bút S-Pen' },
    { id: 'galaxy-s24-plus', name: 'Galaxy S24 Plus', spec: 'Màn hình 6.7"', sub: 'Pin lớn' },
    { id: 'galaxy-s24', name: 'Galaxy S24', spec: 'Màn hình 6.2"', sub: 'Nhỏ gọn' },
    { id: 'galaxy-z-flip-5-6', name: 'Galaxy Z Flip 5/6', spec: 'Ốp gập 2 mảnh', sub: 'Thời trang' },
    { id: 'galaxy-s23-ultra', name: 'Galaxy S23 Ultra', spec: 'Cụm 4 ống kính', sub: 'Bán chạy' },
    { id: 'galaxy-a55-5g', name: 'Galaxy A55 5G', spec: 'Viền kim loại', sub: 'Phổ thông' },
  ],
  xiaomi: [
    { id: 'xiaomi-14-ultra', name: 'Xiaomi 14 Ultra', spec: 'Ống kính Leica tròn', sub: 'Chuyên nhiếp ảnh' },
    { id: 'xiaomi-14-pro', name: 'Xiaomi 14 Pro', spec: 'Viền titan cao cấp', sub: 'Màn 2K' },
    { id: 'xiaomi-14', name: 'Xiaomi 14', spec: 'Kích thước 6.36"', sub: 'Vừa vặn' },
    { id: 'redmi-note-13-pro-plus', name: 'Redmi Note 13 Pro+', spec: 'Màn hình cong', sub: 'Kháng nước' },
    { id: 'xiaomi-13t-pro', name: 'Xiaomi 13T Pro', spec: 'Cụm camera vuông', sub: 'Hiệu năng' },
    { id: 'poco-f6-pro', name: 'POCO F6 Pro', spec: 'Mặt lưng carbon', sub: 'Gaming' },
  ],
};
