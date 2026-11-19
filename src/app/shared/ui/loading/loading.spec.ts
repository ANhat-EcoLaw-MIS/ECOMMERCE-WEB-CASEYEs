import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Loading } from './loading';
import { LoadingOverlay } from './loading-overlay';

describe('Loading', () => {
  const render = async (inputs: Record<string, unknown>) => {
    const fixture = TestBed.createComponent(Loading);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders a profile skeleton immediately, announced as busy', async () => {
    const el = await render({ variant: 'skeleton', preset: 'profile', label: 'Đang tải hồ sơ' });
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('Đang tải hồ sơ');
    expect(el.querySelectorAll('app-skeleton').length).toBeGreaterThan(8);
  });

  it('repeats list rows by count', async () => {
    const el = await render({ variant: 'skeleton', preset: 'list', count: 5 });
    expect(el.querySelectorAll('app-skeleton').length).toBe(10);
  });

  it('waits before showing a spinner, so fast loads never flash', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(Loading);
    fixture.componentRef.setInput('variant', 'spinner');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner')).toBeNull();
    vi.advanceTimersByTime(200);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner')).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('LoadingOverlay', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('stays up for the minimum duration once shown', () => {
    const overlay = TestBed.inject(LoadingOverlay);
    const hide = overlay.show({ title: 'Đang lưu…', minDuration: 500 });
    expect(overlay.active()?.title).toBe('Đang lưu…');
    hide();
    vi.advanceTimersByTime(300);
    expect(overlay.active()).not.toBeNull();
    vi.advanceTimersByTime(250);
    expect(overlay.active()).toBeNull();
  });

  it('never appears when the work ends before the delay', () => {
    const overlay = TestBed.inject(LoadingOverlay);
    const hide = overlay.show({ title: 'Nhanh', delay: 300 });
    vi.advanceTimersByTime(100);
    hide();
    vi.advanceTimersByTime(1000);
    expect(overlay.active()).toBeNull();
  });

  it('a newer pop-up is not closed by an older one finishing', () => {
    const overlay = TestBed.inject(LoadingOverlay);
    const hideA = overlay.show({ title: 'A', minDuration: 0 });
    overlay.show({ title: 'B' });
    hideA();
    vi.advanceTimersByTime(10);
    expect(overlay.active()?.title).toBe('B');
  });
});
