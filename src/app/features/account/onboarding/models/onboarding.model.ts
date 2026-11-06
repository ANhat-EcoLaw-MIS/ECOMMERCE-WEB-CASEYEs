export type { OnboardingPreferences } from '../../models/account.model';

export type OnboardingStep = 1 | 2 | 3;
export type DeviceBrand = 'apple' | 'samsung' | 'xiaomi';
export type StyleKey = 'y2k' | 'minimal' | 'grunge' | 'anime' | 'pastel' | 'gorpcore';

export interface DeviceOption {
  id: string;
  name: string;
  spec: string;
  sub: string;
}

export interface StylePreset {
  key: StyleKey;
  label: string;
  description: string;
  icon: string;
  iconClass: string;
  previewBadge: string;
  previewTitleLines: readonly [string, string];
  canvasBackgroundClass: string;
  titleGradientClass: string;
  glowClass: string;
}

export interface MarqueeCase {
  id: string;
  badge: string;
  titleLines: readonly [string, string];
  subtitle: string;
  footerLabel: string;
  footerDetail: string;
  styleKey: StyleKey;
  caseClass: string;
  artworkClass: string;
  cameraClass: string;
  badgeClass: string;
  titleClass: string;
  subtitleClass: string;
  footerClass: string;
}
