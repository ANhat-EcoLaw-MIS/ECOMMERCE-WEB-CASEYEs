import { Routes } from '@angular/router';

export const DESIGN_STUDIO_ROUTES: Routes = [
  {
    path: '',
    title: "Phòng Thiết Kế Ốp Lưng | CasEYE's",
    loadComponent: () => import('./design-studio').then((m) => m.DesignStudio),
    children: [
      {
        path: '',
        redirectTo: 'templates',
        pathMatch: 'full',
      },
      {
        path: 'templates',
        title: "Kho Mẫu Thiết Kế | CasEYE's",
        loadComponent: () =>
          import('./components/template-browser/template-browser').then((m) => m.TemplateBrowser),
      },
      {
        path: 'editor',
        title: "Studio Thiết Kế Canvas | CasEYE's",
        loadComponent: () =>
          import('./components/studio-workspace/studio-workspace').then((m) => m.StudioWorkspace),
      },
    ],
  },
];
