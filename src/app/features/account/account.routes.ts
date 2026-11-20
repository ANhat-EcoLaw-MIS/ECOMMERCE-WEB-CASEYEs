import { Routes } from '@angular/router';
import {authGuard} from '../../core/auth/auth-guard';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    title: "Tài khoản | CasEYE's",
    canActivate: [authGuard],
    loadComponent: () => import('./account').then((m) => m.Account),
  },
];
