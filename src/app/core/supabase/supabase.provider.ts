// supabase.provider.ts
import {SUPABASE_CONFIG, SupabaseConfig} from './supabase.config';
import {EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer} from '@angular/core';
import {SupabaseAuthService} from './supabase-auth.service';

export const provideSupabase = (config: SupabaseConfig): EnvironmentProviders =>
  makeEnvironmentProviders([
    { provide: SUPABASE_CONFIG, useValue: config },
    provideAppInitializer(() => inject(SupabaseAuthService).init()), // restore session before guards run
  ]);
