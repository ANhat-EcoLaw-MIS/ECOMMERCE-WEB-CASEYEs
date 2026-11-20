import type { DeviceBrand, DeviceOption, StylePreset } from './models/onboarding.model';
import { DEVICES, availableSkus, type PhoneModel } from '../../../shared/devices/devices';

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

const BRAND_KEYS: Readonly<Record<string, DeviceBrand>> = {
  'brand-apple': 'apple',
  'brand-samsung': 'samsung',
  'brand-xiaomi': 'xiaomi',
};

/** "Màn hình 6.7" Super Retina XDR" → "Màn hình 6.7"". */
const screenSpec = (model: PhoneModel): string =>
  model.specs?.find((s) => s.startsWith('Màn hình'))?.match(/^Màn hình [\d.,]+"/)?.[0] ?? model.brandName;

function toDeviceOption(model: PhoneModel): DeviceOption {
  const colours = new Set(availableSkus(model).map((s) => s.colorName)).size;
  return {
    id: model.id,
    name: model.name,
    spec: screenSpec(model),
    sub: model.has3dModel ? `${colours} màu ốp · xem 3D` : `${colours} màu ốp`,
  };
}

/**
 * Phone models offered in onboarding: exactly the devices the Shop and Design Studio sell
 * (PHONE_MODELS_DATA = supabase/seed/catalog.json = active rows of `phone_models`), grouped by brand.
 */
export const DEVICE_CATALOG: Readonly<Record<DeviceBrand, readonly DeviceOption[]>> = {
  apple: DEVICES.filter((m) => BRAND_KEYS[m.brandId] === 'apple').map(toDeviceOption),
  samsung: DEVICES.filter((m) => BRAND_KEYS[m.brandId] === 'samsung').map(toDeviceOption),
  xiaomi: DEVICES.filter((m) => BRAND_KEYS[m.brandId] === 'xiaomi').map(toDeviceOption),
};

/** Every device in DEVICE_CATALOG, in catalog order. */
export const ALL_DEVICE_OPTIONS: readonly DeviceOption[] = Object.values(DEVICE_CATALOG).flat();

/** Profiles store the device name (`profiles.device_type`); older rows may hold an id. */
export function findDeviceOption(value: string | null | undefined): DeviceOption | undefined {
  return value ? ALL_DEVICE_OPTIONS.find((d) => d.id === value || d.name === value) : undefined;
}
