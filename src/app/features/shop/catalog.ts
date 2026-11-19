import type { PhoneCaseTone } from '../../shared/ui/phone-case-mock/phone-case-mock';
import { availableSkus, minPrice, type BaseSKU, type PhoneModel } from '../../shared/devices/devices';
import { fallbackArt } from '../../shared/devices/case-art';

/**
 * Shop catalog, UI level (static until the Supabase products module is wired).
 * A shop product is an ARTWORK printed on any studio device: price, stock, case type and
 * case colour come from the device's SKUs (`PHONE_MODELS_DATA` in design-studio).
 */
export interface ShopDesign {
  readonly id: string;
  readonly name: string;
  readonly collection: string;
  readonly caption: string;
  /** Kept for the cart drawer / older mocks. */
  readonly tone: PhoneCaseTone;
  readonly style: string;
  readonly tags: readonly string[];
  readonly badge: string;
  readonly description: string;
  /** Print technique shown on the detail page. */
  readonly finish: string;
  /** Design surcharge on top of the SKU price. */
  readonly premium: number;
  /** Demo flag: the design is sold out on every device. */
  readonly soldOut?: boolean;
  /** Artwork file from /products/Bg_Case. Without it the case uses a seeded fallback background. */
  readonly art?: string;
}

const BG = '/products/Bg_Case/';

