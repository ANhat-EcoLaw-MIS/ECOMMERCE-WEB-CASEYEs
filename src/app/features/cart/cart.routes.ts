import { Routes } from '@angular/router';

export const CART_ROUTES: Routes = [
  {
    path: '',
    title: "Giỏ hàng | CaseEYE's",
    loadComponent: () => import('./cart').then((m) => m.Cart),
  },
  // Teammates: add this module's child routes below, e.g.
  // { path: ':id', loadComponent: () => import('./detail/detail').then((m) => m.Detail) },
];
