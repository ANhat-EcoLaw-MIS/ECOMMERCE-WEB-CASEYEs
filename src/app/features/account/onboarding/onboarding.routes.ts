import { Routes } from '@angular/router';
import { onboardingGuard } from './onboarding-guard';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    title: "Thiết lập tài khoản | CasEYE's",
    canActivate: [onboardingGuard],
    loadComponent: () => import('./onboarding').then((m) => m.Onboarding),
  },
];
