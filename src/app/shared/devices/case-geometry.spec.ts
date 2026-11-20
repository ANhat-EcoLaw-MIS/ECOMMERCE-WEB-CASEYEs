import { FALLBACK_ART, FALLBACK_TINTS, fallbackArt } from './case-art';
import { contrastInk, cutoutRadius, cutoutShape, lenses, rimWidth } from './case-geometry';
import { DEVICES, findDevice } from './devices';

const device = (id: string) => {
  const m = findDevice(id);
  if (!m) throw new Error(`missing device ${id}`);
  return m;
};

describe('case geometry', () => {
  it('derives the camera shape from cutout data, not from model ids', () => {
    expect(cutoutShape(device('iphone-15-pro-max'))).toBe('island');
    expect(cutoutShape(device('iphone-16-pro'))).toBe('island');
    expect(cutoutShape(device('iphone-15-pro'))).toBe('island');
    expect(cutoutShape(device('galaxy-s24'))).toBe('column');
    expect(cutoutShape(device('xiaomi-14-ultra'))).toBe('ring');
  });

  it('places one lens per lensCount (max 4), inside the cutout box', () => {
    for (const m of DEVICES) {
      const list = lenses(m);
      expect(list.length).toBe(Math.min(4, m.safeZoneMask.cameraCutout.lensCount));
      for (const l of list) {
        expect(l.x).toBeGreaterThan(0);
        expect(l.x).toBeLessThan(100);
        expect(l.y).toBeGreaterThan(0);
        expect(l.y).toBeLessThan(100);
      }
    }
  });

  it('keeps cutout radius within 0–50%', () => {
    for (const m of DEVICES) {
      const r = cutoutRadius(m);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(50);
    }
    expect(cutoutRadius(device('xiaomi-14-ultra'))).toBe(50);
  });

  it('makes tough cases thicker than snap cases', () => {
    expect(rimWidth('tough')).toBeGreaterThan(rimWidth('snap'));
  });

  it('picks a readable ink for a case colour', () => {
    expect(contrastInk('#0A0A0A')).toBe('#FFFFFF');
    expect(contrastInk('#FFFFFF')).toBe('#0A0A0A');
    expect(contrastInk('nope')).toBe('#0A0A0A');
  });
});

describe('fallback case art', () => {
  it('picks a stable Bg_Case background + tint per seed', () => {
    const a = fallbackArt('lavender-haze');
    expect(fallbackArt('lavender-haze')).toEqual(a);
    expect(FALLBACK_ART).toContain(a.url);
    expect(FALLBACK_TINTS).toContain(a.tint);
  });

  it('spreads different seeds over several backgrounds', () => {
    const urls = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((s) => fallbackArt(s).url));
    expect(urls.size).toBeGreaterThan(3);
  });
});
