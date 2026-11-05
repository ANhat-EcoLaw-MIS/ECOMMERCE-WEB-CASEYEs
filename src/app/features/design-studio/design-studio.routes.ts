import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

const modelOnboardingGuard: CanActivateFn = () => {
  const router = inject(Router);
  const activeModel =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('caseyes_active_model')
      : null;

  if (activeModel) {
    return router.parseUrl('/design-studio/templates');
  }
  return router.parseUrl('/design-studio/select-model');
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
        canActivate: [modelOnboardingGuard],
        children: [],
      },
      {
        path: 'select-model',
        title: "Chọn Dòng Máy | CasEYE's Design Studio",
        loadComponent: () =>
          import('./components/model-picker/model-picker').then((m) => m.ModelPicker),
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
