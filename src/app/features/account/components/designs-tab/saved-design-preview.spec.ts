import { TestBed } from '@angular/core/testing';
import type { SavedDesignItem } from '../../../design-studio/services/studio-state';
import { SavedDesignPreview } from './saved-design-preview';

const design = {
  id: 'd1',
  name: 'Good vibes',
  modelId: 'iphone-15-pro-max',
  modelName: 'iPhone 15 Pro Max',
  material: 'standard',
  bg: 'linear-gradient(#fff, #eee)',
  layerCount: 2,
  savedAt: '19/11/2026',
  layers: [
    { id: 't', type: 'text', name: 'text', x: 50, y: 40, width: 80, rotation: 10, zIndex: 2, opacity: 1, content: 'Good vibes', fontFamily: 'Inter', fontSize: 30, textColor: '#111', textAlign: 'center', fontWeight: 'bold' },
    { id: 's', type: 'sticker', name: 'star', x: 30, y: 70, width: 40, rotation: 0, zIndex: 1, opacity: 0.8, assetUrl: '/x.svg', flipH: true },
  ],
} as unknown as SavedDesignItem;

describe('SavedDesignPreview', () => {
  it('renders the studio canvas geometry (300×632 stage, one centring transform, px sizes of the canvas)', async () => {
    const fixture = TestBed.createComponent(SavedDesignPreview);
    fixture.componentRef.setInput('design', design);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const stage = el.firstElementChild as HTMLElement;
    expect(stage.style.width).toBe('300px');
    expect(stage.style.height).toBe('632px');

    const [text, sticker] = Array.from(stage.querySelectorAll<HTMLElement>(':scope > div.absolute[style*="left"]'));
    // Only the inline transform centres the layer (no extra Tailwind translate on top of it).
    expect(text.className).not.toContain('translate');
    expect(text.style.transform).toBe('translate(-50%, -50%) rotate(10deg)');
    expect(text.style.left).toBe('50%');

    const box = text.querySelector<HTMLElement>('.whitespace-pre-wrap')!;
    expect(box.style.width).toBe('240px'); // 80% of the 300px canvas
    expect(box.style.fontSize).toBe('30px'); // same px as the studio, scaled with the stage

    expect(sticker.querySelector<HTMLElement>('img')!.style.width).toBe('120px');
    expect(sticker.firstElementChild!.getAttribute('style')).toContain('scaleX(-1)');
  });
});
