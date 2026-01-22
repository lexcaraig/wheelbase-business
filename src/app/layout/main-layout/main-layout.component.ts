import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { VERIFICATION_STATUS_LABELS } from '../../core/models/business.model';

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
    <div class="min-h-screen bg-background-DEFAULT flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-background-secondary border-r border-gray-700 flex flex-col">
        <!-- Logo -->
        <div class="p-6 border-b border-gray-700">
          <h1 class="text-2xl font-bold text-primary">Wheelbase</h1>
          <p class="text-text-muted text-sm mt-1">Business Portal</p>
        </div>

        <!-- Business Info -->
        <div class="p-4 border-b border-gray-700">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-background-tertiary flex items-center justify-center">
              @if (authService.business()?.logoUrl) {
                <img
                  [src]="authService.business()?.logoUrl"
                  alt="Business logo"
                  class="w-10 h-10 rounded-full object-cover"
                />
              } @else {
                <i class="pi pi-building text-text-muted"></i>
              }
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-text-primary font-medium truncate">
                {{ authService.business()?.businessName }}
              </p>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                [ngClass]="getStatusClass()"
              >
                {{ getStatusLabel() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4">
          <ul class="space-y-2">
            @for (item of navItems; track item.route) {
              @if (!item.requiresApproval || authService.isApproved()) {
                <li>
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="bg-primary/10 text-primary border-l-2 border-primary"
                    class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:bg-background-tertiary hover:text-text-primary transition-colors"
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
        <div class="p-4 border-t border-gray-700">
          <button
            (click)="logout()"
            class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:bg-background-tertiary hover:text-text-primary transition-colors"
          >
            <i class="pi pi-sign-out"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col">
        <!-- Top Bar -->
        <header class="h-16 bg-background-secondary border-b border-gray-700 flex items-center justify-between px-6">
          <div>
            <!-- Breadcrumb or page title can go here -->
          </div>
          <div class="flex items-center gap-4">
            <button class="p-2 rounded-lg hover:bg-background-tertiary text-text-secondary">
              <i class="pi pi-bell"></i>
            </button>
            <button class="p-2 rounded-lg hover:bg-background-tertiary text-text-secondary">
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

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/dashboard' },
    { label: 'Products', icon: 'pi-box', route: '/products', requiresApproval: true },
    { label: 'Services', icon: 'pi-wrench', route: '/services', requiresApproval: true },
    { label: 'Appointments', icon: 'pi-calendar', route: '/appointments', requiresApproval: true },
    { label: 'Analytics', icon: 'pi-chart-bar', route: '/analytics', requiresApproval: true },
    { label: 'Settings', icon: 'pi-cog', route: '/settings' },
  ];

  getStatusClass(): string {
    const status = this.authService.verificationStatus();
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'approved':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      case 'suspended':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  }

  getStatusLabel(): string {
    const status = this.authService.verificationStatus();
    return status ? VERIFICATION_STATUS_LABELS[status] : 'Unknown';
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }
}
