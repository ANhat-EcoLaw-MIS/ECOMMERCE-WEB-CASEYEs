import { Routes } from '@angular/router';

export const DESIGN_STUDIO_ROUTES: Routes = [
  {
    path: '',
    title: "Thiết kế | CasEYE's",
    loadComponent: () => import('./design-studio').then((m) => m.DesignStudio),
  },
  // Teammates: add this module's child routes below, e.g.
  // { path: ':id', loadComponent: () => import('./detail/detail').then((m) => m.Detail) },
];
