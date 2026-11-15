import { normalizeVi } from './normalize-vi';

/**
 * Small Vietnamese/English meaning dictionary for phone cases. A "concept" groups words that mean
 * the same thing to a shopper ("dẻo" = TPU, "mèo" = cat = kitten). Used to expand searches and to
 * read a free-text description ("ốp tím pastel có mèo tặng bạn gái").
 * Words are written naturally; they are normalized (no accents) when matched.
 */
export type ConceptGroup = 'color' | 'style' | 'theme' | 'occasion' | 'material';

export interface Concept {
  readonly id: string;
  readonly group: ConceptGroup;
  /** Shown to the customer in "Vì hợp với: …". */
  readonly label: string;
  readonly words: readonly string[];
}

export const CONCEPTS: readonly Concept[] = [
  // colors
  { id: 'tim', group: 'color', label: 'tím', words: ['tím', 'purple', 'lavender', 'lilac', 'violet', 'oải hương'] },
  { id: 'hong', group: 'color', label: 'hồng', words: ['hồng', 'pink', 'rose', 'sakura'] },
  { id: 'den', group: 'color', label: 'đen', words: ['đen', 'black', 'noir', 'dark', 'tối màu', 'midnight'] },
  { id: 'trang', group: 'color', label: 'trắng', words: ['trắng', 'white', 'trong suốt', 'clear'] },
  { id: 'xanh', group: 'color', label: 'xanh', words: ['xanh', 'blue', 'green', 'mint', 'matcha', 'biển', 'bầu trời'] },
  { id: 'vang', group: 'color', label: 'vàng', words: ['vàng', 'yellow', 'gold', 'nắng', 'sunset', 'hoàng hôn'] },
  { id: 'pastel', group: 'color', label: 'pastel', words: ['pastel', 'nhẹ nhàng', 'dịu', 'mộng mơ', 'dreamy', 'soft'] },
  // styles
  { id: 'toi-gian', group: 'style', label: 'tối giản', words: ['tối giản', 'minimal', 'minimalist', 'đơn giản', 'basic', 'trơn'] },
  { id: 'cute', group: 'style', label: 'dễ thương', words: ['dễ thương', 'cute', 'kawaii', 'chibi', 'đáng yêu', 'xinh'] },
  { id: 'y2k', group: 'style', label: 'Y2K', words: ['y2k', 'chrome', 'hologram', 'cyberpunk', 'neon', 'holographic'] },
  { id: 'aesthetic', group: 'style', label: 'aesthetic', words: ['aesthetic', 'thẩm mỹ', 'sang', 'tinh tế', 'chill', 'aura'] },
  { id: 'vintage', group: 'style', label: 'vintage', words: ['vintage', 'retro', 'cổ điển', 'hoài niệm', 'cottagecore'] },
  { id: 'ca-tinh', group: 'style', label: 'cá tính', words: ['cá tính', 'ngầu', 'cool', 'streetwear', 'bụi', 'chất'] },
  { id: 'nghe-thuat', group: 'style', label: 'nghệ thuật', words: ['nghệ thuật', 'abstract', 'trừu tượng', 'art', 'marble', 'liquid'] },
  // themes
  { id: 'meo', group: 'theme', label: 'mèo', words: ['mèo', 'cat', 'kitten', 'catlover', 'mèo con'] },
  { id: 'cho', group: 'theme', label: 'chó', words: ['chó', 'cún', 'dog', 'corgi', 'puppy'] },
  { id: 'hoa', group: 'theme', label: 'hoa lá', words: ['hoa', 'hoa lá', 'floral', 'flower', 'bloom', 'sakura', 'lavender', 'oải hương'] },
  { id: 'thien-nhien', group: 'theme', label: 'phong cảnh', words: ['phong cảnh', 'thiên nhiên', 'nature', 'núi', 'fuji', 'biển', 'mountain', 'japan', 'nhật bản'] },
  { id: 'khong-gian', group: 'theme', label: 'vũ trụ', words: ['vũ trụ', 'galaxy', 'space', 'cosmic', 'orbit', 'sao', 'star', 'mây', 'cloud'] },
  { id: 'chu', group: 'theme', label: 'chữ', words: ['typography', 'chữ', 'quote', 'câu nói', 'slogan', 'lời nhắn'] },
  { id: 'hoat-hinh', group: 'theme', label: 'hoạt hình', words: ['hoạt hình', 'cartoon', 'anime', 'pixel', 'game', 'arcade', 'khủng long', 'dino'] },
  { id: 'tinh-yeu', group: 'theme', label: 'tình yêu', words: ['tình yêu', 'love', 'heart', 'trái tim', 'người yêu', 'valentine'] },
  { id: 'do-an', group: 'theme', label: 'đồ ăn', words: ['đồ ăn', 'foodie', 'trà sữa', 'matcha', 'bánh'] },
  // occasions / who it is for
  { id: 'qua', group: 'occasion', label: 'làm quà', words: ['quà', 'tặng', 'sinh nhật', 'gift', 'kỷ niệm'] },
  { id: 'cap-doi', group: 'occasion', label: 'cặp đôi', words: ['cặp đôi', 'couple', 'bạn trai', 'bạn gái', 'người yêu', 'đôi'] },
  { id: 'genz', group: 'occasion', label: 'Gen Z', words: ['gen z', 'genz', 'học sinh', 'sinh viên', 'trẻ trung', 'youth'] },
  // materials
  { id: 'deo', group: 'material', label: 'chống sốc', words: ['dẻo', 'tpu', 'chống sốc', 'silicon', 'bền'] },
  { id: 'magsafe', group: 'material', label: 'MagSafe', words: ['magsafe', 'sạc không dây', 'nam châm'] },
];

