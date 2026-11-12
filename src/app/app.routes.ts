import { Routes } from '@angular/router';
import { ShellLayout } from './core/layout/shell-layout/shell-layout';
import { AdminLayout } from './core/layout/admin-layout/admin-layout';
import { roleGuard } from './core/auth/role-guard';

export const routes: Routes = [
  {
    path: 'account/onboarding',
    pathMatch: 'full',
    title: "Thiết lập tài khoản | CasEYE's",
    loadChildren: () =>
      import('./features/account/onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
  },
  {
    // Back office (staff only), separate from the customer ShellLayout.
    path: 'admin',
    children: [
      {
        path: 'dang-nhap',
        title: "Đăng nhập nhân viên | CasEYE's",
        loadComponent: () => import('./core/auth/staff-sign-in/staff-sign-in').then((m) => m.StaffSignIn),
      },
      {
        path: '',
        component: AdminLayout,
        canActivate: [roleGuard()],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'order-tracking' },
          {
            path: 'order-tracking',
            loadChildren: () =>
              import('./features/order-tracking/order-tracking.routes').then((m) => m.ORDER_TRACKING_ADMIN_ROUTES),
          },
        ],
      },
    ],
  },
  {
    path: '',
    component: ShellLayout,
    title: "CasEYE's",
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: "CasEYE's",
        loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
      },
      {
        path: 'design-studio',
        title: "Thiết kế | CasEYE's",
        loadChildren: () =>
          import('./features/design-studio/design-studio.routes').then((m) => m.DESIGN_STUDIO_ROUTES),
      },
      {
        path: 'cart',
        title: "Giỏ hàng | CasEYE's",
        loadChildren: () => import('./features/cart/cart.routes').then((m) => m.CART_ROUTES),
      },
      {
        path: 'checkout',
        title: "Thanh toán | CasEYE's",
        loadChildren: () =>
          import('./features/checkout/checkout.routes').then((m) => m.CHECKOUT_ROUTES),
      },
      {
        path: 'shop',
        title: "Cửa hàng | CasEYE's",
        loadChildren: () => import('./features/shop/shop.routes').then((m) => m.SHOP_ROUTES),
      },
      {
        path: 'account',
        title: "Tài khoản | CasEYE's",
        loadChildren: () => import('./features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
      {
        path: 'customer-support',
        title: "Hỗ trợ | CasEYE's",
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
        title: "Kiểm thử | CasEYE's",
        loadComponent: () => import('./core/demo/demo').then((m) => m.Demo),
      },
      {
        path: 'auth', // /auth/login, /auth/register, /auth/forgot-password, /auth/reset-password
        title: "Xác thực | CasEYE's",
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
      {
        path: '**',
        title: 'Not found T~T',
        loadComponent: () => import('./core/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
