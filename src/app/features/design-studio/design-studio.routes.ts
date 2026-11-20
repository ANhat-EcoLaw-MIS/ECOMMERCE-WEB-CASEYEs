import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

const designStudioEntryGuard: CanActivateFn = () => {
  const router = inject(Router);
  const activeModel =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('caseyes_active_model')
      : null;

  // Khi mới vào Design Studio nếu chưa có model đã chọn, mở modal chọn dòng máy trên kho mẫu
  if (!activeModel) {
    return router.parseUrl('/design-studio/templates?selectModel=true');
  }
  return router.parseUrl('/design-studio/templates');
};

export const DESIGN_STUDIO_ROUTES: Routes = [
  {
    path: '',
    title: "Phòng Thiết Kế Ốp Lưng | CasEYE's",
    loadComponent: () => import('./design-studio').then((m) => m.DesignStudio),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [designStudioEntryGuard],
        children: [],
      },
      {
        path: 'select-model',
        pathMatch: 'full',
        redirectTo: 'templates',
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