/** Designs made from the /products/Bg_Case artwork set. */
const BG_CASES: readonly ShopDesign[] = [
  { id: 'lavender-haze', art: `${BG}01_lavender_haze.png`, name: 'Lavender Haze', collection: 'Soft Intentions', caption: 'haze', tone: 'lilac', style: 'Pastel', tags: ['Tím', 'Gradient', 'Minimal'], badge: 'NEW DROP', description: 'Sắc tím oải hương mờ ảo, nhẹ nhàng cho mọi ngày.', finish: 'In UV bền màu', premium: 30000 },
  { id: 'lilac-liquid-glass', art: `${BG}02_lilac_liquid_glass.png`, name: 'Lilac Liquid Glass', collection: 'Glass & Light', caption: 'liquid glass', tone: 'lilac', style: 'Trừu tượng', tags: ['Tím', 'Kính', 'Art'], badge: 'HOT', description: 'Hiệu ứng kính lỏng óng ánh, đổi sắc theo từng góc nhìn.', finish: 'In UV · ánh nhũ', premium: 70000 },
  { id: 'cosmic-orbit', art: `${BG}03_cosmic_orbit.png`, name: 'Cosmic Orbit', collection: 'Cosmic Edit', caption: 'orbit', tone: 'lilac', style: 'Trừu tượng', tags: ['Tím', 'Không gian', 'Ngôi sao'], badge: '', description: 'Một quỹ đạo sao băng lướt qua bầu trời tím.', finish: 'In UV bền màu', premium: 50000 },
  { id: 'dreamy-clouds', art: `${BG}04_dreamy_clouds.png`, name: 'Dreamy Clouds', collection: 'Soft Intentions', caption: 'clouds', tone: 'light', style: 'Pastel', tags: ['Mây', 'Pastel', 'Dễ thương'], badge: '', description: 'Những áng mây bồng bềnh cho tâm hồn mơ mộng.', finish: 'In UV bền màu', premium: 30000 },
  { id: 'violet-waves', art: `${BG}05_violet_waves.png`, name: 'Violet Waves', collection: 'Glass & Light', caption: 'waves', tone: 'lilac', style: 'Trừu tượng', tags: ['Tím', 'Sóng', 'Art'], badge: '', description: 'Những con sóng tím uốn lượn mềm mại.', finish: 'In UV · phủ nhám', premium: 40000 },
  { id: 'galaxy-glow', art: `${BG}06_galaxy_glow.png`, name: 'Galaxy Glow', collection: 'Cosmic Edit', caption: 'glow', tone: 'dark', style: 'Cá tính', tags: ['Không gian', 'Đậm', 'Ngôi sao'], badge: 'BEST SELLER', description: 'Ánh sáng thiên hà rực rỡ trong lòng bàn tay.', finish: 'In UV · ánh nhũ', premium: 60000 },
  { id: 'soft-geometry', art: `${BG}07_soft_geometry.png`, name: 'Soft Geometry', collection: 'Glass & Light', caption: 'geometry', tone: 'light', style: 'Tối giản', tags: ['Hình học', 'Minimal', 'Pastel'], badge: '', description: 'Hình khối mềm mại, tối giản mà vẫn cuốn hút.', finish: 'In UV · phủ nhám', premium: 30000 },
  { id: 'satin-ribbons', art: `${BG}08_satin_ribbons.png`, name: 'Satin Ribbons', collection: 'Glass & Light', caption: 'ribbons', tone: 'lilac', style: 'Pastel', tags: ['Ruy băng', 'Lụa', 'Nữ tính'], badge: '', description: 'Dải lụa satin mềm mượt, sang trọng và nữ tính.', finish: 'In UV · ánh nhũ', premium: 60000 },
  { id: 'botanical-shadows', art: `${BG}09_botanical_shadows.png`, name: 'Botanical Shadows', collection: 'Botanical', caption: 'shadows', tone: 'light', style: 'Hoa lá', tags: ['Lá', 'Bóng nắng', 'Minimal'], badge: '', description: 'Bóng lá cây trong nắng chiều, bình yên và thư thái.', finish: 'In UV bền màu', premium: 40000 },
  { id: 'lavender-gingham', art: `${BG}10_lavender_gingham.png`, name: 'Lavender Gingham', collection: 'Soft Intentions', caption: 'gingham', tone: 'light', style: 'Pastel', tags: ['Caro', 'Tím', 'Vintage'], badge: '', description: 'Họa tiết caro tím cổ điển, đáng yêu và dễ phối.', finish: 'In UV bền màu', premium: 20000 },
  { id: 'lavender-water-caustics', art: `${BG}11_lavender_water_caustics.png`, name: 'Lavender Water Caustics', collection: 'Glass & Light', caption: 'caustics', tone: 'lilac', style: 'Trừu tượng', tags: ['Nước', 'Ánh sáng', 'Tím'], badge: 'LIMITED', description: 'Ánh sáng khúc xạ trên mặt nước tím lung linh.', finish: 'In UV · ánh nhũ', premium: 80000 },
  { id: 'purple-botanical-blossoms', art: `${BG}12_purple_botanical_blossoms.png`, name: 'Purple Botanical Blossoms', collection: 'Botanical', caption: 'blossoms', tone: 'lilac', style: 'Hoa lá', tags: ['Hoa', 'Tím', 'Thiên nhiên'], badge: '', description: 'Những đóa hoa tím nở rộ cho ngày thêm tươi mới.', finish: 'In UV bền màu', premium: 50000 },
  { id: 'pastel-paper-waves', art: `${BG}13_pastel_paper_waves.png`, name: 'Pastel Paper Waves', collection: 'Soft Intentions', caption: 'paper', tone: 'light', style: 'Pastel', tags: ['Giấy', 'Sóng', 'Pastel'], badge: '', description: 'Lớp giấy cắt xếp sóng pastel đầy chiều sâu.', finish: 'In UV · phủ nhám', premium: 40000 },
  { id: 'stardust-lilac', art: `${BG}14_stardust_lilac.png`, name: 'Stardust Lilac', collection: 'Cosmic Edit', caption: 'stardust', tone: 'lilac', style: 'Cá tính', tags: ['Lấp lánh', 'Tím', 'Ngôi sao'], badge: 'NEW DROP', description: 'Bụi sao lấp lánh trên nền tím lilac.', finish: 'In UV · ánh nhũ', premium: 70000 },
  { id: 'satin-sheen', art: `${BG}15_satin_sheen.png`, name: 'Satin Sheen', collection: 'Glass & Light', caption: 'sheen', tone: 'light', style: 'Tối giản', tags: ['Lụa', 'Bóng', 'Minimal'], badge: '', description: 'Ánh lụa satin bóng nhẹ, tinh tế và thanh lịch.', finish: 'In UV · ánh nhũ', premium: 50000 },
  // i16–i25: colour editions (file name after the index = design name).
  { id: 'wyvern-crystal', art: `${BG}i16_wyvern_crystal.webp`, name: 'Wyvern Crystal', collection: 'Jewel Tones', caption: 'wyvern', tone: 'dark', style: 'Cá tính', tags: ['Đỏ', 'Pha lê', 'Nhung'], badge: 'NEW DROP', description: 'Pha lê đỏ rực trồi lên giữa lớp nhung thẫm, mạnh mẽ và đầy bí ẩn như vảy rồng.', finish: 'In UV · ánh nhũ', premium: 80000 },
  { id: 'silver-pearl', art: `${BG}i17_silver_pearl.webp`, name: 'Silver Pearl', collection: 'Jewel Tones', caption: 'pearl', tone: 'light', style: 'Tối giản', tags: ['Bạc', 'Ngọc trai', 'Sang trọng'], badge: '', description: 'Ánh ngọc trai bạc dịu mát, thanh lịch cho những ngày cần một chút tinh tế.', finish: 'In UV · ánh nhũ', premium: 60000 },
  { id: 'midnight-moon', art: `${BG}i18_midnight_moon.webp`, name: 'Midnight Moon', collection: 'Cosmic Edit', caption: 'moon', tone: 'dark', style: 'Trừu tượng', tags: ['Cực quang', 'Đêm', 'Không gian'], badge: 'HOT', description: 'Cực quang tím chảy trên bầu trời đầy sao, soi bóng xuống mặt nước đêm cùng những bong bóng pha lê.', finish: 'In UV · phủ nhám', premium: 60000 },
  { id: 'summer-bloom', art: `${BG}i19_summer_bloom.webp`, name: 'Summer Bloom', collection: 'Botanical', caption: 'bloom', tone: 'light', style: 'Hoa lá', tags: ['Hoa', 'Mùa hè', 'Tươi sáng'], badge: '', description: 'Sắc hoa mùa hè rực rỡ, mang năng lượng tươi mới theo bạn suốt cả ngày.', finish: 'In UV bền màu', premium: 40000 },
  { id: 'jasmine-dream', art: `${BG}i20_jasmine_dream.webp`, name: 'Jasmine Dream', collection: 'Botanical', caption: 'jasmine', tone: 'light', style: 'Pastel', tags: ['Hoa nhài', 'Trắng', 'Dịu dàng'], badge: '', description: 'Những cánh nhài trắng mỏng manh, nhẹ nhàng và thơm mát như một giấc mơ.', finish: 'In UV bền màu', premium: 30000 },
  { id: 'golden-silk', art: `${BG}i21_golden_silk.webp`, name: 'Golden Silk', collection: 'Glass & Light', caption: 'golden', tone: 'light', style: 'Trừu tượng', tags: ['Vàng', 'Lụa', 'Bong bóng'], badge: 'LIMITED', description: 'Dải lụa vàng óng uốn lượn giữa những bong bóng trong veo, rạng rỡ như nắng sớm.', finish: 'In UV · ánh nhũ', premium: 70000 },
  { id: 'fresh-iceflow', art: `${BG}i22_fresh_iceflow.webp`, name: 'Fresh Iceflow', collection: 'Glass & Light', caption: 'iceflow', tone: 'light', style: 'Tối giản', tags: ['Xanh biển', 'Nước', 'Bong bóng'], badge: '', description: 'Làn nước xanh trong vắt lấp lánh nắng và bong bóng, mát lạnh cho những ngày oi bức.', finish: 'In UV · phủ nhám', premium: 50000 },
  { id: 'twilight-swirl', art: `${BG}i23_twilight_swirl.webp`, name: 'Twilight Swirl', collection: 'Cosmic Edit', caption: 'twilight', tone: 'lilac', style: 'Trừu tượng', tags: ['Hoàng hôn', 'Xoáy', 'Tím'], badge: '', description: 'Vòng xoáy hoàng hôn tím biếc, khoảnh khắc chuyển giao giữa ngày và đêm.', finish: 'In UV · ánh nhũ', premium: 60000 },
  { id: 'warm-flow', art: `${BG}i24_warm_flow.webp`, name: 'Warm Flow', collection: 'Soft Intentions', caption: 'warm', tone: 'light', style: 'Pastel', tags: ['Cam đào', 'Hoa', 'Ấm áp'], badge: 'NEW DROP', description: 'Sắc cam đào ấm áp cùng cánh hoa trong suốt bay giữa mây, dịu dàng và đầy cảm xúc.', finish: 'In UV bền màu', premium: 40000 },
  { id: 'sakura-silk', art: `${BG}i25_sakura_silk.webp`, name: 'Sakura Silk', collection: 'Soft Intentions', caption: 'sakura', tone: 'light', style: 'Hoa lá', tags: ['Anh đào', 'Hồng', 'Lụa'], badge: 'BEST SELLER', description: 'Lụa hồng anh đào mềm mại, gợi nhớ mùa xuân Nhật Bản ngọt ngào.', finish: 'In UV · ánh nhũ', premium: 60000 },
];

