import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DesignStudio } from './design-studio';
import { SavedDesignSync } from './services/saved-design-sync';

describe('DesignStudio', () => {
  let component: DesignStudio;
  let fixture: ComponentFixture<DesignStudio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignStudio],
      providers: [
        provideRouter([]),
        // "Thiết kế của tôi" sync talks to Supabase; not needed to render the studio.
        { provide: SavedDesignSync, useValue: { attach: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DesignStudio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
