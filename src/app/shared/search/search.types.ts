/** Kinds of things the site-wide search can find. Orders are not listed (only order-code shortcut). */
export type SearchDocType = 'product' | 'template' | 'help';

/** One searchable thing, provided by the function that owns it (Shop, Design Studio, Order Tracking…). */
export interface SearchDoc {
  readonly id: string;
  readonly type: SearchDocType;
  readonly title: string;
  /** Second line: collection, style, creator… */
  readonly subtitle?: string;
  /** Extra searchable words: tags, hashtags, description. */
  readonly text?: string;
  /** Picture shown as a phone case (never cropped to a square). */
  readonly image?: string;
  /** Template background (CSS gradient or color) drawn behind the image. */
  readonly background?: string;
  readonly link: string;
  readonly queryParams?: Readonly<Record<string, string>>;
  readonly fragment?: string;
  readonly price?: number;
  readonly badge?: string;
  /** Popularity bonus (best seller, trending…), 0–3. */
  readonly boost?: number;
  readonly outOfStock?: boolean;
  /** Average color for "search by image". */
  readonly color?: readonly [number, number, number];
  /** Style label used as a results filter (e.g. "Pastel", "Dễ thương"). */
  readonly style?: string;
}

export interface SearchHit {
  readonly doc: SearchDoc;
  readonly score: number;
  /** Concept labels that matched (shown as "Vì hợp với: …" in suggestions). */
  readonly reasons: readonly string[];
}