export const DESIGNS: readonly ShopDesign[] = [
  { id: 'lilac-dream', name: 'Lavender Daydream', collection: 'Soft Intentions', caption: 'daydream', tone: 'lilac', style: 'Pastel', tags: ['Tím', 'Minimal', 'Hoa'], badge: 'BEST SELLER', description: 'Một chút mộng mơ dành riêng cho những ngày đầy cảm hứng.', finish: 'In UV bền màu', premium: 40000 },
  { id: 'midnight-eyes', name: 'Midnight Eyes', collection: 'After Hours', caption: 'eyes on you', tone: 'dark', style: 'Cá tính', tags: ['Tối giản', 'Đen', 'Typography'], badge: 'NEW DROP', description: 'Cá tính không cần quá nhiều lời.', finish: 'In UV · phủ nhám', premium: 70000 },
  { id: 'bloom-club', name: 'Bloom Club', collection: 'Soft Intentions', caption: 'bloom', tone: 'light', style: 'Hoa lá', tags: ['Hoa', 'Pastel', 'Dễ thương'], badge: '', description: 'Những đóa hoa nhỏ mang đến năng lượng tích cực.', finish: 'In UV bền màu', premium: 30000 },
  { id: 'purple-orbit', name: 'Purple Orbit', collection: 'Cosmic Edit', caption: 'orbit', tone: 'lilac', style: 'Trừu tượng', tags: ['Tím', 'Không gian', 'Art'], badge: 'LIMITED', description: 'Một quỹ đạo tím dành cho những tâm hồn tò mò.', finish: 'In UV · ánh nhũ', premium: 90000 },
  { id: 'little-love', name: 'Little Love Notes', collection: 'Soft Intentions', caption: 'love more', tone: 'light', style: 'Pastel', tags: ['Dễ thương', 'Typography', 'Trắng'], badge: '', description: 'Một lời nhắn dễ thương theo bạn mỗi ngày.', finish: 'In UV bền màu', premium: 20000 },
  { id: 'noir-muse', name: 'Noir Muse', collection: 'After Hours', caption: 'muse', tone: 'dark', style: 'Cá tính', tags: ['Đen', 'Minimal', 'Art'], badge: 'HOT', description: 'Sự tinh tế khi bạn chọn khác biệt.', finish: 'In UV · phủ nhám', premium: 60000 },
  { id: 'cloud-nine', name: 'Cloud Nine', collection: 'Cosmic Edit', caption: 'cloud 9', tone: 'lilac', style: 'Pastel', tags: ['Tím', 'Dễ thương', 'Không gian'], badge: '', description: 'Nhẹ tênh như đang bước trên mây.', finish: 'In UV bền màu', premium: 50000 },
  { id: 'mono-heart', name: 'Mono Heart', collection: 'After Hours', caption: '<3', tone: 'light', style: 'Tối giản', tags: ['Minimal', 'Trắng', 'Typography'], badge: '', description: 'Một biểu tượng nhỏ, một cá tính rất riêng.', finish: 'In UV bền màu', premium: 10000, soldOut: true },
  ...BG_CASES,
];

