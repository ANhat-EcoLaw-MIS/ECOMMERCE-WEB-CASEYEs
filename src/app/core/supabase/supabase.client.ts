import {InjectionToken} from '@angular/core';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {inject} from '@angular/core';
import {SUPABASE_CONFIG} from './supabase.config';
import {Database} from './database.types';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient<Database>>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => {
    const { url, key } = inject(SUPABASE_CONFIG);
    if (!url || !key) throw new Error('Supabase URL/key missing in environment');
    return createClient<Database>(url, key);
  },
});

