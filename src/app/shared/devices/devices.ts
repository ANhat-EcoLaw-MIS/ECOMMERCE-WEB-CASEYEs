/**
 * Phone devices shared across features. The source of truth stays in the design studio;
 * this module only re-exports it so the shop (and others) don't reach into studio internals.
 */
export type {
  BaseSKU,
  Brand,
  CameraCutout,
  CaseType,
  PhoneModel,
} from '../../features/design-studio/models/studio-domain.model';
export { BRANDS_DATA, PHONE_MODELS_DATA } from '../../features/design-studio/services/studio-catalog';

import type { BaseSKU, CaseType, PhoneModel } from '../../features/design-studio/models/studio-domain.model';
import { PHONE_MODELS_DATA } from '../../features/design-studio/services/studio-catalog';

/** Active devices, in catalog order. */
export const DEVICES: readonly PhoneModel[] = PHONE_MODELS_DATA.filter((m) => m.isActive);

export const DEFAULT_DEVICE: PhoneModel = DEVICES[0];

export function findDevice(id: string | null | undefined): PhoneModel | undefined {
  return id ? DEVICES.find((m) => m.id === id || m.slug === id) : undefined;
}

export const CASE_TYPE_LABELS: Readonly<Record<CaseType, string>> = {
  snap: 'Snap mỏng nhẹ',
  tough: 'Tough chống sốc',
  clear: 'Trong suốt',
  magsafe: 'MagSafe',
  standard: 'Tiêu chuẩn',
};

/** Available SKUs of a device (in-stock first is not applied, catalog order kept). */
export function availableSkus(model: PhoneModel): readonly BaseSKU[] {
  return model.skus.filter((s) => s.isAvailable);
}

/** Distinct case types offered for a device, in SKU order. */
export function caseTypesOf(model: PhoneModel): CaseType[] {
  return [...new Set(availableSkus(model).map((s) => s.caseType))];
}

/** Lowest SKU price of a device (0 when it has no available SKU). */
export function minPrice(model: PhoneModel): number {
  const prices = availableSkus(model).map((s) => s.price);
  return prices.length ? Math.min(...prices) : 0;
}
