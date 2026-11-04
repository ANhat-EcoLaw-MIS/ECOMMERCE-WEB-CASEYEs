import { DELIVERY_CONFIG } from '../config/delivery-config';
import { ShippingTier, Zone } from '../models/order-tracking.model';

export interface ShippingQuote {
  readonly tier: ShippingTier;
  readonly available: boolean;
  /** Amount the customer pays for shipping. */
  readonly fee: number;
  /** Extra paid for "Giao nhanh" over Standard in the same zone (0 for Standard). */
  readonly fastSurcharge: number;
  readonly freeshipApplied: boolean;
}

/**
 * Table 3.5 + FR-OT-12: free Standard shipping from 349.000 đ of goods; "Giao nhanh" pays
 * only the difference with Standard in the same zone.
 */
export function quoteShipping(zone: Zone, tier: ShippingTier, goodsTotal: number): ShippingQuote {
  const cfg = DELIVERY_CONFIG;
  const standard = cfg.zoneRates[zone].Standard.fee;
  const fast = cfg.zoneRates[zone].Fast.fee;
  const freeship = goodsTotal >= cfg.freeshipThreshold;

  if (tier === 'Standard') {
    return { tier, available: true, fee: freeship ? 0 : standard, fastSurcharge: 0, freeshipApplied: freeship };
  }
  return {
    tier,
    available: cfg.expressAvailability[zone],
    fee: freeship ? fast - standard : fast,
    fastSurcharge: fast - standard,
    freeshipApplied: freeship,
  };
}

/** Two-way carrier cost withheld in situation 3b (assumption A-04: 2 × Standard rate of the zone). */
export function twoWayShippingCost(zone: Zone): number {
  return DELIVERY_CONFIG.zoneRates[zone].Standard.fee * 2;
}

/** Re-delivery fee paid by the customer when the failure was their fault. */
export function redeliveryFee(zone: Zone): number {
  return DELIVERY_CONFIG.zoneRates[zone].Standard.fee;
}

export function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}
