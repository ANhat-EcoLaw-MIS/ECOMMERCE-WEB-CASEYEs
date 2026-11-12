import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: "CasEYE's",
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'design-studio',
    loadChildren: () =>
      import('./features/design-studio/design-studio.routes').then((m) => m.DESIGN_STUDIO_ROUTES),
  },
  {
    path: 'cart',
    loadChildren: () => import('./features/cart/cart.routes').then((m) => m.CART_ROUTES),
  },
  {
    path: 'checkout',
    loadChildren: () =>
      import('./features/checkout/checkout.routes').then((m) => m.CHECKOUT_ROUTES),
  },
  {
    path: 'shop',
    loadChildren: () => import('./features/shop/shop.routes').then((m) => m.SHOP_ROUTES),
  },
  {
    path: 'account',
    loadChildren: () => import('./features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
  },
  {
    path: 'customer-support',
    loadChildren: () =>
      import('./features/customer-support/customer-support.routes').then((m) => m.SUPPORT_ROUTES),
  },
  {
    path: 'order-tracking',
    loadChildren: () =>
      import('./features/order-tracking/order-tracking.routes').then((m) => m.ORDER_TRACKING_ROUTES),
  },
  {
    path: 'test',
    loadComponent: () => import('./core/demo/demo').then((m) => m.Demo),
  },
  {
    path: 'auth', // /auth/login, /auth/register, /auth/forgot-password, /auth/reset-password
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '**',
    title: 'Not found T~T',
    loadComponent: () => import('./core/not-found/not-found').then((m) => m.NotFound),
  },
];