export const STYLES = ['Pastel', 'Cá tính', 'Hoa lá', 'Trừu tượng', 'Tối giản'] as const;
export const COLLECTIONS = [...new Set(DESIGNS.map((d) => d.collection))];

export function findDesign(id: string | null | undefined): ShopDesign | undefined {
  return id ? DESIGNS.find((d) => d.id === id) : undefined;
}

/** Cart ids are `${designId}:${modelId}:${skuId}`; the first segment is always the design. */
export function catalogId(cartId: string): string {
  return cartId.split(':')[0];
}

export function cartItemId(design: ShopDesign, model: PhoneModel, sku: BaseSKU): string {
  return `${design.id}:${model.id}:${sku.skuId}`;
}

/**
 * Flat artwork printed on the case back. Designs without an `art` file return '' and the case
 * renderers fall back to a seeded Bg_Case background + tint (see shared/devices/case-art.ts).
 */
export function artworkUrl(id: string): string {
  return findDesign(catalogId(id))?.art ?? '';
}

/** Product image for the cart drawer, cart page and search: the artwork, or the same fallback the case shows. */
export function productImage(id: string): string {
  const designId = catalogId(id);
  return findDesign(designId)?.art ?? fallbackArt(designId).url;
}

/** Old accessory photos (deleted with the original asset set) → their closest current product shot. */
const LEGACY_ACCESSORY_IMAGES: Readonly<Record<string, string>> = {
  'accessory-magsafe': '/products/Accessories/01_magnetic_charging_puck.png',
  'accessory-strap': '/products/Accessories/06_lavender_beaded_wristlet.png',
};

