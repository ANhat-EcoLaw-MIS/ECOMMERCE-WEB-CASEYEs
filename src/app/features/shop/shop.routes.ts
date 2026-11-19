import { Routes } from '@angular/router';

export const SHOP_ROUTES: Routes = [
  {
    path: '',
    title: "Cửa hàng | CasEYE's",
    loadComponent: () => import('./shop').then((m) => m.Shop),
  },
  {
    path: 'phu-kien/:id',
    title: "Phụ kiện | CasEYE's",
    loadComponent: () => import('./accessory-detail/accessory-detail').then((m) => m.AccessoryDetail),
  },
  { path: ':id', title: "Chi tiết sản phẩm | CasEYE's", loadComponent: () => import('./product-detail/product-detail').then(m => m.ProductDetail) },
  // Teammates: add this module's child routes below, e.g.
  // { path: ':id', loadComponent: () => import('./detail/detail').then((m) => m.Detail) },
];
