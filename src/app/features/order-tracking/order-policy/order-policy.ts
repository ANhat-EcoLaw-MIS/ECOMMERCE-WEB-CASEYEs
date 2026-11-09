import { ChangeDetectionStrategy, Component, Injector, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { POLICY_HIGHLIGHTS, POLICY_SECTIONS, POLICY_VERSION } from '../config/order-policy';
import { track } from '../services/tracker';

/**
 * FR-OT-17 / P1-17: full order policy owned by Quản lý đơn hàng. Summary first, sticky table of
 * contents (dropdown on mobile), each section an accordion reachable by #id from pop-ups.
 */
@Component({
  selector: 'app-order-policy',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-policy.html',
  host: { '(window:hashchange)': 'openFromHash()' },
})
export class OrderPolicy {
  protected readonly version = POLICY_VERSION;
  protected readonly highlights = POLICY_HIGHLIGHTS;
  protected readonly sections = POLICY_SECTIONS;
  /** First section open by default; a #hash opens its section. */
  protected readonly open = signal<ReadonlySet<string>>(new Set([POLICY_SECTIONS[0].id]));

  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // Other modules link here with a fragment, e.g. routerLink="/order-tracking/chinh-sach"
    // fragment="hoan-tien". Wait for the first render so the section exists before scrolling.
    afterNextRender(() => this.openFromHash());
  }

  protected isOpen(id: string): boolean {
    return this.open().has(id);
  }

  protected toggle(id: string, event: Event): void {
    const opened = (event.target as HTMLDetailsElement).open;
    this.open.update((s) => {
      const next = new Set(s);
      if (opened) next.add(id);
      else next.delete(id);
      return next;
    });
    if (opened) track('policy_section_opened', { section: id });
  }

  protected goTo(id: string): void {
    this.open.update((s) => new Set([...s, id]));
    history.replaceState(null, '', `${location.pathname}#${id}`);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Scroll after the opened section is rendered, otherwise the position is wrong.
    afterNextRender(
      () => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
      { injector: this.injector },
    );
    track('policy_section_opened', { section: id });
  }

  protected onSelect(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id) this.goTo(id);
  }

  protected openFromHash(): void {
    const id = this.route.snapshot.fragment ?? location.hash.slice(1);
    if (id && this.sections.some((s) => s.id === id)) this.goTo(id);
  }
}
