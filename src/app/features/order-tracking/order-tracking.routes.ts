import { Routes } from '@angular/router';

export const ORDER_TRACKING_ROUTES: Routes = [
  {
    path: '',
    title: "Theo dõi đơn hàng | CasEYE's",
    loadComponent: () => import('./order-tracking').then((m) => m.OrderTracking),
  },
  {
    path: ':orderCode',
    title: "Chi tiết đơn hàng | CasEYE's",
    loadComponent: () => import('./order-tracking').then((m) => m.OrderTracking),
  },
];
