import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import {provideRouter, withComponentInputBinding} from '@angular/router';
import { routes } from './app.routes';
import {provideSupabase} from './core/supabase/supabase.provider';
import {environment} from '../environments/environment';
import { SupabaseAuthService } from './core/supabase/supabase-auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideSupabase({url:environment.supabaseUrl, key:environment.supabaseKey}),
    provideAppInitializer(() => inject(SupabaseAuthService).init()),
  ]
};
