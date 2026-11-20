/** Background art used when a case has no artwork (or its image fails to load). */
export const FALLBACK_ART: readonly string[] = [
  '01_lavender_haze',
  '02_lilac_liquid_glass',
  '03_cosmic_orbit',
  '04_dreamy_clouds',
  '05_violet_waves',
  '06_galaxy_glow',
  '07_soft_geometry',
  '08_satin_ribbons',
  '09_botanical_shadows',
  '10_lavender_gingham',
  '11_lavender_water_caustics',
  '12_purple_botanical_blossoms',
  '13_pastel_paper_waves',
  '14_stardust_lilac',
  '15_satin_sheen',
].map((name) => `/products/Bg_Case/${name}.png`);

/** Tints blended over the fallback art, so repeated backgrounds still look different. */
export const FALLBACK_TINTS: readonly string[] = ['#f0a6e8', '#8ad8ff', '#ffd59e', '#9be7c4', '#ff9eb5', '#a58cf4', '#6a53b0'];

/** Small stable hash (FNV-1a), so a given seed always gets the same "random" art. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function fallbackArt(seed: string): { url: string; tint: string } {
  const h = hashSeed(seed);
  return {
    url: FALLBACK_ART[h % FALLBACK_ART.length],
    tint: FALLBACK_TINTS[(h >>> 8) % FALLBACK_TINTS.length],
  };
}
