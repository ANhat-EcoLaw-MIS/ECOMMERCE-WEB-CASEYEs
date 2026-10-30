import { Routes } from '@angular/router';
import {authGuard} from '../../core/auth/auth-guard';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    title: "Hồ sơ | CasEYE's",
    canActivate: [authGuard],
    loadComponent: () => import('./account').then((m) => m.Account),
  },
  // Teammates: add this module's child routes below, e.g.
  // { path: ':id', loadComponent: () => import('./detail/detail').then((m) => m.Detail) },
];
