import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'interviews/create',
    loadComponent: () =>
      import('./features/interview-create/interview-create.component').then(
        m => m.InterviewCreateComponent,
      ),
  },
  {
    path: 'interviews/:id',
    loadComponent: () =>
      import('./features/interview-detail/interview-detail.component').then(
        m => m.InterviewDetailComponent,
      ),
  },
  {
    path: 'call/:id',
    loadComponent: () =>
      import('./features/call/call.component').then(m => m.CallComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
];
