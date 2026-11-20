import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Landing } from './landing';
import { pickTrending } from './section/trending/trending';
import { TEMPLATE_CATALOG } from '../design-studio/components/template-browser/template-browser';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the catalog bento and three review cards', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('app-landing-catalog .tile').length).toBeGreaterThanOrEqual(10);
    expect(el.querySelectorAll('app-reviews figure').length).toBe(3);
  });
});

describe('pickTrending', () => {
  it('always includes the Chibi Creators design near the start, never the blank canvas', () => {
    for (let run = 0; run < 20; run++) {
      const list = pickTrending(TEMPLATE_CATALOG);
      const idx = list.findIndex((t) => t.id === 'tpl-creators-chibi');
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(3);
      expect(list.some((t) => t.isBlankCanvas)).toBe(false);
      expect(new Set(list.map((t) => t.id)).size).toBe(list.length);
    }
  });
});
