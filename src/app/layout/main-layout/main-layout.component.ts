import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  requiresApproval?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-base-100 flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-base-200 border-r border-neutral flex flex-col">
        <!-- Logo -->
        <div class="p-6 border-b border-neutral">
          <h1 class="text-2xl font-bold text-primary">Wheelbase</h1>
          <p class="text-secondary text-sm mt-1">Business Portal</p>
        </div>

        <!-- Business Info -->
        <div class="p-4 border-b border-neutral">
          <div class="flex items-center gap-3">
            <div class="avatar placeholder">
              @if (authService.business()?.logoUrl) {
                <div class="w-10 rounded-full">
                  <img
                    [src]="authService.business()?.logoUrl"
                    alt="Business logo"
                  />
                </div>
              } @else {
                <div class="bg-base-300 w-10 rounded-full flex items-center justify-center">
                  <i class="pi pi-building text-secondary"></i>
                </div>
              }
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">
                {{ getBusinessName() }}
              </p>
              <span [ngClass]="getStatusClass()">
                {{ getStatusLabel() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4">
          <ul class="menu bg-base-200 rounded-box w-full">
            @for (item of navItems; track item.route) {
              @if (!item.requiresApproval || authService.isApproved()) {
                <li>
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                    class="flex items-center gap-3"
                    (click)="navigateTo(item.route)"
                  >
                    <i [class]="'pi ' + item.icon"></i>
                    <span>{{ item.label }}</span>
                  </a>
                </li>
              }
            }
          </ul>
        </nav>

        <!-- Bottom Actions -->
        <div class="p-4 border-t border-neutral">
          <button
            (click)="logout()"
            class="btn btn-ghost w-full justify-start gap-3"
          >
            <i class="pi pi-sign-out"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col">
        <!-- Top Bar -->
        <header class="navbar bg-base-200 border-b border-neutral px-6">
          <div class="flex-1">
            <!-- Breadcrumb or page title can go here -->
          </div>
          <div class="flex-none gap-2">
            <button class="btn btn-ghost btn-circle">
              <i class="pi pi-bell"></i>
            </button>
            <button class="btn btn-ghost btn-circle">
              <i class="pi pi-cog"></i>
            </button>
          </div>
        </header>

        <!-- Page Content -->
        <div class="flex-1 p-6 overflow-auto">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/dashboard' },
    { label: 'Orders', icon: 'pi-shopping-cart', route: '/orders', requiresApproval: true },
    { label: 'Products', icon: 'pi-box', route: '/products', requiresApproval: true },
    { label: 'Services', icon: 'pi-wrench', route: '/services', requiresApproval: true },
    { label: 'Appointments', icon: 'pi-calendar', route: '/appointments', requiresApproval: true },
    { label: 'Analytics', icon: 'pi-chart-bar', route: '/analytics', requiresApproval: true },
    { label: 'Settings', icon: 'pi-cog', route: '/settings' },
  ];

  getBusinessName(): string {
    return this.authService.business()?.businessName ||
           this.authService.claimedProvider()?.businessName ||
           'My Business';
  }

  getStatusClass(): string {
    const status = this.authService.verificationStatus();
    switch (status) {
      case 'pending':
        return 'badge badge-warning badge-sm';
      case 'approved':
      case 'verified':
        return 'badge badge-success badge-sm';
      case 'rejected':
        return 'badge badge-error badge-sm';
      case 'suspended':
        return 'badge badge-neutral badge-sm';
      default:
        return 'badge badge-neutral badge-sm';
    }
  }

  getStatusLabel(): string {
    const status = this.authService.verificationStatus();
    switch (status) {
      case 'pending':
        return 'Pending Approval';
      case 'approved':
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'suspended':
        return 'Suspended';
      default:
        return 'Unknown';
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  navigateTo(route: string): void {
    console.log('Navigating to:', route);
    this.router.navigate([route]);
  }
}