/** Matches the old flat files: /products/{slug}.webp and its -texture/-detail/-finish variants. */
const LEGACY_PRODUCT_IMAGE = /^\/products\/([a-z0-9-]+?)(?:-texture|-detail|-finish)?\.webp$/;

/**
 * Image for anything that stored a product picture before the asset change (orders, saved carts).
 * Legacy `/products/*.webp` paths are mapped to what the shop shows today, so an order's thumbnail
 * matches its product; any other URL (Bg_Case, Accessories, design previews, data URLs) is kept.
 * Without a URL, the product name is used to find the design.
 */
export function resolveProductImage(url: string | null | undefined, productName?: string): string | undefined {
  const byName = productName ? DESIGNS.find((d) => d.name === productName) : undefined;
  if (!url) return byName ? productImage(byName.id) : undefined;
  const legacy = LEGACY_PRODUCT_IMAGE.exec(url);
  if (!legacy) return url;
  const slug = legacy[1];
  if (slug.startsWith('accessory-')) return LEGACY_ACCESSORY_IMAGES[slug] ?? fallbackArt(slug).url;
  if (findDesign(slug)) return productImage(slug);
  return byName ? productImage(byName.id) : fallbackArt(slug).url;
}

/** Lifestyle photos for the detail gallery (none in the current asset set). */
export function productPhotos(_id: string): string[] {
  return [];
}

export function variantPrice(design: ShopDesign, sku: BaseSKU): number {
  return sku.price + design.premium;
}

export function variantStock(design: ShopDesign, sku: BaseSKU): number {
  return design.soldOut || !sku.isAvailable ? 0 : sku.stockQty;
}

/** "From" price of a design on a device. */
export function fromPrice(design: ShopDesign, model: PhoneModel): number {
  return minPrice(model) + design.premium;
}

/** Default SKU for a device: the one in the given colour, else the first available. */
export function pickSku(model: PhoneModel, color?: string | null): BaseSKU | undefined {
  const skus = availableSkus(model);
  return skus.find((s) => !!color && s.colorName === color) ?? skus[0];
}

