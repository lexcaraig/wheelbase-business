import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  BUSINESS_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
  SUBSCRIPTION_TIER_LABELS
} from '../../core/models/business.model';
import { CLAIM_STATUS_LABELS } from '../../core/models/claim.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <button
          (click)="refreshProfile()"
          class="btn btn-ghost"
          [disabled]="isRefreshing"
        >
          @if (isRefreshing) {
            <span class="loading loading-spinner loading-sm"></span>
          } @else {
            <i class="pi pi-refresh"></i>
          }
          Refresh
        </button>
      </div>

      <!-- No Business or Claim - Show CTA -->
      @if (!authService.hasBusinessOrClaim()) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center py-12">
            <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-building text-primary text-4xl"></i>
            </div>
            <h2 class="text-2xl font-bold mb-2">Welcome to Wheelbase Business</h2>
            <p class="text-secondary mb-6 max-w-md mx-auto">
              You haven't claimed a business yet. Find your business in the Wheelbase app
              and tap "Claim This Business" to get started.
            </p>
            <div class="flex gap-4 justify-center">
              <a href="https://www.ridewheelbase.app" target="_blank" class="btn btn-primary">
                Download Wheelbase App
              </a>
            </div>
          </div>
        </div>
      }

      <!-- Claimed Provider States (New Flow) -->
      @if (authService.claimedProvider() && !authService.business()) {
        @switch (authService.claimedProvider()?.claimStatus) {
          @case ('pending') {
            <div class="alert alert-warning">
              <i class="pi pi-clock text-xl"></i>
              <div>
                <h3 class="font-semibold">Claim Pending Review</h3>
                <p class="text-sm">
                  Your claim for <span class="font-semibold">{{ authService.claimedProvider()?.businessName }}</span>
                  is currently under review. We'll notify you within 24-48 hours once it's approved.
                </p>
              </div>
            </div>

            <!-- Claim Status Card -->
            <div class="card bg-base-200 shadow">
              <div class="card-body">
                <h2 class="card-title">Claim Details</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p class="text-secondary text-sm mb-1">Business Name</p>
                    <p class="font-semibold">{{ authService.claimedProvider()?.businessName }}</p>
                  </div>
                  <div>
                    <p class="text-secondary text-sm mb-1">Claim Status</p>
                    <span class="badge badge-warning">Pending Review</span>
                  </div>
                  <div>
                    <p class="text-secondary text-sm mb-1">Submitted</p>
                    <p>{{ formatDate(authService.claimedProvider()?.submittedAt) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-base-200 shadow">
              <div class="card-body">
                <h2 class="card-title">What to Expect</h2>
                <ul class="list-disc list-inside space-y-2 text-secondary">
                  <li>Our team will review your submitted documents</li>
                  <li>You'll receive an email notification when approved</li>
                  <li>Once verified, you can manage your business profile from here</li>
                  <li>Review typically takes 24-48 hours</li>
                </ul>
              </div>
            </div>
          }

          @case ('verified') {
            <div class="alert alert-success">
              <i class="pi pi-check-circle text-xl"></i>
              <div>
                <h3 class="font-semibold">Business Verified</h3>
                <p class="text-sm">
                  Congratulations! <span class="font-semibold">{{ authService.claimedProvider()?.businessName }}</span>
                  is now verified and visible to the Wheelbase community.
                </p>
              </div>
            </div>

            <!-- Quick Stats (Claimed Provider - Verified) -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="stats bg-base-200 shadow">
                <div class="stat">
                  <div class="stat-figure text-primary">
                    <i class="pi pi-eye text-2xl"></i>
                  </div>
                  <div class="stat-title">Profile Views</div>
                  <div class="stat-value text-primary">0</div>
                </div>
              </div>
              <div class="stats bg-base-200 shadow">
                <div class="stat">
                  <div class="stat-figure text-info">
                    <i class="pi pi-star text-2xl"></i>
                  </div>
                  <div class="stat-title">Reviews</div>
                  <div class="stat-value text-info">0</div>
                </div>
              </div>
              <div class="stats bg-base-200 shadow">
                <div class="stat">
                  <div class="stat-figure text-secondary">
                    <i class="pi pi-phone text-2xl"></i>
                  </div>
                  <div class="stat-title">Contacts</div>
                  <div class="stat-value text-secondary">0</div>
                </div>
              </div>
              <div class="stats bg-base-200 shadow">
                <div class="stat">
                  <div class="stat-figure text-success">
                    <i class="pi pi-map-marker text-2xl"></i>
                  </div>
                  <div class="stat-title">Directions</div>
                  <div class="stat-value text-success">0</div>
                </div>
              </div>
            </div>

            <!-- Business Profile Card (Claimed Provider) -->
            <div class="card bg-base-200 shadow">
              <div class="card-body">
                <h2 class="card-title">Business Profile</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p class="text-secondary text-sm mb-1">Business Name</p>
                    <p>{{ authService.claimedProvider()?.businessName }}</p>
                  </div>
                  <div>
                    <p class="text-secondary text-sm mb-1">Status</p>
                    <span class="badge badge-success">Verified</span>
                  </div>
                  <div>
                    <p class="text-secondary text-sm mb-1">Claimed Since</p>
                    <p>{{ formatDate(authService.claimedProvider()?.submittedAt) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Getting Started (Claimed Provider - Verified) -->
            <div class="card bg-base-200 shadow">
              <div class="card-body">
                <h2 class="card-title">Getting Started</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="card bg-base-300">
                    <div class="card-body">
                      <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                        <i class="pi pi-pencil text-primary"></i>
                      </div>
                      <h3 class="font-semibold mb-1">Update Profile</h3>
                      <p class="text-secondary text-sm mb-3">
                        Add photos, operating hours, and services to attract more customers.
                      </p>
                      <a href="/settings" class="link link-primary text-sm">
                        Edit Profile &rarr;
                      </a>
                    </div>
                  </div>
                  <div class="card bg-base-300">
                    <div class="card-body">
                      <div class="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
                        <i class="pi pi-star text-secondary"></i>
                      </div>
                      <h3 class="font-semibold mb-1">Respond to Reviews</h3>
                      <p class="text-secondary text-sm mb-3">
                        Engage with customers by responding to their reviews.
                      </p>
                      <span class="text-sm text-secondary">Coming soon</span>
                    </div>
                  </div>
                  <div class="card bg-base-300">
                    <div class="card-body">
                      <div class="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center mb-2">
                        <i class="pi pi-chart-line text-info"></i>
                      </div>
                      <h3 class="font-semibold mb-1">View Analytics</h3>
                      <p class="text-secondary text-sm mb-3">
                        Track profile views, contacts, and customer engagement.
                      </p>
                      <a href="/analytics" class="link link-primary text-sm">
                        View Analytics &rarr;
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }

          @case ('rejected') {
            <div class="alert alert-error">
              <i class="pi pi-times-circle text-xl"></i>
              <div>
                <h3 class="font-semibold">Claim Rejected</h3>
                <p class="text-sm">
                  Your claim for <span class="font-semibold">{{ authService.claimedProvider()?.businessName }}</span>
                  was not approved. You can submit a new claim with updated documents.
                </p>
              </div>
            </div>

            <div class="card bg-base-200 shadow">
              <div class="card-body text-center">
                <p class="text-secondary mb-4">
                  If you believe this is an error, please contact our support team or resubmit your claim with clearer documentation.
                </p>
                <div class="flex gap-4 justify-center">
                  <a href="mailto:business@ridewheelbase.app" class="btn btn-ghost">
                    Contact Support
                  </a>
                  <button (click)="resubmitClaim()" class="btn btn-primary">
                    Resubmit Claim
                  </button>
                </div>
              </div>
            </div>
          }
        }
      }

      <!-- Legacy Business Account States -->
      @if (authService.business()) {
        <!-- Verification Status Banner (Legacy) -->
        @switch (authService.verificationStatus()) {
          @case ('pending') {
            <div class="alert alert-warning">
              <i class="pi pi-clock text-xl"></i>
              <div>
                <h3 class="font-semibold">Pending Approval</h3>
                <p class="text-sm">
                  Your business account is currently under review. Our team typically
                  reviews applications within 24-48 hours. Once approved, you'll have
                  full access to all business features.
                </p>
              </div>
            </div>
          }
          @case ('rejected') {
            <div class="alert alert-error">
              <i class="pi pi-times-circle text-xl"></i>
              <div>
                <h3 class="font-semibold">Application Rejected</h3>
                <p class="text-sm">
                  {{ authService.business()?.rejectionReason || 'Your application was not approved. Please contact support for more information.' }}
                </p>
              </div>
            </div>
          }
          @case ('suspended') {
            <div class="alert">
              <i class="pi pi-ban text-xl"></i>
              <div>
                <h3 class="font-semibold">Account Suspended</h3>
                <p class="text-sm">
                  {{ authService.business()?.rejectionReason || 'Your account has been suspended. Please contact support.' }}
                </p>
              </div>
            </div>
          }
          @case ('approved') {
            <div class="alert alert-success">
              <i class="pi pi-check-circle text-xl"></i>
              <div>
                <h3 class="font-semibold">Account Verified</h3>
                <p class="text-sm">
                  Your business is verified and visible to the Wheelbase community.
                </p>
              </div>
            </div>
          }
        }

        <!-- Quick Stats (Legacy - Approved) -->
        @if (authService.isApproved()) {
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="stats bg-base-200 shadow">
              <div class="stat">
                <div class="stat-figure text-primary">
                  <i class="pi pi-eye text-2xl"></i>
                </div>
                <div class="stat-title">Profile Views</div>
                <div class="stat-value text-primary">0</div>
              </div>
            </div>
            <div class="stats bg-base-200 shadow">
              <div class="stat">
                <div class="stat-figure text-info">
                  <i class="pi pi-box text-2xl"></i>
                </div>
                <div class="stat-title">Products</div>
                <div class="stat-value text-info">0</div>
              </div>
            </div>
            <div class="stats bg-base-200 shadow">
              <div class="stat">
                <div class="stat-figure text-secondary">
                  <i class="pi pi-wrench text-2xl"></i>
                </div>
                <div class="stat-title">Services</div>
                <div class="stat-value text-secondary">0</div>
              </div>
            </div>
            <div class="stats bg-base-200 shadow">
              <div class="stat">
                <div class="stat-figure text-success">
                  <i class="pi pi-calendar text-2xl"></i>
                </div>
                <div class="stat-title">Appointments</div>
                <div class="stat-value text-success">0</div>
              </div>
            </div>
          </div>
        }

        <!-- Business Profile Card (Legacy) -->
        <div class="card bg-base-200 shadow">
          <div class="card-body">
            <h2 class="card-title">Business Profile</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p class="text-secondary text-sm mb-1">Business Name</p>
                <p>{{ authService.business()?.businessName }}</p>
              </div>
              <div>
                <p class="text-secondary text-sm mb-1">Business Type</p>
                <p>{{ getBusinessTypeLabel() }}</p>
              </div>
              <div>
                <p class="text-secondary text-sm mb-1">Email</p>
                <p>{{ authService.business()?.ownerEmail }}</p>
              </div>
              <div>
                <p class="text-secondary text-sm mb-1">Verification Status</p>
                <span [ngClass]="getStatusClass()">
                  {{ getStatusLabel() }}
                </span>
              </div>
              <div>
                <p class="text-secondary text-sm mb-1">Subscription</p>
                <p>{{ getSubscriptionLabel() }}</p>
              </div>
              <div>
                <p class="text-secondary text-sm mb-1">Member Since</p>
                <p>{{ formatDate(authService.business()?.createdAt) }}</p>
              </div>
              @if (authService.business()?.phone) {
                <div>
                  <p class="text-secondary text-sm mb-1">Phone</p>
                  <p>{{ authService.business()?.phone }}</p>
                </div>
              }
              @if (authService.business()?.address) {
                <div>
                  <p class="text-secondary text-sm mb-1">Address</p>
                  <p>{{ authService.business()?.address }}</p>
                </div>
              }
              @if (authService.business()?.website) {
                <div>
                  <p class="text-secondary text-sm mb-1">Website</p>
                  <a
                    [href]="authService.business()?.website"
                    target="_blank"
                    class="link link-primary"
                  >
                    {{ authService.business()?.website }}
                  </a>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Getting Started (Legacy - Approved) -->
        @if (authService.isApproved()) {
          <div class="card bg-base-200 shadow">
            <div class="card-body">
              <h2 class="card-title">Getting Started</h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="card bg-base-300">
                  <div class="card-body">
                    <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <i class="pi pi-box text-primary"></i>
                    </div>
                    <h3 class="font-semibold mb-1">Add Products</h3>
                    <p class="text-secondary text-sm mb-3">
                      List your motorcycle parts, accessories, and gear for the community to discover.
                    </p>
                    <a href="/products" class="link link-primary text-sm">
                      Add Products &rarr;
                    </a>
                  </div>
                </div>
                <div class="card bg-base-300">
                  <div class="card-body">
                    <div class="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
                      <i class="pi pi-wrench text-secondary"></i>
                    </div>
                    <h3 class="font-semibold mb-1">Add Services</h3>
                    <p class="text-secondary text-sm mb-3">
                      Showcase your repair, maintenance, and customization services.
                    </p>
                    <a href="/services" class="link link-primary text-sm">
                      Add Services &rarr;
                    </a>
                  </div>
                </div>
                <div class="card bg-base-300">
                  <div class="card-body">
                    <div class="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center mb-2">
                      <i class="pi pi-cog text-info"></i>
                    </div>
                    <h3 class="font-semibold mb-1">Complete Profile</h3>
                    <p class="text-secondary text-sm mb-3">
                      Add your logo, cover image, and operating hours to attract more customers.
                    </p>
                    <a href="/settings" class="link link-primary text-sm">
                      Edit Settings &rarr;
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: []
})
export class DashboardComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  isRefreshing = false;

  async refreshProfile(): Promise<void> {
    this.isRefreshing = true;
    try {
      if (this.authService.business()) {
        await this.authService.refreshProfile();
      } else {
        await this.authService.refreshClaimStatus();
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  resubmitClaim(): void {
    const claim = this.authService.claimedProvider();
    if (claim) {
      this.router.navigate(['/claim', claim.providerId]);
    }
  }

  getBusinessTypeLabel(): string {
    const type = this.authService.business()?.businessType;
    return type ? BUSINESS_TYPE_LABELS[type] : 'Unknown';
  }

  getStatusLabel(): string {
    const status = this.authService.verificationStatus();
    if (!status) return 'Unknown';

    // Check if it's a claim status or verification status
    if (CLAIM_STATUS_LABELS[status as keyof typeof CLAIM_STATUS_LABELS]) {
      return CLAIM_STATUS_LABELS[status as keyof typeof CLAIM_STATUS_LABELS];
    }
    if (VERIFICATION_STATUS_LABELS[status as keyof typeof VERIFICATION_STATUS_LABELS]) {
      return VERIFICATION_STATUS_LABELS[status as keyof typeof VERIFICATION_STATUS_LABELS];
    }
    return status;
  }

  getStatusClass(): string {
    const status = this.authService.verificationStatus();
    switch (status) {
      case 'pending':
        return 'badge badge-warning';
      case 'approved':
      case 'verified':
        return 'badge badge-success';
      case 'rejected':
        return 'badge badge-error';
      case 'suspended':
        return 'badge badge-neutral';
      default:
        return 'badge badge-neutral';
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
