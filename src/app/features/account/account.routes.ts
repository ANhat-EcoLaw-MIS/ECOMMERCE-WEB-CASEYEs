import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth-guard';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    title: "Tài khoản & Đơn mua | CasEYE's",
    canActivate: [authGuard],
    loadComponent: () => import('../order-tracking/order-tracking').then((m) => m.OrderTracking),
  },
  {
    path: 'orders',
    title: "Đơn mua | CasEYE's",
    canActivate: [authGuard],
    loadComponent: () => import('../order-tracking/order-tracking').then((m) => m.OrderTracking),
  },
];
