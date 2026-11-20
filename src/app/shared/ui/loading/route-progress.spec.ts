import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouteProgress } from './route-progress';

@Component({ template: '' })
class Blank {}

/** Guard that takes `ms` to resolve, to simulate a slow lazy route. */
const slow = (ms: number) => () => new Promise<boolean>((r) => setTimeout(() => r(true), ms));

describe('RouteProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'fast', component: Blank },
          { path: 'slow', component: Blank, canActivate: [slow(2000)] },
        ]),
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  const fill = (el: HTMLElement) => el.querySelector<HTMLElement>('.fill')!;

  it('stays hidden for fast navigations', async () => {
    const fixture = TestBed.createComponent(RouteProgress);
    await TestBed.inject(Router).navigateByUrl('/fast');
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(fill(fixture.nativeElement).style.opacity).toBe('0');
  });

  it('creeps forward on slow navigations, then completes and fades', async () => {
    const fixture = TestBed.createComponent(RouteProgress);
    const el = fixture.nativeElement as HTMLElement;
    const nav = TestBed.inject(Router).navigateByUrl('/slow');

    await vi.advanceTimersByTimeAsync(1200);
    fixture.detectChanges();
    expect(fill(el).style.opacity).toBe('1');
    const mid = Number(el.getAttribute('aria-valuenow'));
    expect(mid).toBeGreaterThan(8);
    expect(mid).toBeLessThan(90);

    await vi.advanceTimersByTimeAsync(900);
    await nav;
    fixture.detectChanges();
    expect(fill(el).style.transform).toBe('scaleX(1)');

    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(fill(el).style.opacity).toBe('0');
  });
});
