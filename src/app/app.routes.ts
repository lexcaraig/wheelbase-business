import { Routes } from '@angular/router';
import { AuthGuard, GuestGuard, NeedsBusinessGuard } from './core/auth/auth.guard';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { CallbackComponent } from './features/auth/callback/callback.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  // Root redirect to dashboard
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  // OAuth callback (no guard - handles auth state internally)
  {
    path: 'auth/callback',
    component: CallbackComponent
  },

  // Auth routes (guest only)
  {
    path: '',
    component: AuthLayoutComponent,
    canActivate: [GuestGuard],
    children: [
      {
        path: 'login',
        component: LoginComponent
      }
    ]
  },

  // Claim provider route (logged in, with provider ID parameter)
  {
    path: 'claim/:providerId',
    component: AuthLayoutComponent,
    canActivate: [NeedsBusinessGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/claim/claim-provider.component').then(m => m.ClaimProviderComponent)
      }
    ]
  },

  // Claim route without provider ID (shows search/instructions)
  {
    path: 'claim',
    component: AuthLayoutComponent,
    canActivate: [NeedsBusinessGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/claim/claim-provider.component').then(m => m.ClaimProviderComponent)
      }
    ]
  },

  // Protected routes (logged in with business)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      // Phase 2 routes (placeholders)
      {
        path: 'products',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'appointments',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      }
    ]
  },

  // Catch all - redirect to dashboard
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
