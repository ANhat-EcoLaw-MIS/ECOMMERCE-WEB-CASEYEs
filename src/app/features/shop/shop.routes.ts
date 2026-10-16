import { Routes } from '@angular/router';

export const SHOP_ROUTES: Routes = [
  {
    path: '',
    title: "Cửa hàng | CasEYE's",
    loadComponent: () => import('./shop').then((m) => m.Shop),
  },
  // Teammates: add this module's child routes below, e.g.
  // { path: ':id', loadComponent: () => import('./detail/detail').then((m) => m.Detail) },
];
