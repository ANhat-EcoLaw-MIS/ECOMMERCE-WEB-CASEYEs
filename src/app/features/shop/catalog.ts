import type { PhoneCaseTone } from '../../shared/ui/phone-case-mock/phone-case-mock';
export interface CatalogProduct {
  id: string; name: string; collection: string; caption: string; tone: PhoneCaseTone;
  price: number; style: string; tags: string[]; badge: string; stock: number;
  description: string; material: string;
}
export const MODELS = ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14', 'Samsung S24 Ultra', 'Samsung S24', 'Samsung S23'];
export const PRODUCTS: CatalogProduct[] = [
  {id:'lilac-dream',name:'Lavender Daydream',collection:'Soft Intentions',caption:'daydream',tone:'lilac',price:289000,style:'Pastel',tags:['Tím','Minimal','Hoa'],badge:'BEST SELLER',stock:18,description:'Một chút mộng mơ dành riêng cho những ngày đầy cảm hứng.',material:'TPU chống sốc · In UV'},
  {id:'midnight-eyes',name:'Midnight Eyes',collection:'After Hours',caption:'eyes on you',tone:'dark',price:329000,style:'Cá tính',tags:['Tối giản','Đen','Typography'],badge:'NEW DROP',stock:12,description:'Cá tính không cần quá nhiều lời.',material:'Hybrid TPU · Viền bảo vệ'},
  {id:'bloom-club',name:'Bloom Club',collection:'Soft Intentions',caption:'bloom',tone:'light',price:279000,style:'Hoa lá',tags:['Hoa','Pastel','Dễ thương'],badge:'',stock:23,description:'Những đóa hoa nhỏ mang đến năng lượng tích cực.',material:'TPU chống sốc · In UV'},
  {id:'purple-orbit',name:'Purple Orbit',collection:'Cosmic Edit',caption:'orbit',tone:'lilac',price:349000,style:'Trừu tượng',tags:['Tím','Không gian','Art'],badge:'LIMITED',stock:7,description:'Một quỹ đạo tím dành cho những tâm hồn tò mò.',material:'Hybrid TPU · MagSafe'},
  {id:'little-love',name:'Little Love Notes',collection:'Soft Intentions',caption:'love more',tone:'light',price:269000,style:'Pastel',tags:['Dễ thương','Typography','Trắng'],badge:'',stock:15,description:'Một lời nhắn dễ thương theo bạn mỗi ngày.',material:'TPU chống sốc · In UV'},
  {id:'noir-muse',name:'Noir Muse',collection:'After Hours',caption:'muse',tone:'dark',price:319000,style:'Cá tính',tags:['Đen','Minimal','Art'],badge:'HOT',stock:11,description:'Sự tinh tế khi bạn chọn khác biệt.',material:'Hybrid TPU · Viền bảo vệ'},
  {id:'cloud-nine',name:'Cloud Nine',collection:'Cosmic Edit',caption:'cloud 9',tone:'lilac',price:299000,style:'Pastel',tags:['Tím','Dễ thương','Không gian'],badge:'',stock:24,description:'Nhẹ tênh như đang bước trên mây.',material:'TPU chống sốc · In UV'},
  {id:'mono-heart',name:'Mono Heart',collection:'After Hours',caption:'<3',tone:'light',price:259000,style:'Tối giản',tags:['Minimal','Trắng','Typography'],badge:'',stock:0,description:'Một biểu tượng nhỏ, một cá tính rất riêng.',material:'TPU chống sốc · In UV'},
];

/** Shared imagery for catalog, quick view, detail and cart. */
export function catalogId(cartId: string): string { return cartId.split(':')[0]; }
export function productImage(id: string): string {
  return `/products/${PRODUCTS.some(p => p.id === catalogId(id)) ? catalogId(id) : "bloom-club"}.webp`;
}
export function productTexture(id: string): string {
  return `/products/${catalogId(id)}-texture.webp`;
}
export function productStock(id: string): number {
  return PRODUCTS.find(p => p.id === catalogId(id))?.stock ?? 0;
}

/** Demo cross-sell accessories, not yet synced with live inventory. */
export interface CatalogAccessory { id: string; name: string; price: number; stock: number; image: string; }
export const ACCESSORIES: CatalogAccessory[] = [
  { id: 'accessory-magsafe', name: 'Đế sạc MagSafe CasEYE’s', price: 599000, stock: 12, image: '/products/accessory-magsafe.webp' },
  { id: 'accessory-airpods', name: 'Case AirPods Bloom', price: 199000, stock: 9, image: '/products/accessory-airpods.webp' },
  { id: 'accessory-strap', name: 'Dây đeo điện thoại Lavender', price: 99000, stock: 16, image: '/products/accessory-strap.webp' },
];
