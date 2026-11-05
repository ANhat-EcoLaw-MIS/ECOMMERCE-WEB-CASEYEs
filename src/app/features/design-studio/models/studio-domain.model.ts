export interface Brand {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoUrl?: string;
  readonly displayOrder: number;
  readonly isActive: boolean;
}

export interface CameraCutout {
  /** X coordinate percentage relative to case width (e.g. 8%) */
  readonly xPercent: number;
  /** Y coordinate percentage relative to case height (e.g. 3.5%) */
  readonly yPercent: number;
  /** Width percentage relative to case width (e.g. 38%) */
  readonly widthPercent: number;
  /** Height percentage relative to case height (e.g. 28%) */
  readonly heightPercent: number;
  readonly borderRadius: number;
  readonly lensCount: number;
}

export interface SafeZoneMask {
  readonly maskId: string;
  readonly modelId: string;
  readonly maskPathSvg?: string;
  readonly cameraCutout: CameraCutout;
  /** Safe margin in millimeters from the physical edges */
  readonly safeMarginMm: number;
  /** Margin percentage from edges for canvas boundary clamp */
  readonly safeMarginPercent: number;
  readonly version: number;
}

export type CaseType = 'snap' | 'tough' | 'clear' | 'magsafe';

export interface BaseSKU {
  readonly skuId: string;
  readonly skuCode: string;
  readonly modelId: string;
  readonly caseType: CaseType;
  readonly colorName: string;
  readonly colorHex: string;
  readonly mockupImageUrl?: string;
  readonly price: number;
  readonly stockQty: number;
  readonly isAvailable: boolean;
}

export interface PhoneModel {
  readonly id: string;
  readonly brandId: string;
  readonly brandName: string;
  readonly name: string;
  readonly slug: string;
  readonly releaseYear: number;
  readonly printWidthMm: number;
  readonly printHeightMm: number;
  readonly minPrintDpi: number; // default: 150
  readonly model3dUrl?: string;
  readonly specs?: readonly string[];
  readonly safeZoneMask: SafeZoneMask;
  readonly skus: readonly BaseSKU[];
  readonly isActive: boolean;
}

export interface TemplateStyle {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly displayOrder: number;
}

export interface Template {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly authorName: string;
  readonly thumbnailUrl: string;
  readonly previewUrl?: string;
  readonly styles: readonly string[]; // slugs of TemplateStyle
  readonly layoutJson: string; // Serialized CanvasLayer structure
  readonly isEditable: boolean; // FR-DES-10: Only editable templates can be opened in canvas
  readonly isActive: boolean;
  readonly trendingScore: number;
  readonly createdAt: string;
}
