import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import {provideRouter, withComponentInputBinding} from '@angular/router';
import { routes } from './app.routes';
import {provideSupabase} from './core/supabase/supabase.provider';
import {environment} from '../environments/environment';
import { SupabaseAuthService } from './core/supabase/supabase-auth.service';
import { OrderIntake } from './shared/services/order-intake';
import { OrderTrackingService } from './features/order-tracking/services/order-tracking.service';
import { CustomerOrderFeed } from './shared/services/customer-order-feed';
import { OrderTrackingCustomerFeed } from './features/order-tracking/services/customer-order-feed.impl';
import { AutoJobs } from './features/order-tracking/services/auto-jobs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideSupabase({url:environment.supabaseUrl, key:environment.supabaseKey}),
    provideAppInitializer(() => inject(SupabaseAuthService).init()),
    // Thanh toán creates orders through this port; Quản lý đơn hàng implements it.
    { provide: OrderIntake, useExisting: OrderTrackingService },
    // Tài khoản reads the customer's orders through this port.
    { provide: CustomerOrderFeed, useExisting: OrderTrackingCustomerFeed },
    // Order time limits (16:00 production run, 72h auto-complete, 14-day hold…) run on their own.
    provideAppInitializer(() => inject(AutoJobs).start()),
  ]
};
