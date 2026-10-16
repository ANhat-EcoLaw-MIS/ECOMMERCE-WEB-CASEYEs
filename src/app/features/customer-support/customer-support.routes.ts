import { Routes } from '@angular/router';

export const SUPPORT_ROUTES: Routes = [
  {
    path: '',
    title: "Hỗ trợ | CasEYE's",
    loadComponent: () => import('./customer-support').then((m) => m.CustomerSupport),
  },
  // Teammates: add this module's child routes below, e.g.
  // { path: ':id', loadComponent: () => import('./detail/detail').then((m) => m.Detail) },
];
