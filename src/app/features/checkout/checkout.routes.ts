import { Routes } from '@angular/router';

export const CHECKOUT_ROUTES: Routes = [
  {
    path: '',
    title: "Thanh toán & Đặt hàng | CaseEYE's",
    loadComponent: () => import('./checkout').then((m) => m.Checkout),
  },
];
