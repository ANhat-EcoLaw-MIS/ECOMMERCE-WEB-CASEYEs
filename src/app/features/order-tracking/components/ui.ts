/** Shared Tailwind class strings for this feature (keeps buttons identical everywhere). */
export const BTN_PRIMARY =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-brand-800 px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none';

export const BTN_SECONDARY =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border-[1.5px] border-brand-800 bg-transparent px-5 text-sm font-semibold text-brand-800 transition-colors duration-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:pointer-events-none disabled:opacity-50';

export const BTN_GHOST =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-400 disabled:opacity-50';

export const FIELD =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-brand-400 focus:ring-2 focus:ring-brand-200';

export const LABEL = 'mb-1.5 block text-sm font-semibold text-ink';

/** Simulated round-trip so the "waiting" state of EX-06 is visible in the mock. */
export function simulateLatency(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
