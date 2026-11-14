import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthState } from './core/auth-state/auth-state';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title:"CasEYE's",
    loadComponent: () => import("./features/landing/landing").then((m) => m.Landing),
  },
  {
    path:'design-studio',
    pathMatch:'full',
    loadChildren: ()=>import("./features/design-studio/design-studio.routes").then(m => m.DESIGN_STUDIO_ROUTES)
  },
  {
    path:'cart',
    canActivate: [() => inject(AuthState).requireLogin('/cart')],
    pathMatch: 'full',
    loadChildren: ()=>import("./features/cart/cart.routes").then((m) => m.CART_ROUTES),
  },
  {
    path:'shop',
    loadChildren: ()=>import("./features/shop/shop.routes").then((m) => m.SHOP_ROUTES),
  },
  {
    path:'auth/login',
    title:"Đăng nhập | CasEYE's",
    loadComponent: () => import('./features/auth/login').then(m => m.Login),
  },
  {
    path:'account',
    pathMatch: 'full',
    loadChildren:()=>import("./features/account/account.routes").then((m) => m.ACCOUNT_ROUTES),
  },
  {
    path:'customer-support',
    pathMatch: 'full',
    loadChildren:()=>import("./features/customer-support/customer-support.routes").then((m) => m.SUPPORT_ROUTES),
  },
  {
    path:'**',
    title:"Not found T~T",
    loadComponent:()=>import("./core/not-found/not-found").then(m => m.NotFound)
  }
];
