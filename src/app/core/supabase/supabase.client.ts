import { InjectionToken, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase.config';
import { Database } from './database.types';

function create(storageKey?: string): SupabaseClient<Database> {
  const { url, key } = inject(SUPABASE_CONFIG);
  if (!url || !key) throw new Error('Supabase URL/key missing in environment');
  return createClient<Database>(url, key, storageKey ? { auth: { storageKey } } : undefined);
}

/** Customer app client (storefront, account, studio, customer order pages). */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient<Database>>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => create(),
});

/**
 * Back-office (mock admin) client. Its own storageKey gives it a separate auth session, so a staff
 * sign-in never replaces the customer's session in the same browser (and vice versa).
 * Created lazily: only the /admin area injects it.
 */
export const STAFF_SUPABASE_CLIENT = new InjectionToken<SupabaseClient<Database>>('STAFF_SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => create('caseye-staff-auth'),
});
