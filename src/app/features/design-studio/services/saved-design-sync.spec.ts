import { fromRow, toCanvasJson } from './saved-design-sync';
import type { SavedDesignItem } from './studio-state';

const design: SavedDesignItem = {
  id: '8d3c1f8e-1111-4222-8333-944455556666',
  name: 'Ốp mèo mây',
  modelId: 'iphone-15-pro-max',
  modelName: 'iPhone 15 Pro Max',
  material: 'tough' as SavedDesignItem['material'],
  bg: '#ffffff',
  layerCount: 0,
  layers: [],
  savedAt: 'Hôm nay lúc 10:00',
  thumbnailText: 'Ốp mèo mây',
};

describe('SavedDesignSync mapping (designs table)', () => {
  it('round-trips a saved design through canvas_json', () => {
    const row = { id: design.id, name: design.name, canvas_json: toCanvasJson(design), updated_at: '2026-11-20T00:00:00Z' };
    expect(fromRow(row)).toEqual(design);
  });

  it('ignores rows that are not My Designs (e.g. made at checkout with an empty canvas)', () => {
    expect(fromRow({ id: design.id, name: 'x', canvas_json: {}, updated_at: '' })).toBeNull();
  });
});
