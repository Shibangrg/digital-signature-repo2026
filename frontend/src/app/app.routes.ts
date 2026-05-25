import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [GuestGuard],
  },
  {
    path: 'sign',
    loadComponent: () => import('./pages/sign/sign.component').then((m) => m.SignComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'verify',
    loadComponent: () => import('./pages/verify/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: 'logs',
    loadComponent: () => import('./pages/logs/logs.component').then((m) => m.LogsComponent),
    canActivate: [AuthGuard],
  },
  // --- NEW ADMIN DASHBOARD ROUTE ---
  {
    path: 'admin-team',
    loadComponent: () => import('./pages/admin-team/admin-team.component').then((m) => m.AdminTeamComponent),
    canActivate: [AuthGuard],
  },
];