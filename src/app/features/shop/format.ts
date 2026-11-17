const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export function vnd(amount: number): string {
  return VND.format(amount);
}

/** Fallback for missing product photos. */
export function onPhotoError(event: Event, fallback = '/products/Bg_Case/01_lavender_haze.png'): void {
  const img = event.target as HTMLImageElement | null;
  if (!img || img.dataset['fallback'] === '1') return;
  img.dataset['fallback'] = '1';
  img.src = fallback;
}
