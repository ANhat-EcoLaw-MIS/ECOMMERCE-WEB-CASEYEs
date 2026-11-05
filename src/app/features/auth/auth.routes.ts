import { Route, Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guest-guard';

const page = (path: string, title: string, mode: string, guestOnly = true): Route => ({
  path,
  title: `${title} | CaseCraft`,
  data: { mode },
  canActivate: guestOnly ? [guestGuard] : [],
  loadComponent: () => import('./auth').then((m) => m.Auth),
});

export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  page('login', 'Đăng nhập', 'login'),
  page('register', 'Đăng ký', 'register'),
  page('forgot-password', 'Quên mật khẩu', 'forgot'),
  page('reset-password', 'Đặt lại mật khẩu', 'reset', false),
];