/** Phone model aliases → catalog model name (used to read "ốp mèo ip15"). */
export const DEVICE_ALIASES: readonly { name: string; aliases: readonly string[] }[] = [
  { name: 'iPhone 16 Pro Max', aliases: ['iphone 16 pro max', 'ip16 pro max', 'ip 16 pro max', 'ip16pm', '16 pro max', '16pm'] },
  { name: 'iPhone 16 Pro', aliases: ['iphone 16 pro', 'ip16 pro', 'ip 16 pro', 'ip16p', '16 pro'] },
  { name: 'iPhone 16', aliases: ['iphone 16', 'ip16', 'ip 16'] },
  { name: 'iPhone 15 Pro Max', aliases: ['iphone 15 pro max', 'ip15 pro max', 'ip 15 pro max', 'ip15pm', '15 pro max', '15pm'] },
  { name: 'iPhone 15 Pro', aliases: ['iphone 15 pro', 'ip15 pro', 'ip 15 pro', 'ip15p', '15 pro'] },
  { name: 'iPhone 15', aliases: ['iphone 15', 'ip15', 'ip 15'] },
  { name: 'iPhone 14', aliases: ['iphone 14', 'ip14', 'ip 14'] },
  { name: 'Galaxy S24 Ultra', aliases: ['galaxy s24 ultra', 'samsung s24 ultra', 's24 ultra', 's24u'] },
  { name: 'Galaxy S24', aliases: ['galaxy s24', 'samsung s24', 's24'] },
  { name: 'Galaxy S23', aliases: ['galaxy s23', 'samsung s23', 's23'] },
  { name: 'Xiaomi 14 Ultra', aliases: ['xiaomi 14 ultra', 'mi 14 ultra', 'xiaomi 14'] },
];

const NORMALIZED = CONCEPTS.map((c) => ({ concept: c, words: c.words.map(normalizeVi) }));
const NORMALIZED_DEVICES = DEVICE_ALIASES.map((d) => ({ name: d.name, aliases: d.aliases.map(normalizeVi).sort((a, b) => b.length - a.length) }));

/** Whole-word phrase test on normalized text. */
function hasPhrase(text: string, phrase: string): boolean {
  return (' ' + text + ' ').includes(' ' + phrase + ' ');
}

/** Concepts mentioned in a text (name, tags, description or a customer's request). */
export function conceptsIn(text: string): Concept[] {
  const t = normalizeVi(text);
  return NORMALIZED.filter((c) => c.words.some((w) => hasPhrase(t, w))).map((c) => c.concept);
}

/**
 * Phone model mentioned in a query, and the query without it ("ốp mèo ip15" → iPhone 15, "ốp mèo").
 * Longest alias wins so "15 pro max" is not read as "15 pro".
 */
export function deviceIn(text: string): { name: string; rest: string } | null {
  const t = normalizeVi(text);
  let best: { name: string; alias: string } | null = null;
  for (const d of NORMALIZED_DEVICES) {
    const alias = d.aliases.find((a) => hasPhrase(t, a));
    if (alias && (!best || alias.length > best.alias.length)) best = { name: d.name, alias };
  }
  if (!best) return null;
  return { name: best.name, rest: (' ' + t + ' ').replace(' ' + best.alias + ' ', ' ').trim() };
}

/** Order code typed or pasted in the search box, e.g. "cc-261115-0001". */
export function orderCodeIn(text: string): string | null {
  const m = text.trim().match(/^cc-?(\d{6})-?(\d{4})$/i);
  return m ? `CC-${m[1]}-${m[2]}` : null;
}
