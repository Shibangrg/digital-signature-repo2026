import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component'; // 1. Import the component
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { LoginComponent } from './pages/login/login.component';
import { LogsComponent } from './pages/logs/logs.component';
import { SignComponent } from './pages/sign/sign.component';
import { VerifyComponent } from './pages/verify/verify.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] }, // 2. Add the dashboard route
  { path: 'sign', component: SignComponent, canActivate: [authGuard] },
  { path: 'verify', component: VerifyComponent, canActivate: [authGuard] },
  { path: 'logs', component: LogsComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'sign', pathMatch: 'full' },
  { path: '**', redirectTo: 'sign' },
];