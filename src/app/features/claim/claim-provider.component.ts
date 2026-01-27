import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ClaimService } from '../../core/services/claim.service';
import {
  ServiceProviderInfo,
  ClaimRole,
  CLAIM_ROLE_LABELS,
  SubmitClaimRequest,
  SearchProviderResult,
  ProviderCategory,
  PROVIDER_CATEGORIES,
  CreateProviderRequest,
} from '../../core/models/claim.model';
import { LocationPickerComponent } from '../../shared/components/location-picker/location-picker.component';

type ClaimStep = 'search' | 'confirmation' | 'details' | 'documents' | 'review' | 'success';
type ClaimMode = 'search' | 'claim-existing' | 'add-new';

interface UploadedDocument {
  file: File | null;
  url: string | null;
  uploading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-claim-provider',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationPickerComponent],
  template: `
    <div class="max-w-3xl mx-auto w-full">
      <!-- Has Existing Claim -->
      @if (claimService.hasExistingClaim() && !isOwnProvider()) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center">
            <div class="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-exclamation-triangle text-warning text-3xl"></i>
            </div>
            <h2 class="card-title text-2xl font-bold justify-center">
              Already Have a Business
            </h2>
            <p class="text-secondary mb-4">
              You already have a {{ claimService.existingClaim()?.claimStatus }} claim for
              <span class="font-semibold">{{ claimService.existingClaim()?.businessName }}</span>.
            </p>
            <p class="text-sm text-secondary mb-6">
              Each account can only claim one business at a time.
            </p>

            <button (click)="goToDashboard()" class="btn btn-primary">
              Go to Dashboard
            </button>
          </div>
        </div>
      }

      <!-- Loading Provider (when has providerId) -->
      @else if (providerId() && claimService.isLoading() && !provider()) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body flex items-center justify-center py-12">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <p class="text-secondary mt-4">Loading business details...</p>
          </div>
        </div>
      }

      <!-- Provider Not Found (when has providerId) -->
      @else if (providerId() && claimService.error() && !provider()) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center">
            <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-times-circle text-error text-3xl"></i>
            </div>
            <h2 class="card-title text-2xl font-bold justify-center">
              Business Not Found
            </h2>
            <p class="text-secondary mb-6">
              {{ claimService.error() }}
            </p>
            <button (click)="goToSearch()" class="btn btn-primary">
              Search for Your Business
            </button>
          </div>
        </div>
      }

      <!-- Provider Not Claimable -->
      @else if (provider() && !provider()?.isClaimable) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center">
            <div class="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-lock text-warning text-3xl"></i>
            </div>
            <h2 class="card-title text-2xl font-bold justify-center">
              Business Already Claimed
            </h2>
            <p class="text-secondary mb-6">
              <span class="font-semibold">{{ provider()?.businessName }}</span> has already been claimed by another user.
            </p>
            <p class="text-sm text-secondary mb-6">
              If you believe this is an error, please contact support at
              <a href="mailto:business@ridewheelbase.app" class="link link-primary">business&#64;ridewheelbase.app</a>
            </p>
            <button (click)="goToSearch()" class="btn btn-primary">
              Search for Another Business
            </button>
          </div>
        </div>
      }

      <!-- Main Claim Flow -->
      @else {
        <div class="card">
          <div class="card-body">
            <!-- Header with Sign Out -->
            <div class="flex justify-end mb-4">
              <button (click)="signOut()" class="btn btn-ghost btn-sm text-secondary hover:text-white">
                <i class="pi pi-sign-out mr-1"></i>
                Sign Out & Re-login
              </button>
            </div>

            <!-- Progress Steps - Bar Style -->
            <div class="grid grid-cols-6 gap-4 mb-8">
              @for (step of stepLabels; track step.key; let i = $index) {
                <div class="flex flex-col items-start">
                  <div class="w-full h-1 rounded-full mb-2"
                       [class]="stepIndex() >= i ? 'bg-white' : 'bg-neutral'"></div>
                  <span class="text-sm font-medium"
                        [class]="stepIndex() >= i ? 'text-white' : 'text-neutral'">
                    {{ step.label }}
                  </span>
                </div>
              }
            </div>

            <!-- Error Alert -->
            @if (claimService.error()) {
              <div class="alert alert-error mb-4">
                <i class="pi pi-exclamation-circle"></i>
                <span>{{ claimService.error() }}</span>
                <button class="btn btn-ghost btn-sm" (click)="claimService.clearError()">
                  <i class="pi pi-times"></i>
                </button>
              </div>
            }

            <!-- Step 0: Search -->
            @if (currentStep() === 'search') {
              <div>
                <h2 class="text-xl font-bold mb-2">Find Your Business</h2>
                <p class="text-secondary text-sm mb-4">
                  Search for your business to claim it, or add a new listing if it doesn't exist yet.
                </p>

                <div class="form-control mb-4">
                  <div class="join w-full">
                    <input
                      type="text"
                      [(ngModel)]="searchQuery"
                      class="input input-bordered join-item flex-1 bg-base-300"
                      placeholder="Enter business name..."
                      (keyup.enter)="performSearch()"
                    />
                    <button
                      (click)="performSearch()"
                      class="btn btn-primary join-item"
                      [disabled]="claimService.isSearching() || searchQuery.length < 2"
                    >
                      @if (claimService.isSearching()) {
                        <span class="loading loading-spinner loading-sm"></span>
                      } @else {
                        <i class="pi pi-search"></i>
                      }
                      Search
                    </button>
                  </div>
                  <label class="label">
                    <span class="label-text-alt text-secondary">Enter at least 2 characters to search</span>
                  </label>
                </div>

                <!-- Search Results -->
                @if (hasSearched() && claimService.searchResults().length > 0) {
                  <div class="space-y-2 mb-4">
                    <p class="text-sm text-secondary">Found {{ claimService.searchResults().length }} result(s):</p>
                    @for (result of claimService.searchResults(); track result.id) {
                      <div class="card bg-base-300 hover:bg-base-100 transition-colors cursor-pointer" (click)="selectProvider(result)">
                        <div class="card-body p-4 flex-row items-center gap-4">
                          @if (result.logo_url) {
                            <img [src]="result.logo_url" [alt]="result.business_name" class="w-12 h-12 rounded-lg object-cover" />
                          } @else {
                            <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <i class="pi pi-building text-primary text-xl"></i>
                            </div>
                          }
                          <div class="flex-1">
                            <h3 class="font-semibold">{{ result.business_name }}</h3>
                            <p class="text-sm text-secondary">{{ result.category | titlecase }} &bull; {{ result.city || 'Unknown location' }}</p>
                          </div>
                          <button class="btn btn-primary btn-sm">
                            Claim
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- No Results -->
                @if (hasSearched() && claimService.searchResults().length === 0 && !claimService.isSearching()) {
                  <div class="text-center py-6 mb-4">
                    <div class="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                      <i class="pi pi-search text-secondary text-2xl"></i>
                    </div>
                    <p class="text-secondary mb-2">No businesses found matching "{{ searchQuery }}"</p>
                    <p class="text-sm text-secondary">Can't find your business? Add it below.</p>
                  </div>
                }

                <!-- Add New Business CTA -->
                <div class="divider">OR</div>
                <div class="text-center">
                  <button (click)="startAddNew()" class="btn btn-outline btn-primary">
                    <i class="pi pi-plus mr-2"></i>
                    Add Your Business
                  </button>
                  <p class="text-sm text-secondary mt-2">Don't see your business? Create a new listing.</p>
                </div>
              </div>
            }

            <!-- Step 1: Confirmation (Existing Provider) -->
            @if (currentStep() === 'confirmation' && claimMode() === 'claim-existing') {
              <div class="text-center">
                @if (provider()?.logoUrl) {
                  <img
                    [src]="provider()?.logoUrl"
                    [alt]="provider()?.businessName"
                    class="w-20 h-20 rounded-lg object-cover mx-auto mb-4"
                  />
                } @else {
                  <div class="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <i class="pi pi-building text-primary text-3xl"></i>
                  </div>
                }

                <h2 class="text-xl font-bold mb-2">{{ provider()?.businessName }}</h2>
                <p class="text-secondary text-sm mb-1">{{ provider()?.category }}</p>
                @if (provider()?.address) {
                  <p class="text-secondary text-sm mb-4">{{ provider()?.address }}</p>
                }
                @if (provider()?.city) {
                  <p class="text-secondary text-sm mb-4">{{ provider()?.city }}</p>
                }

                <div class="divider"></div>

                <p class="text-lg mb-6">Is this your business?</p>

                <div class="flex gap-4 justify-center">
                  <button (click)="goToSearch()" class="btn btn-ghost">
                    No, go back
                  </button>
                  <button (click)="nextStep()" class="btn btn-primary">
                    Yes, this is my business
                  </button>
                </div>
              </div>
            }

            <!-- Step 1: Confirmation (Add New - Business Details) -->
            @if (currentStep() === 'confirmation' && claimMode() === 'add-new') {
              <div>
                <h2 class="text-xl font-bold mb-4">Add Your Business</h2>
                <p class="text-secondary text-sm mb-4">
                  Enter your business details. This information will be visible to Wheelbase users.
                </p>

                <div class="space-y-4">
                  <div class="form-control">
                    <label class="label" for="newBusinessName">
                      <span class="label-text">Business Name *</span>
                    </label>
                    <input
                      type="text"
                      id="newBusinessName"
                      [(ngModel)]="newBusinessName"
                      class="input input-bordered w-full bg-base-300"
                      placeholder="e.g., Juan's Motorcycle Repair"
                      required
                    />
                  </div>

                  <div class="form-control">
                    <label class="label" for="newCategory">
                      <span class="label-text">Category *</span>
                    </label>
                    <select
                      id="newCategory"
                      [(ngModel)]="newCategory"
                      class="select select-bordered w-full bg-base-300"
                      required
                    >
                      <option [value]="null" disabled>Select a category</option>
                      @for (cat of categories; track cat.value) {
                        <option [value]="cat.value">{{ cat.label }}</option>
                      }
                    </select>
                  </div>

                  <div class="form-control">
                    <label class="label" for="newAddress">
                      <span class="label-text">Street Address *</span>
                    </label>
                    <input
                      type="text"
                      id="newAddress"
                      [(ngModel)]="newAddress"
                      class="input input-bordered w-full bg-base-300"
                      placeholder="123 Main Street"
                      required
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div class="form-control">
                      <label class="label" for="newCity">
                        <span class="label-text">City *</span>
                      </label>
                      <input
                        type="text"
                        id="newCity"
                        [(ngModel)]="newCity"
                        class="input input-bordered w-full bg-base-300"
                        placeholder="Manila"
                        required
                      />
                    </div>
                    <div class="form-control">
                      <label class="label" for="newStateProvince">
                        <span class="label-text">State/Province</span>
                      </label>
                      <input
                        type="text"
                        id="newStateProvince"
                        [(ngModel)]="newStateProvince"
                        class="input input-bordered w-full bg-base-300"
                        placeholder="Metro Manila"
                      />
                    </div>
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Business Location *</span>
                    </label>
                    <p class="text-xs text-secondary mb-2">
                      Click on the map to pin your business location
                    </p>
                    <app-location-picker
                      [initialLocation]="newLat && newLng ? { lat: newLat, lng: newLng } : undefined"
                      (locationSelected)="onLocationSelected($event)"
                    />
                  </div>
                </div>

                <div class="flex gap-4 justify-between mt-6">
                  <button (click)="goToSearch()" class="btn btn-ghost">
                    Back
                  </button>
                  <button
                    (click)="nextStep()"
                    class="btn btn-primary"
                    [disabled]="!isNewBusinessValid()"
                  >
                    Continue
                  </button>
                </div>
              </div>
            }

            <!-- Step 2: Business Details -->
            @if (currentStep() === 'details') {
              <div>
                <h2 class="text-xl font-bold mb-4">Your Details</h2>

                <div class="space-y-4">
                  <div class="form-control">
                    <label class="label" for="ownerName">
                      <span class="label-text">Your Full Name</span>
                    </label>
                    <input
                      type="text"
                      id="ownerName"
                      [(ngModel)]="ownerName"
                      class="input input-bordered w-full bg-base-300"
                      placeholder="Juan dela Cruz"
                      required
                    />
                  </div>

                  <div class="form-control">
                    <label class="label" for="role">
                      <span class="label-text">Your Role</span>
                    </label>
                    <select
                      id="role"
                      [(ngModel)]="role"
                      class="select select-bordered w-full bg-base-300"
                      required
                    >
                      @for (r of roleOptions; track r.value) {
                        <option [value]="r.value">{{ r.label }}</option>
                      }
                    </select>
                  </div>

                  <div class="form-control">
                    <label class="label" for="contactPhone">
                      <span class="label-text">Contact Phone</span>
                    </label>
                    <input
                      type="tel"
                      id="contactPhone"
                      [(ngModel)]="contactPhone"
                      class="input input-bordered w-full bg-base-300"
                      placeholder="+63 XXX XXX XXXX"
                      required
                    />
                  </div>

                  <div class="form-control">
                    <label class="label" for="businessEmail">
                      <span class="label-text">Business Email</span>
                    </label>
                    <input
                      type="email"
                      id="businessEmail"
                      [(ngModel)]="businessEmail"
                      class="input input-bordered w-full bg-base-300"
                      placeholder="business&#64;example.com"
                      required
                    />
                  </div>
                </div>

                <div class="flex gap-4 justify-between mt-6">
                  <button (click)="prevStep()" class="btn btn-ghost">
                    Back
                  </button>
                  <button
                    (click)="nextStep()"
                    class="btn btn-primary"
                    [disabled]="!isDetailsValid()"
                  >
                    Continue
                  </button>
                </div>
              </div>
            }

            <!-- Step 3: Documents -->
            @if (currentStep() === 'documents') {
              <div>
                <h2 class="text-xl font-bold mb-2">Verification Documents</h2>
                <p class="text-secondary text-sm mb-4">
                  Upload documents to verify you own or represent this business.
                  At least one document is required.
                </p>

                <div class="space-y-4">
                  <!-- Government ID -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Government ID (Required)</span>
                    </label>
                    <div class="flex gap-2 items-center">
                      @if (governmentId.url) {
                        <div class="badge badge-success gap-1">
                          <i class="pi pi-check"></i>
                          Uploaded
                        </div>
                        <button (click)="clearDocument('governmentId')" class="btn btn-ghost btn-xs">
                          <i class="pi pi-times"></i>
                        </button>
                      } @else {
                        <input
                          type="file"
                          (change)="onFileSelected($event, 'governmentId')"
                          accept="image/*,.pdf"
                          class="file-input file-input-bordered file-input-sm w-full bg-base-300"
                          [disabled]="governmentId.uploading"
                        />
                        @if (governmentId.uploading) {
                          <span class="loading loading-spinner loading-sm"></span>
                        }
                      }
                    </div>
                    @if (governmentId.error) {
                      <label class="label">
                        <span class="label-text-alt text-error">{{ governmentId.error }}</span>
                      </label>
                    }
                  </div>

                  <!-- Business Permit -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Business Permit / Mayor's Permit</span>
                    </label>
                    <div class="flex gap-2 items-center">
                      @if (businessPermit.url) {
                        <div class="badge badge-success gap-1">
                          <i class="pi pi-check"></i>
                          Uploaded
                        </div>
                        <button (click)="clearDocument('businessPermit')" class="btn btn-ghost btn-xs">
                          <i class="pi pi-times"></i>
                        </button>
                      } @else {
                        <input
                          type="file"
                          (change)="onFileSelected($event, 'businessPermit')"
                          accept="image/*,.pdf"
                          class="file-input file-input-bordered file-input-sm w-full bg-base-300"
                          [disabled]="businessPermit.uploading"
                        />
                        @if (businessPermit.uploading) {
                          <span class="loading loading-spinner loading-sm"></span>
                        }
                      }
                    </div>
                    @if (businessPermit.error) {
                      <label class="label">
                        <span class="label-text-alt text-error">{{ businessPermit.error }}</span>
                      </label>
                    }
                  </div>

                  <!-- DTI/SEC Registration -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">DTI/SEC Registration (Optional)</span>
                    </label>
                    <div class="flex gap-2 items-center">
                      @if (dtiRegistration.url) {
                        <div class="badge badge-success gap-1">
                          <i class="pi pi-check"></i>
                          Uploaded
                        </div>
                        <button (click)="clearDocument('dtiRegistration')" class="btn btn-ghost btn-xs">
                          <i class="pi pi-times"></i>
                        </button>
                      } @else {
                        <input
                          type="file"
                          (change)="onFileSelected($event, 'dtiRegistration')"
                          accept="image/*,.pdf"
                          class="file-input file-input-bordered file-input-sm w-full bg-base-300"
                          [disabled]="dtiRegistration.uploading"
                        />
                        @if (dtiRegistration.uploading) {
                          <span class="loading loading-spinner loading-sm"></span>
                        }
                      }
                    </div>
                    @if (dtiRegistration.error) {
                      <label class="label">
                        <span class="label-text-alt text-error">{{ dtiRegistration.error }}</span>
                      </label>
                    }
                  </div>

                  <!-- BIR Certificate -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">BIR Certificate (Optional)</span>
                    </label>
                    <div class="flex gap-2 items-center">
                      @if (birCertificate.url) {
                        <div class="badge badge-success gap-1">
                          <i class="pi pi-check"></i>
                          Uploaded
                        </div>
                        <button (click)="clearDocument('birCertificate')" class="btn btn-ghost btn-xs">
                          <i class="pi pi-times"></i>
                        </button>
                      } @else {
                        <input
                          type="file"
                          (change)="onFileSelected($event, 'birCertificate')"
                          accept="image/*,.pdf"
                          class="file-input file-input-bordered file-input-sm w-full bg-base-300"
                          [disabled]="birCertificate.uploading"
                        />
                        @if (birCertificate.uploading) {
                          <span class="loading loading-spinner loading-sm"></span>
                        }
                      }
                    </div>
                    @if (birCertificate.error) {
                      <label class="label">
                        <span class="label-text-alt text-error">{{ birCertificate.error }}</span>
                      </label>
                    }
                  </div>
                </div>

                <div class="flex gap-4 justify-between mt-6">
                  <button (click)="prevStep()" class="btn btn-ghost">
                    Back
                  </button>
                  <button
                    (click)="nextStep()"
                    class="btn btn-primary"
                    [disabled]="!isDocumentsValid()"
                  >
                    Continue
                  </button>
                </div>
              </div>
            }

            <!-- Step 4: Review -->
            @if (currentStep() === 'review') {
              <div>
                <h2 class="text-xl font-bold mb-4">Review & Submit</h2>

                <div class="bg-base-300 rounded-lg p-4 mb-4">
                  <h3 class="font-semibold mb-2">Business</h3>
                  @if (claimMode() === 'add-new') {
                    <p>{{ newBusinessName }}</p>
                    <p class="text-secondary text-sm">{{ getCategoryLabel(newCategory) }}</p>
                    <p class="text-secondary text-sm">{{ newAddress }}, {{ newCity }}</p>
                  } @else {
                    <p>{{ provider()?.businessName }}</p>
                    <p class="text-secondary text-sm">{{ provider()?.category }}</p>
                  }
                </div>

                <div class="bg-base-300 rounded-lg p-4 mb-4">
                  <h3 class="font-semibold mb-2">Your Details</h3>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span class="text-secondary">Name:</span>
                      <span class="ml-2">{{ ownerName }}</span>
                    </div>
                    <div>
                      <span class="text-secondary">Role:</span>
                      <span class="ml-2">{{ getRoleLabel(role) }}</span>
                    </div>
                    <div>
                      <span class="text-secondary">Phone:</span>
                      <span class="ml-2">{{ contactPhone }}</span>
                    </div>
                    <div>
                      <span class="text-secondary">Email:</span>
                      <span class="ml-2">{{ businessEmail }}</span>
                    </div>
                  </div>
                </div>

                <div class="bg-base-300 rounded-lg p-4 mb-4">
                  <h3 class="font-semibold mb-2">Documents</h3>
                  <div class="space-y-1 text-sm">
                    <div class="flex items-center gap-2">
                      @if (governmentId.url) {
                        <i class="pi pi-check text-success"></i>
                      } @else {
                        <i class="pi pi-times text-error"></i>
                      }
                      <span>Government ID</span>
                    </div>
                    <div class="flex items-center gap-2">
                      @if (businessPermit.url) {
                        <i class="pi pi-check text-success"></i>
                      } @else {
                        <i class="pi pi-minus text-secondary"></i>
                      }
                      <span>Business Permit</span>
                    </div>
                    <div class="flex items-center gap-2">
                      @if (dtiRegistration.url) {
                        <i class="pi pi-check text-success"></i>
                      } @else {
                        <i class="pi pi-minus text-secondary"></i>
                      }
                      <span>DTI/SEC Registration</span>
                    </div>
                    <div class="flex items-center gap-2">
                      @if (birCertificate.url) {
                        <i class="pi pi-check text-success"></i>
                      } @else {
                        <i class="pi pi-minus text-secondary"></i>
                      }
                      <span>BIR Certificate</span>
                    </div>
                  </div>
                </div>

                <div class="form-control mb-4">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      [(ngModel)]="confirmAuthorized"
                      class="checkbox checkbox-primary"
                    />
                    <span class="label-text">
                      I confirm that I am authorized to claim and manage this business
                    </span>
                  </label>
                </div>

                <div class="form-control mb-4">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      [(ngModel)]="confirmTerms"
                      class="checkbox checkbox-primary"
                    />
                    <span class="label-text">
                      I agree to the
                      <a href="https://www.ridewheelbase.app/terms" target="_blank" class="link link-primary">
                        Terms of Service
                      </a>
                      and
                      <a href="https://www.ridewheelbase.app/privacy" target="_blank" class="link link-primary">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                </div>

                <div class="flex gap-4 justify-between mt-6">
                  <button (click)="prevStep()" class="btn btn-ghost" [disabled]="isSubmitting()">
                    Back
                  </button>
                  <button
                    (click)="submitClaim()"
                    class="btn btn-primary"
                    [disabled]="!isReviewValid() || isSubmitting()"
                  >
                    @if (isSubmitting()) {
                      <span class="loading loading-spinner loading-sm"></span>
                      <span>Submitting...</span>
                    } @else {
                      <span>Submit Claim Request</span>
                    }
                  </button>
                </div>
              </div>
            }

            <!-- Step 5: Success -->
            @if (currentStep() === 'success') {
              <div class="text-center py-4">
                <div class="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <i class="pi pi-check-circle text-success text-4xl"></i>
                </div>

                <h2 class="text-2xl font-bold mb-2">Claim Submitted!</h2>

                <p class="text-secondary mb-6">
                  @if (claimMode() === 'add-new') {
                    Your business <span class="font-semibold">{{ newBusinessName }}</span>
                    has been created and your claim has been submitted successfully.
                  } @else {
                    Your claim for <span class="font-semibold">{{ provider()?.businessName }}</span>
                    has been submitted successfully.
                  }
                </p>

                <div class="bg-base-300 rounded-lg p-4 mb-6 text-left">
                  <h3 class="font-semibold mb-2">What happens next?</h3>
                  <ul class="list-disc list-inside space-y-1 text-sm text-secondary">
                    <li>Our team will review your documents within 24-48 hours</li>
                    <li>You'll receive an email notification when your claim is approved</li>
                    <li>Once approved, you can manage your business from the dashboard</li>
                  </ul>
                </div>

                <button (click)="goToDashboard()" class="btn btn-primary">
                  Go to Dashboard
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class ClaimProviderComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  authService = inject(AuthService);
  claimService = inject(ClaimService);

  // Route param
  providerId = signal<string | null>(null);

  // Wizard state
  currentStep = signal<ClaimStep>('search');
  claimMode = signal<ClaimMode>('search');
  stepIndex = computed(() => {
    const steps: ClaimStep[] = ['search', 'confirmation', 'details', 'documents', 'review', 'success'];
    return steps.indexOf(this.currentStep());
  });

  // Step labels for the bar stepper
  stepLabels = [
    { key: 'search', label: 'Find' },
    { key: 'confirmation', label: 'Confirm' },
    { key: 'details', label: 'Details' },
    { key: 'documents', label: 'Documents' },
    { key: 'review', label: 'Review' },
    { key: 'success', label: 'Done' },
  ];

  // Search state
  searchQuery = '';
  hasSearched = signal(false);

  // New business form fields
  newBusinessName = '';
  newCategory: ProviderCategory | null = null;
  newAddress = '';
  newCity = '';
  newStateProvince = '';
  newLat: number | null = null;
  newLng: number | null = null;

  // Provider info
  provider = computed(() => this.claimService.provider());

  // Categories list
  categories = PROVIDER_CATEGORIES;

  // Form fields
  ownerName = '';
  role: ClaimRole = 'owner';
  contactPhone = '';
  businessEmail = '';

  // Document uploads
  governmentId: UploadedDocument = { file: null, url: null, uploading: false, error: null };
  businessPermit: UploadedDocument = { file: null, url: null, uploading: false, error: null };
  dtiRegistration: UploadedDocument = { file: null, url: null, uploading: false, error: null };
  birCertificate: UploadedDocument = { file: null, url: null, uploading: false, error: null };

  // Confirmations
  confirmAuthorized = false;
  confirmTerms = false;

  // Submission state
  isSubmitting = signal(false);

  // Role options
  roleOptions = Object.entries(CLAIM_ROLE_LABELS).map(([value, label]) => ({
    value: value as ClaimRole,
    label
  }));

  async ngOnInit(): Promise<void> {
    // Get provider ID from route
    this.route.paramMap.subscribe(async params => {
      const id = params.get('providerId');
      this.providerId.set(id);

      if (id) {
        // Direct link to claim a specific provider - skip search
        this.claimMode.set('claim-existing');
        this.currentStep.set('confirmation');

        // Fetch provider details
        await this.claimService.getProvider(id);

        // Also check if user already has a claim
        await this.claimService.checkExistingClaim();
      } else {
        // No provider ID - start with search
        this.claimMode.set('search');
        this.currentStep.set('search');

        // Check if user already has a claim
        await this.claimService.checkExistingClaim();
      }

      // Pre-fill email from session if available
      const session = await this.authService['supabase']?.getSession();
      if (session?.user?.email) {
        this.businessEmail = session.user.email;
      }
    });
  }

  ngOnDestroy(): void {
    this.claimService.reset();
  }

  isOwnProvider(): boolean {
    const existingClaim = this.claimService.existingClaim();
    const currentProviderId = this.providerId();
    return existingClaim?.providerId === currentProviderId;
  }

  async performSearch(): Promise<void> {
    if (this.searchQuery.length < 2) return;

    this.hasSearched.set(true);
    await this.claimService.searchProviders({
      query: this.searchQuery,
      limit: 10,
    });
  }

  selectProvider(result: SearchProviderResult): void {
    // Navigate to claim this provider
    this.router.navigate(['/claim', result.id]);
  }

  startAddNew(): void {
    this.claimMode.set('add-new');
    this.currentStep.set('confirmation');
    this.claimService.clearSearchResults();
  }

  goToSearch(): void {
    this.claimMode.set('search');
    this.currentStep.set('search');
    this.providerId.set(null);

    // Clear form state
    this.newBusinessName = '';
    this.newCategory = null;
    this.newAddress = '';
    this.newCity = '';
    this.newStateProvince = '';
    this.newLat = null;
    this.newLng = null;

    // Navigate to /claim without provider ID
    this.router.navigate(['/claim']);
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.logout();
      // logout() handles navigation to /login
    } catch (error) {
      console.error('Sign out error:', error);
      // Still navigate to login even on error
      this.router.navigate(['/auth/login']);
    }
  }

  nextStep(): void {
    const steps: ClaimStep[] = ['search', 'confirmation', 'details', 'documents', 'review', 'success'];
    const currentIndex = steps.indexOf(this.currentStep());
    if (currentIndex < steps.length - 1) {
      this.currentStep.set(steps[currentIndex + 1]);
    }
  }

  prevStep(): void {
    const steps: ClaimStep[] = ['search', 'confirmation', 'details', 'documents', 'review', 'success'];
    const currentIndex = steps.indexOf(this.currentStep());
    if (currentIndex > 0) {
      // If on confirmation and in add-new mode, go back to search
      if (currentIndex === 1 && this.claimMode() === 'add-new') {
        this.goToSearch();
      } else {
        this.currentStep.set(steps[currentIndex - 1]);
      }
    }
  }

  isNewBusinessValid(): boolean {
    return !!(
      this.newBusinessName.trim() &&
      this.newCategory &&
      this.newAddress.trim() &&
      this.newCity.trim() &&
      this.newLat !== null &&
      this.newLng !== null &&
      this.newLat >= -90 && this.newLat <= 90 &&
      this.newLng >= -180 && this.newLng <= 180
    );
  }

  onLocationSelected(location: { lat: number; lng: number }): void {
    this.newLat = location.lat;
    this.newLng = location.lng;
  }

  isDetailsValid(): boolean {
    return !!(
      this.ownerName.trim() &&
      this.role &&
      this.contactPhone.trim() &&
      this.businessEmail.trim()
    );
  }

  isDocumentsValid(): boolean {
    // At least government ID is required
    return !!this.governmentId.url;
  }

  isReviewValid(): boolean {
    return this.confirmAuthorized && this.confirmTerms;
  }

  getRoleLabel(role: ClaimRole): string {
    return CLAIM_ROLE_LABELS[role] || role;
  }

  getCategoryLabel(category: ProviderCategory | null): string {
    if (!category) return '';
    const cat = PROVIDER_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  }

  async onFileSelected(event: Event, documentType: string): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Get the document object
    const doc = this.getDocumentObject(documentType);
    if (!doc) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      doc.error = 'File size must be less than 5MB';
      return;
    }

    // Start upload
    doc.file = file;
    doc.uploading = true;
    doc.error = null;

    try {
      const url = await this.claimService.uploadDocument(file, documentType);
      if (url) {
        doc.url = url;
      } else {
        doc.error = 'Upload failed. Please try again.';
      }
    } catch (error) {
      doc.error = error instanceof Error ? error.message : 'Upload failed';
    } finally {
      doc.uploading = false;
    }
  }

  clearDocument(documentType: string): void {
    const doc = this.getDocumentObject(documentType);
    if (doc) {
      doc.file = null;
      doc.url = null;
      doc.error = null;
    }
  }

  private getDocumentObject(documentType: string): UploadedDocument | null {
    switch (documentType) {
      case 'governmentId': return this.governmentId;
      case 'businessPermit': return this.businessPermit;
      case 'dtiRegistration': return this.dtiRegistration;
      case 'birCertificate': return this.birCertificate;
      default: return null;
    }
  }

  async submitClaim(): Promise<void> {
    if (!this.isReviewValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.claimService.clearError();

    try {
      if (this.claimMode() === 'add-new') {
        // Create and claim new provider
        const request: CreateProviderRequest = {
          businessName: this.newBusinessName.trim(),
          category: this.newCategory!,
          address: this.newAddress.trim(),
          city: this.newCity.trim(),
          stateProvince: this.newStateProvince.trim() || undefined,
          countryCode: 'PH',
          location: { lat: this.newLat!, lng: this.newLng! },
          phoneNumber: this.contactPhone.trim() || undefined,
          email: this.businessEmail.trim() || undefined,
          ownerName: this.ownerName.trim(),
          role: this.role,
          documents: {
            governmentId: this.governmentId.url!,
            businessPermit: this.businessPermit.url || undefined,
            dtiRegistration: this.dtiRegistration.url || undefined,
            birCertificate: this.birCertificate.url || undefined,
          },
        };

        const response = await this.claimService.createAndClaimProvider(request);

        if (response) {
          this.currentStep.set('success');
        }
      } else {
        // Claim existing provider
        const currentProviderId = this.providerId();
        if (!currentProviderId) return;

        const request: SubmitClaimRequest = {
          providerId: currentProviderId,
          ownerName: this.ownerName.trim(),
          contactNumber: this.contactPhone.trim(),
          email: this.businessEmail.trim(),
          proofOfOwnershipUrl: this.governmentId.url || undefined,
          businessPermitUrl: this.businessPermit.url || undefined,
          taxIdDocumentUrl: this.dtiRegistration.url || undefined,
          businessRegistrationNumber: this.birCertificate.url ? 'Uploaded' : undefined,
        };

        const response = await this.claimService.submitClaim(request);

        if (response) {
          this.currentStep.set('success');
        }
      }
    } catch (error) {
      console.error('Submit claim error:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
