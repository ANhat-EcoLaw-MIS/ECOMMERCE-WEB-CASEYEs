import { ViewportScroller } from '@angular/common';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import {provideRouter, withComponentInputBinding, withInMemoryScrolling} from '@angular/router';
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
    // New screen starts at the top; #fragment links (e.g. policy sections) still scroll to their section.
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    provideSupabase({url:environment.supabaseUrl, key:environment.supabaseKey}),
    provideAppInitializer(() => inject(SupabaseAuthService).init()),
    // Thanh toán creates orders through this port; Quản lý đơn hàng implements it.
    { provide: OrderIntake, useExisting: OrderTrackingService },
    // Tài khoản reads the customer's orders through this port.
    { provide: CustomerOrderFeed, useExisting: OrderTrackingCustomerFeed },
    // Order time limits (16:00 production run, 72h auto-complete, 14-day hold…) run on their own.
    provideAppInitializer(() => inject(AutoJobs).start()),
    // Keep #fragment targets clear of the sticky header (64px + breathing room).
    provideAppInitializer(() => inject(ViewportScroller).setOffset([0, 88])),
  ]
};
