/**
 * Behaviour tracking (P2, BR-OT-06): a JSON queue in localStorage, no personal data.
 * Each event: { name, ts, orderCode?, props }. The Demo Console "Insights" tab reads it.
 */
export const EVENTS_KEY = 'ot_events_v1';
const MAX_EVENTS = 2000;

export type TrackEventName =
  | 'order_list_viewed'
  | 'tab_changed'
  | 'order_search'
  | 'order_detail_viewed'
  | 'edd_why_opened'
  | 'design_preview_opened'
  | 'cancel_clicked'
  | 'cancel_reason_selected'
  | 'cancel_submitted'
  | 'cancel_withdrawn'
  | 'refund_method_chosen'
  | 'issue_reported'
  | 'received_confirmed'
  | 'rating_submitted'
  | 'reorder_clicked'
  | 'policy_section_opened'
  | 'notification_clicked';

export interface TrackEvent {
  readonly name: TrackEventName;
  readonly ts: string;
  readonly orderCode?: string;
  readonly props: Readonly<Record<string, string | number | boolean | readonly string[]>>;
}

export function readEvents(): TrackEvent[] {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(EVENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as { schemaVersion: number; events: TrackEvent[] }) : null;
    return parsed?.schemaVersion === 1 ? parsed.events : [];
  } catch {
    return [];
  }
}

export function track(name: TrackEventName, props: TrackEvent['props'] = {}, orderCode?: string): void {
  try {
    const events = readEvents();
    events.push({ name, ts: new Date().toISOString(), orderCode, props });
    localStorage.setItem(EVENTS_KEY, JSON.stringify({ schemaVersion: 1, events: events.slice(-MAX_EVENTS) }));
  } catch {
    // Tracking must never break the customer flow.
  }
}

export function clearEvents(): void {
  localStorage.removeItem(EVENTS_KEY);
}
