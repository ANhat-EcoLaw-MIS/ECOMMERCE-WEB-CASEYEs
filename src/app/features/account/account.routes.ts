import { Routes } from '@angular/router';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    title: "Hồ sơ | CasEYE's",
    loadComponent: () => import('./account').then((m) => m.Account),
  },
  // Teammates: add this module's child routes below, e.g.
  // { path: ':id', loadComponent: () => import('./detail/detail').then((m) => m.Detail) },
];
