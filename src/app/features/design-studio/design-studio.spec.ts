import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DesignStudio } from './design-studio';

describe('DesignStudio', () => {
  let component: DesignStudio;
  let fixture: ComponentFixture<DesignStudio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignStudio],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DesignStudio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
