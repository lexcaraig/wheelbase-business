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
      // Orders management
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/order-list.component').then(m => m.OrderListComponent)
      },
      // Products management
      {
        path: 'products',
        loadComponent: () => import('./features/products/product-list.component').then(m => m.ProductListComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./features/services/service-list.component').then(m => m.ServiceListComponent)
      },
      {
        path: 'appointments',
        loadComponent: () => import('./features/appointments/appointment-list.component').then(m => m.AppointmentListComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/analytics-dashboard.component').then(m => m.AnalyticsDashboardComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },

  // Catch all - redirect to dashboard
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
