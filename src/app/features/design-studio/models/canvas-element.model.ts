export type ElementType = 'text' | 'sticker' | 'image' | 'background';

export interface BaseDesignElement {
  readonly id: string;
  readonly type: ElementType;
  readonly zIndex: number;
  /** Percentage position (0 - 100) relative to printable case area */
  readonly x: number;
  readonly y: number;
  /** Percentage dimension (0 - 100) relative to case dimensions */
  readonly width: number;
  readonly height: number;
  /** Rotation angle in degrees (0 - 360) */
  readonly rotation: number;
  /** Opacity from 0.0 to 1.0 */
  readonly opacity: number;
  readonly isLocked: boolean;
}

export interface TextElement extends BaseDesignElement {
  readonly type: 'text';
  readonly content: string;
  readonly fontFamily: string;
  readonly fontSize: number; // pt or px reference
  readonly textColor: string; // Hex or CSS color
  readonly textAlign: 'left' | 'center' | 'right';
  readonly fontWeight?: 'normal' | 'bold' | '800';
  readonly isCurved?: boolean;
}

export interface StickerElement extends BaseDesignElement {
  readonly type: 'sticker';
  readonly stickerId: string;
  readonly category: string;
  readonly assetUrl: string;
  readonly name: string;
}

export interface ImageElement extends BaseDesignElement {
  readonly type: 'image';
  readonly storageUrl: string;
  readonly fileType: 'image/png' | 'image/jpeg';
  readonly fileSizeBytes: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly dpi: number;
  readonly isLowResAcknowledged: boolean;
  readonly consentRecordId?: string;
}

export interface BackgroundElement extends BaseDesignElement {
  readonly type: 'background';
  readonly fillColor: string;
  readonly gradient?: string;
  readonly patternUrl?: string;
}

export type CanvasLayer = TextElement | StickerElement | ImageElement | BackgroundElement;
