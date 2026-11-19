import { DEVICES } from '../../../shared/devices/devices';
import { ALL_DEVICE_OPTIONS, DEVICE_CATALOG, findDeviceOption } from './onboarding-presets';

describe('DEVICE_CATALOG (onboarding device picker)', () => {
  it('offers exactly the phone models the Shop and Design Studio sell', () => {
    expect(ALL_DEVICE_OPTIONS.map((d) => d.id).sort()).toEqual(DEVICES.map((m) => m.id).sort());
  });

  it('groups them by brand', () => {
    expect(DEVICE_CATALOG.apple.map((d) => d.id)).toContain('iphone-15-pro-max');
    expect(DEVICE_CATALOG.samsung.map((d) => d.id)).toEqual(['galaxy-s24']);
    expect(DEVICE_CATALOG.xiaomi.map((d) => d.id)).toEqual(['xiaomi-14-ultra']);
  });

  it('finds a saved device by name (profiles.device_type) or by id', () => {
    expect(findDeviceOption('iPhone 15 Pro Max')?.id).toBe('iphone-15-pro-max');
    expect(findDeviceOption('galaxy-s24')?.name).toBe('Galaxy S24');
    expect(findDeviceOption('Samsung S24 Ultra')).toBeUndefined();
  });
});
