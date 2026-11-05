import { Injectable, computed, signal } from '@angular/core';
import { BaseSKU, Brand, PhoneModel } from '../models/studio-domain.model';

export const BRANDS_DATA: readonly Brand[] = [
  { id: 'brand-apple', name: 'Apple', slug: 'apple', displayOrder: 1, isActive: true },
  { id: 'brand-samsung', name: 'Samsung', slug: 'samsung', displayOrder: 2, isActive: true },
  { id: 'brand-xiaomi', name: 'Xiaomi', slug: 'xiaomi', displayOrder: 3, isActive: true },
];

export const PHONE_MODELS_DATA: readonly PhoneModel[] = [
  {
    id: 'iphone-15-pro-max',
    brandId: 'brand-apple',
    brandName: 'Apple',
    name: 'iPhone 15 Pro Max',
    slug: 'iphone-15-pro-max',
    releaseYear: 2023,
    has3dModel: true,
    model3dUrl: '/models/iphone-15-pro-max.glb',
    printWidthMm: 76.7,
    printHeightMm: 159.9,
    minPrintDpi: 150,
    specs: [
      'Màn hình 6.7" Super Retina XDR',
      'Camera Pro 48MP',
      'Chip A17 Pro',
      'Titanium cao cấp',
    ],
    safeZoneMask: {
      maskId: 'mask-ip15pm',
      modelId: 'iphone-15-pro-max',
      safeMarginMm: 3.5,
      safeMarginPercent: 5,
      version: 1,
      cameraCutout: {
        xPercent: 4.8,
        yPercent: 2.3,
        widthPercent: 49,
        heightPercent: 23.8,
        borderRadius: 36,
        lensCount: 3,
      },
    },
    skus: [
      {
        skuId: 'sku-ip15pm-titanium',
        skuCode: 'CASE-IP15PM-TITAN',
        modelId: 'iphone-15-pro-max',
        caseType: 'tough',
        colorName: 'Titan Tự Nhiên',
        colorHex: '#9E9A93',
        price: 260000,
        stockQty: 95,
        isAvailable: true,
      },
      {
        skuId: 'sku-ip15pm-lilac',
        skuCode: 'CASE-IP15PM-LILAC',
        modelId: 'iphone-15-pro-max',
        caseType: 'tough',
        colorName: 'Tím Lilac',
        colorHex: '#A58CF4',
        price: 250000,
        stockQty: 80,
        isAvailable: true,
      },
      {
        skuId: 'sku-ip15pm-black',
        skuCode: 'CASE-IP15PM-BLACK',
        modelId: 'iphone-15-pro-max',
        caseType: 'snap',
        colorName: 'Đen Jet Black',
        colorHex: '#0A0A0A',
        price: 240000,
        stockQty: 110,
        isAvailable: true,
      },
    ],
    isActive: true,
  },
  {
    id: 'iphone-16-pro',
    brandId: 'brand-apple',
    brandName: 'Apple',
    name: 'iPhone 16 Pro',
    slug: 'iphone-16-pro',
    releaseYear: 2024,
    has3dModel: true,
    model3dUrl: '/models/iphone-16-pro.glb',
    printWidthMm: 71.5,
    printHeightMm: 149.6,
    minPrintDpi: 150,
    specs: [
      'Màn hình 6.3" Super Retina XDR ProMotion',
      'Camera Fusion 48MP & Nút Điều khiển Camera',
      'Chip A18 Pro mạnh mẽ',
      'Titanium cấp 5 siêu nhẹ',
    ],
    safeZoneMask: {
      maskId: 'mask-ip16p',
      modelId: 'iphone-16-pro',
      safeMarginMm: 3.5,
      safeMarginPercent: 5,
      version: 1,
      cameraCutout: {
        xPercent: 4.8,
        yPercent: 2.3,
        widthPercent: 49,
        heightPercent: 23.8,
        borderRadius: 36,
        lensCount: 3,
      },
    },
    skus: [
      {
        skuId: 'sku-ip16p-lilac',
        skuCode: 'CASE-IP16P-LILAC',
        modelId: 'iphone-16-pro',
        caseType: 'tough',
        colorName: 'Tím Lilac',
        colorHex: '#A58CF4',
        price: 250000,
        stockQty: 85,
        isAvailable: true,
      },
      {
        skuId: 'sku-ip16p-black',
        skuCode: 'CASE-IP16P-BLACK',
        modelId: 'iphone-16-pro',
        caseType: 'snap',
        colorName: 'Đen Jet Black',
        colorHex: '#0A0A0A',
        price: 230000,
        stockQty: 120,
        isAvailable: true,
      },
      {
        skuId: 'sku-ip16p-white',
        skuCode: 'CASE-IP16P-WHITE',
        modelId: 'iphone-16-pro',
        caseType: 'snap',
        colorName: 'Trắng Sữa',
        colorHex: '#FFFFFF',
        price: 230000,
        stockQty: 90,
        isAvailable: true,
      },
      {
        skuId: 'sku-ip16p-magsafe',
        skuCode: 'CASE-IP16P-MAGSAFE',
        modelId: 'iphone-16-pro',
        caseType: 'magsafe',
        colorName: 'Trong suốt MagSafe',
        colorHex: '#ECE6FD',
        price: 290000,
        stockQty: 45,
        isAvailable: true,
      },
    ],
    isActive: true,
  },
  {
    id: 'iphone-15-pro',
    brandId: 'brand-apple',
    brandName: 'Apple',
    name: 'iPhone 15 Pro',
    slug: 'iphone-15-pro',
    releaseYear: 2023,
    has3dModel: true,
    model3dUrl: '/models/iphone-15-pro-max.glb',
    printWidthMm: 70.6,
    printHeightMm: 146.6,
    minPrintDpi: 150,
    specs: [
      'Màn hình 6.1" Super Retina XDR',
      'Camera Pro 48MP',
      'Chip A17 Pro',
      'Khung viền Titanium',
    ],
    safeZoneMask: {
      maskId: 'mask-ip15p',
      modelId: 'iphone-15-pro',
      safeMarginMm: 3.5,
      safeMarginPercent: 5,
      version: 1,
      cameraCutout: {
        xPercent: 4.8,
        yPercent: 2.3,
        widthPercent: 49,
        heightPercent: 23.8,
        borderRadius: 36,
        lensCount: 3,
      },
    },
    skus: [
      {
        skuId: 'sku-ip15p-lilac',
        skuCode: 'CASE-IP15P-LILAC',
        modelId: 'iphone-15-pro',
        caseType: 'tough',
        colorName: 'Tím Lilac',
        colorHex: '#A58CF4',
        price: 240000,
        stockQty: 60,
        isAvailable: true,
      },
      {
        skuId: 'sku-ip15p-black',
        skuCode: 'CASE-IP15P-BLACK',
        modelId: 'iphone-15-pro',
        caseType: 'snap',
        colorName: 'Đen Jet Black',
        colorHex: '#0A0A0A',
        price: 220000,
        stockQty: 80,
        isAvailable: true,
      },
    ],
    isActive: true,
  },
  {
    id: 'galaxy-s24',
    brandId: 'brand-samsung',
    brandName: 'Samsung',
    name: 'Galaxy S24',
    slug: 'galaxy-s24',
    releaseYear: 2024,
    has3dModel: false,
    printWidthMm: 70.6,
    printHeightMm: 147.0,
    minPrintDpi: 150,
    specs: [
      'Màn hình 6.2" Dynamic AMOLED 2X 120Hz',
      'Camera AI 50MP ProVisual Engine',
      'Chip Exynos 2400 / Snapdragon 8 Gen 3',
      'Khung viền Armor Aluminum',
    ],
    safeZoneMask: {
      maskId: 'mask-s24',
      modelId: 'galaxy-s24',
      safeMarginMm: 3.5,
      safeMarginPercent: 5,
      version: 1,
      cameraCutout: {
        xPercent: 7,
        yPercent: 4.5,
        widthPercent: 18,
        heightPercent: 32,
        borderRadius: 16,
        lensCount: 3,
      },
    },
    skus: [
      {
        skuId: 'sku-s24-lilac',
        skuCode: 'CASE-S24-LILAC',
        modelId: 'galaxy-s24',
        caseType: 'tough',
        colorName: 'Tím Lilac',
        colorHex: '#A58CF4',
        price: 240000,
        stockQty: 50,
        isAvailable: true,
      },
      {
        skuId: 'sku-s24-black',
        skuCode: 'CASE-S24-BLACK',
        modelId: 'galaxy-s24',
        caseType: 'snap',
        colorName: 'Đen Jet Black',
        colorHex: '#0A0A0A',
        price: 220000,
        stockQty: 70,
        isAvailable: true,
      },
    ],
    isActive: true,
  },
  {
    id: 'xiaomi-14-ultra',
    brandId: 'brand-xiaomi',
    brandName: 'Xiaomi',
    name: 'Xiaomi 14 Ultra',
    slug: 'xiaomi-14-ultra',
    releaseYear: 2024,
    has3dModel: false,
    printWidthMm: 75.3,
    printHeightMm: 161.4,
    minPrintDpi: 150,
    specs: [
      'Màn hình 6.73" AMOLED WQHD+ 120Hz',
      'Hệ thống 4 camera Leica Summilux 50MP',
      'Chip Snapdragon 8 Gen 3 đỉnh cao',
      'Khung Titanium nguyên khối',
    ],
    safeZoneMask: {
      maskId: 'mask-mi14u',
      modelId: 'xiaomi-14-ultra',
      safeMarginMm: 3.5,
      safeMarginPercent: 5,
      version: 1,
      cameraCutout: {
        xPercent: 12,
        yPercent: 6,
        widthPercent: 76,
        heightPercent: 36,
        borderRadius: 999, // Circular camera bump
        lensCount: 4,
      },
    },
    skus: [
      {
        skuId: 'sku-mi14u-black',
        skuCode: 'CASE-MI14U-BLACK',
        modelId: 'xiaomi-14-ultra',
        caseType: 'tough',
        colorName: 'Đen Jet Black',
        colorHex: '#0A0A0A',
        price: 260000,
        stockQty: 30,
        isAvailable: true,
      },
    ],
    isActive: true,
  },
];

@Injectable({ providedIn: 'root' })
export class StudioCatalogService {
  readonly brands = signal<readonly Brand[]>(BRANDS_DATA);
  readonly models = signal<readonly PhoneModel[]>(PHONE_MODELS_DATA);

  readonly selectedModelId = signal<string>('iphone-15-pro-max');
  readonly selectedModel = computed(() => {
    return this.models().find((m) => m.id === this.selectedModelId()) ?? this.models()[0];
  });

  readonly selectedSkuId = signal<string>('sku-ip15pm-titanium');
  readonly selectedSku = computed(() => {
    const model = this.selectedModel();
    return model.skus.find((s) => s.skuId === this.selectedSkuId()) ?? model.skus[0];
  });

  selectModel(modelId: string): void {
    const targetModel = this.models().find((m) => m.id === modelId);
    if (!targetModel) return;

    this.selectedModelId.set(modelId);
    // Auto-select first available SKU of new model
    if (targetModel.skus.length > 0) {
      this.selectedSkuId.set(targetModel.skus[0].skuId);
    }
  }

  selectSku(skuId: string): void {
    this.selectedSkuId.set(skuId);
  }
}
