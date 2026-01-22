import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import {
  BUSINESS_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
  SUBSCRIPTION_TIER_LABELS
} from '../../core/models/business.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text-primary">Dashboard</h1>
        <button
          (click)="refreshProfile()"
          class="btn-secondary flex items-center gap-2"
          [disabled]="isRefreshing"
        >
          <i class="pi pi-refresh" [ngClass]="{'pi-spin': isRefreshing}"></i>
          Refresh
        </button>
      </div>

      <!-- Verification Status Banner -->
      @switch (authService.verificationStatus()) {
        @case ('pending') {
          <div class="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div class="flex items-start gap-3">
              <i class="pi pi-clock text-yellow-400 text-xl mt-0.5"></i>
              <div>
                <h3 class="font-semibold text-yellow-400">Pending Approval</h3>
                <p class="text-text-secondary mt-1">
                  Your business account is currently under review. Our team typically
                  reviews applications within 24-48 hours. Once approved, you'll have
                  full access to all business features.
                </p>
              </div>
            </div>
          </div>
        }
        @case ('rejected') {
          <div class="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div class="flex items-start gap-3">
              <i class="pi pi-times-circle text-red-400 text-xl mt-0.5"></i>
              <div>
                <h3 class="font-semibold text-red-400">Application Rejected</h3>
                <p class="text-text-secondary mt-1">
                  {{ authService.business()?.rejectionReason || 'Your application was not approved. Please contact support for more information.' }}
                </p>
              </div>
            </div>
          </div>
        }
        @case ('suspended') {
          <div class="p-4 rounded-lg bg-gray-500/10 border border-gray-500/30">
            <div class="flex items-start gap-3">
              <i class="pi pi-ban text-gray-400 text-xl mt-0.5"></i>
              <div>
                <h3 class="font-semibold text-gray-400">Account Suspended</h3>
                <p class="text-text-secondary mt-1">
                  {{ authService.business()?.rejectionReason || 'Your account has been suspended. Please contact support.' }}
                </p>
              </div>
            </div>
          </div>
        }
        @case ('approved') {
          <div class="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div class="flex items-start gap-3">
              <i class="pi pi-check-circle text-green-400 text-xl mt-0.5"></i>
              <div>
                <h3 class="font-semibold text-green-400">Account Verified</h3>
                <p class="text-text-secondary mt-1">
                  Your business is verified and visible to the Wheelbase community.
                </p>
              </div>
            </div>
          </div>
        }
      }

      <!-- Quick Stats -->
      @if (authService.isApproved()) {
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="card">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <i class="pi pi-eye text-primary text-xl"></i>
              </div>
              <div>
                <p class="text-text-muted text-sm">Profile Views</p>
                <p class="text-2xl font-bold text-text-primary">0</p>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <i class="pi pi-box text-blue-400 text-xl"></i>
              </div>
              <div>
                <p class="text-text-muted text-sm">Products</p>
                <p class="text-2xl font-bold text-text-primary">0</p>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <i class="pi pi-wrench text-purple-400 text-xl"></i>
              </div>
              <div>
                <p class="text-text-muted text-sm">Services</p>
                <p class="text-2xl font-bold text-text-primary">0</p>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <i class="pi pi-calendar text-green-400 text-xl"></i>
              </div>
              <div>
                <p class="text-text-muted text-sm">Appointments</p>
                <p class="text-2xl font-bold text-text-primary">0</p>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Business Profile Card -->
      <div class="card">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Business Profile</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p class="text-text-muted text-sm mb-1">Business Name</p>
            <p class="text-text-primary">{{ authService.business()?.businessName }}</p>
          </div>
          <div>
            <p class="text-text-muted text-sm mb-1">Business Type</p>
            <p class="text-text-primary">{{ getBusinessTypeLabel() }}</p>
          </div>
          <div>
            <p class="text-text-muted text-sm mb-1">Email</p>
            <p class="text-text-primary">{{ authService.business()?.ownerEmail }}</p>
          </div>
          <div>
            <p class="text-text-muted text-sm mb-1">Verification Status</p>
            <span [ngClass]="getStatusClass()">
              {{ getStatusLabel() }}
            </span>
          </div>
          <div>
            <p class="text-text-muted text-sm mb-1">Subscription</p>
            <p class="text-text-primary">{{ getSubscriptionLabel() }}</p>
          </div>
          <div>
            <p class="text-text-muted text-sm mb-1">Member Since</p>
            <p class="text-text-primary">{{ formatDate(authService.business()?.createdAt) }}</p>
          </div>
          @if (authService.business()?.phone) {
            <div>
              <p class="text-text-muted text-sm mb-1">Phone</p>
              <p class="text-text-primary">{{ authService.business()?.phone }}</p>
            </div>
          }
          @if (authService.business()?.address) {
            <div>
              <p class="text-text-muted text-sm mb-1">Address</p>
              <p class="text-text-primary">{{ authService.business()?.address }}</p>
            </div>
          }
          @if (authService.business()?.website) {
            <div>
              <p class="text-text-muted text-sm mb-1">Website</p>
              <a
                [href]="authService.business()?.website"
                target="_blank"
                class="text-primary hover:underline"
              >
                {{ authService.business()?.website }}
              </a>
            </div>
          }
        </div>
      </div>

      <!-- Getting Started -->
      @if (authService.isApproved()) {
        <div class="card">
          <h2 class="text-lg font-semibold text-text-primary mb-4">Getting Started</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 rounded-lg bg-background-tertiary">
              <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <i class="pi pi-box text-primary"></i>
              </div>
              <h3 class="font-semibold text-text-primary mb-1">Add Products</h3>
              <p class="text-text-muted text-sm mb-3">
                List your motorcycle parts, accessories, and gear for the community to discover.
              </p>
              <a href="/products" class="text-primary text-sm hover:underline">
                Add Products &rarr;
              </a>
            </div>
            <div class="p-4 rounded-lg bg-background-tertiary">
              <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                <i class="pi pi-wrench text-purple-400"></i>
              </div>
              <h3 class="font-semibold text-text-primary mb-1">Add Services</h3>
              <p class="text-text-muted text-sm mb-3">
                Showcase your repair, maintenance, and customization services.
              </p>
              <a href="/services" class="text-primary text-sm hover:underline">
                Add Services &rarr;
              </a>
            </div>
            <div class="p-4 rounded-lg bg-background-tertiary">
              <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                <i class="pi pi-cog text-blue-400"></i>
              </div>
              <h3 class="font-semibold text-text-primary mb-1">Complete Profile</h3>
              <p class="text-text-muted text-sm mb-3">
                Add your logo, cover image, and operating hours to attract more customers.
              </p>
              <a href="/settings" class="text-primary text-sm hover:underline">
                Edit Settings &rarr;
              </a>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class DashboardComponent {
  authService = inject(AuthService);
  isRefreshing = false;

  async refreshProfile(): Promise<void> {
    this.isRefreshing = true;
    try {
      await this.authService.refreshProfile();
    } finally {
      this.isRefreshing = false;
    }
  }

  getBusinessTypeLabel(): string {
    const type = this.authService.business()?.businessType;
    return type ? BUSINESS_TYPE_LABELS[type] : 'Unknown';
  }

  getStatusLabel(): string {
    const status = this.authService.verificationStatus();
    return status ? VERIFICATION_STATUS_LABELS[status] : 'Unknown';
  }

  getStatusClass(): string {
    const status = this.authService.verificationStatus();
    switch (status) {
      case 'pending':
        return 'badge-pending';
      case 'approved':
        return 'badge-approved';
      case 'rejected':
        return 'badge-rejected';
      case 'suspended':
        return 'badge-suspended';
      default:
        return 'badge-suspended';
    }
  }

  getSubscriptionLabel(): string {
    const tier = this.authService.business()?.subscriptionTier;
    return tier ? SUBSCRIPTION_TIER_LABELS[tier] : 'Free';
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