/** One SKU per colour of a device (the shop sells by colour only, no case-type choice). */
export function colorSkus(model: PhoneModel): BaseSKU[] {
  const seen = new Set<string>();
  return availableSkus(model).filter((s) => {
    if (seen.has(s.colorName)) return false;
    seen.add(s.colorName);
    return true;
  });
}

/** Accessories from /products/Accessories, sold on their own (not tied to a device). */
export interface CatalogAccessory {
  readonly id: string;
  readonly name: string;
  readonly category: 'MagSafe' | 'Dây đeo' | 'Charm';
  readonly description: string;
  readonly price: number;
  readonly stock: number;
  readonly image: string;
  readonly badge?: string;
}

const ACC = '/products/Accessories/';

export const ACCESSORY_CATEGORIES = ['MagSafe', 'Dây đeo', 'Charm'] as const;

export const ACCESSORIES: readonly CatalogAccessory[] = [
  { id: 'accessory-charging-puck', name: 'Đế sạc từ tính', category: 'MagSafe', description: 'Đế sạc không dây hít từ, dùng cùng ốp MagSafe.', price: 490000, stock: 14, image: `${ACC}01_magnetic_charging_puck.png`, badge: 'BEST SELLER' },
  { id: 'accessory-magnetic-wallet', name: 'Ví da từ tính', category: 'MagSafe', description: 'Ví đựng thẻ gắn từ phía sau ốp, gọn và chắc chắn.', price: 390000, stock: 18, image: `${ACC}02_magnetic_wallet.png` },
  { id: 'accessory-ring-holder', name: 'Nhẫn giữ từ tính', category: 'MagSafe', description: 'Nhẫn đỡ máy hít từ, xoay 360° và làm giá đỡ.', price: 190000, stock: 25, image: `${ACC}03_magnetic_ring_holder.png` },
  { id: 'accessory-desk-stand', name: 'Giá đỡ để bàn từ tính', category: 'MagSafe', description: 'Giá đỡ hít từ cho bàn làm việc, chỉnh được góc nghiêng.', price: 450000, stock: 9, image: `${ACC}04_magnetic_desk_stand.png`, badge: 'NEW DROP' },
  { id: 'accessory-power-bank', name: 'Pin dự phòng từ tính', category: 'MagSafe', description: 'Pin dự phòng hít từ, mỏng nhẹ mang theo hằng ngày.', price: 690000, stock: 11, image: `${ACC}05_magnetic_power_bank.png` },
  { id: 'accessory-beaded-wristlet', name: 'Dây đeo hạt Lavender', category: 'Dây đeo', description: 'Dây đeo cổ tay kết hạt tông tím oải hương.', price: 150000, stock: 20, image: `${ACC}06_lavender_beaded_wristlet.png` },
  { id: 'accessory-braided-strap', name: 'Dây đeo cổ tay bện', category: 'Dây đeo', description: 'Dây bện dù chắc chắn, giữ máy an toàn khi di chuyển.', price: 120000, stock: 22, image: `${ACC}07_braided_phone_wrist_strap.png` },
  { id: 'accessory-flower-charm', name: 'Charm hoa acrylic', category: 'Charm', description: 'Charm hoa acrylic trong trẻo để treo lên ốp.', price: 89000, stock: 30, image: `${ACC}08_acrylic_flower_charm.png` },
  { id: 'accessory-plush-star', name: 'Charm ngôi sao bông', category: 'Charm', description: 'Ngôi sao bông mềm mại, đáng yêu.', price: 99000, stock: 16, image: `${ACC}09_plush_star_charm.png`, badge: 'HOT' },
  { id: 'accessory-astronaut-star', name: 'Charm phi hành gia', category: 'Charm', description: 'Charm phi hành gia và ngôi sao cho người mê vũ trụ.', price: 119000, stock: 0, image: `${ACC}10_astronaut_star_charm.png` },
];
