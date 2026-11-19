import { Routes } from '@angular/router';
import { customerGuard } from './order-tracking.guards';
import { OrderTrackingService } from './services/order-tracking.service';
import { SupabaseOrderStore } from './services/supabase-order-store';
import { DemoOrderFactory } from './services/demo-order-factory';

/** Customer pages (ShellLayout). No demo tools here: they live in the admin area. */
export const ORDER_TRACKING_ROUTES: Routes = [
  {
    path: '',
    title: "Đơn hàng của tôi | CasEYE's",
    canActivate: [customerGuard],
    loadComponent: () => import('./order-tracking').then((m) => m.OrderTracking),
  },
  {
    path: 'chinh-sach',
    title: "Chính sách đơn hàng | CasEYE's",
    loadComponent: () => import('./order-policy/order-policy').then((m) => m.OrderPolicy),
  },
  // Old Demo Console URL (also with ?demo=1) now goes to the admin simulator.
  { path: 'demo', redirectTo: '/admin/order-tracking/simulator', pathMatch: 'full' },
  {
    path: ':orderCode',
    title: "Chi tiết đơn hàng | CasEYE's",
    canActivate: [customerGuard],
    loadComponent: () => import('./order-detail/order-detail').then((m) => m.OrderDetail),
  },
];

/**
 * Admin pages, mounted under /admin/order-tracking (AdminLayout + roleGuard).
 * The order services are re-provided here so the admin gets its own instances, bound to the
 * staff session/client from provideStaffScope(), instead of the customer's root instances.
 */
export const ORDER_TRACKING_ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [OrderTrackingService, SupabaseOrderStore, DemoOrderFactory],
    children: [
      {
        path: '',
        title: "Quản lý đơn hàng | CasEYE's Admin",
        loadComponent: () => import('./admin/admin-orders').then((m) => m.AdminOrders),
      },
      {
        path: 'simulator',
        title: "Mô phỏng đơn hàng | CasEYE's Admin",
        data: { mode: 'simulator' },
        loadComponent: () => import('./demo-console/demo-console').then((m) => m.DemoConsole),
      },
    ],
  },
];
