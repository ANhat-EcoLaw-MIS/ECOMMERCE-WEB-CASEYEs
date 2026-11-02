import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TestRepository } from '../../supabase/supabase-repository';
import { Footer } from './footer';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;
  let testRepository: Pick<TestRepository, 'list'>;

  beforeEach(async () => {
    testRepository = {
      list: async () => ({ data: [], error: null }),
    };

    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [
        provideRouter([]),
        { provide: TestRepository, useFactory: () => testRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reports a successful connection when the test table is empty', () => {
    fixture.detectChanges();

    expect(component.connectionStatus()).toBe('connected');
    expect(component.testRows()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('The query succeeded, but the table is empty.');
  });

  it('renders rows returned from the test table', async () => {
    testRepository.list = async () => ({
      data: [{ id: 'test-id', title: 'Fetched from Supabase' }],
      error: null,
    });

    await component.checkDatabaseConnection();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Fetched from Supabase (test-id)');
  });

  it('shows the repository error when the test-table query fails', async () => {
    testRepository.list = async () => ({
      data: null,
      error: { message: 'Not authorized' },
    });

    await component.checkDatabaseConnection();
    fixture.detectChanges();

    expect(component.connectionStatus()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('Not authorized');
  });
});
