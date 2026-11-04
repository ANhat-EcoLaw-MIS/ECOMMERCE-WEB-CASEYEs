import { Routes } from '@angular/router';
import { customerGuard, demoGuard } from './order-tracking.guards';

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
  {
    path: 'demo',
    title: "Demo Console | CasEYE's",
    canActivate: [demoGuard],
    loadComponent: () => import('./demo-console/demo-console').then((m) => m.DemoConsole),
  },
  {
    path: ':orderCode',
    title: "Chi tiết đơn hàng | CasEYE's",
    canActivate: [customerGuard],
    loadComponent: () => import('./order-detail/order-detail').then((m) => m.OrderDetail),
  },
];
