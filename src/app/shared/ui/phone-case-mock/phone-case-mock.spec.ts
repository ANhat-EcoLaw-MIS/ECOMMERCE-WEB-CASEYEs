import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneCaseMock } from './phone-case-mock';

describe('PhoneCaseMock', () => {
  let component: PhoneCaseMock;
  let fixture: ComponentFixture<PhoneCaseMock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhoneCaseMock],
    }).compileComponents();

    fixture = TestBed.createComponent(PhoneCaseMock);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
