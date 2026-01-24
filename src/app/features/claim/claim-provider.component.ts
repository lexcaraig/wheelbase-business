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
} from '../../core/models/claim.model';

type ClaimStep = 'confirmation' | 'details' | 'documents' | 'review' | 'success';

interface UploadedDocument {
  file: File | null;
  url: string | null;
  uploading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-claim-provider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-2xl mx-auto">
      <!-- No Provider ID - Show Instructions -->
      @if (!providerId()) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center">
            <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-building text-primary text-3xl"></i>
            </div>
            <h2 class="card-title text-2xl font-bold justify-center">
              Claim Your Business
            </h2>
            <p class="text-secondary mb-6">
              To claim your business, find it in the Wheelbase app and tap "Claim This Business".
            </p>

            <div class="bg-base-300 rounded-lg p-4 text-left mb-4">
              <h3 class="font-semibold mb-2">How to claim:</h3>
              <ol class="list-decimal list-inside space-y-2 text-sm text-secondary">
                <li>Open the Wheelbase app on your phone</li>
                <li>Search for your business in the Services section</li>
                <li>Tap on your business to view its details</li>
                <li>Tap "Claim This Business" button</li>
                <li>You'll be redirected here to complete the claim process</li>
              </ol>
            </div>

            <button (click)="signOut()" class="btn btn-ghost btn-sm mt-4">
              Sign out and use a different account
            </button>
          </div>
        </div>
      } @else {
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

        <!-- Loading Provider -->
        @else if (claimService.isLoading() && !provider()) {
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body flex items-center justify-center py-12">
              <span class="loading loading-spinner loading-lg text-primary"></span>
              <p class="text-secondary mt-4">Loading business details...</p>
            </div>
          </div>
        }

        <!-- Provider Not Found or Not Claimable -->
        @else if (claimService.error() && !provider()) {
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
              <button (click)="signOut()" class="btn btn-ghost btn-sm">
                Sign out and try again
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
              <button (click)="signOut()" class="btn btn-ghost btn-sm">
                Sign out
              </button>
            </div>
          </div>
        }

        <!-- Main Claim Flow -->
        @else if (provider()?.isClaimable) {
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body">
              <!-- Progress Steps -->
              <ul class="steps steps-horizontal w-full mb-6">
                <li class="step" [class.step-primary]="stepIndex() >= 0">Confirm</li>
                <li class="step" [class.step-primary]="stepIndex() >= 1">Details</li>
                <li class="step" [class.step-primary]="stepIndex() >= 2">Documents</li>
                <li class="step" [class.step-primary]="stepIndex() >= 3">Review</li>
                <li class="step" [class.step-primary]="stepIndex() >= 4">Done</li>
              </ul>

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

              <!-- Step 1: Confirmation -->
              @if (currentStep() === 'confirmation') {
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
                    <button (click)="signOut()" class="btn btn-ghost">
                      No, sign out
                    </button>
                    <button (click)="nextStep()" class="btn btn-primary">
                      Yes, this is my business
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
                    <p>{{ provider()?.businessName }}</p>
                    <p class="text-secondary text-sm">{{ provider()?.category }}</p>
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
                    Your claim for <span class="font-semibold">{{ provider()?.businessName }}</span>
                    has been submitted successfully.
                  </p>

                  <div class="bg-base-300 rounded-lg p-4 mb-6 text-left">
                    <h3 class="font-semibold mb-2">What happens next?</h3>
                    <ul class="list-disc list-inside space-y-1 text-sm text-secondary">
                      <li>Our team will review your documents within 24-48 hours</li>
                      <li>You'll receive an email notification when your claim is approved</li>
                      <li>Once approved, you can manage your business from the dashboard</li>
                    </ul>
                  </div>

                  <button (click)="signOut()" class="btn btn-primary">
                    Done
                  </button>
                </div>
              }
            </div>
          </div>
        }
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
  currentStep = signal<ClaimStep>('confirmation');
  stepIndex = computed(() => {
    const steps: ClaimStep[] = ['confirmation', 'details', 'documents', 'review', 'success'];
    return steps.indexOf(this.currentStep());
  });

  // Provider info
  provider = computed(() => this.claimService.provider());

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
        // Fetch provider details
        await this.claimService.getProvider(id);

        // Also check if user already has a claim
        await this.claimService.checkExistingClaim();

        // Pre-fill email from session if available
        const session = await this.authService['supabase']?.getSession();
        if (session?.user?.email) {
          this.businessEmail = session.user.email;
        }
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

  nextStep(): void {
    const steps: ClaimStep[] = ['confirmation', 'details', 'documents', 'review', 'success'];
    const currentIndex = steps.indexOf(this.currentStep());
    if (currentIndex < steps.length - 1) {
      this.currentStep.set(steps[currentIndex + 1]);
    }
  }

  prevStep(): void {
    const steps: ClaimStep[] = ['confirmation', 'details', 'documents', 'review', 'success'];
    const currentIndex = steps.indexOf(this.currentStep());
    if (currentIndex > 0) {
      this.currentStep.set(steps[currentIndex - 1]);
    }
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

    const providerId = this.providerId();
    if (!providerId) return;

    this.isSubmitting.set(true);
    this.claimService.clearError();

    try {
      const request: SubmitClaimRequest = {
        providerId,
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
    } catch (error) {
      console.error('Submit claim error:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.authService.logout();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
