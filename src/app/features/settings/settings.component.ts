import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { OrderService } from '../../core/services/order.service';
import { PaymentSettings } from '../../core/models/order.model';

interface BusinessProfile {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  operatingHours?: OperatingHours;
  logoUrl?: string;
  coverImageUrl?: string;
  hasPhysicalLocation?: boolean;
}

interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold">Settings</h1>
        <p class="text-secondary text-sm mt-1">
          Manage your business profile and account settings
        </p>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-boxed bg-base-200 mb-6 inline-flex">
        <button
          (click)="activeTab = 'profile'"
          [class]="'tab ' + (activeTab === 'profile' ? 'tab-active' : '')"
        >
          Business Profile
        </button>
        <button
          (click)="activeTab = 'hours'"
          [class]="'tab ' + (activeTab === 'hours' ? 'tab-active' : '')"
        >
          Operating Hours
        </button>
        <button
          (click)="activeTab = 'payment'; loadPaymentSettings()"
          [class]="'tab ' + (activeTab === 'payment' ? 'tab-active' : '')"
        >
          Payment & Shipping
        </button>
        <button
          (click)="activeTab = 'account'"
          [class]="'tab ' + (activeTab === 'account' ? 'tab-active' : '')"
        >
          Account
        </button>
      </div>

      <!-- Error Alert -->
      @if (error()) {
        <div class="alert alert-error mb-4">
          <i class="pi pi-exclamation-circle"></i>
          <span>{{ error() }}</span>
          <button class="btn btn-ghost btn-sm" (click)="error.set(null)">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <!-- Success Alert -->
      @if (success()) {
        <div class="alert alert-success mb-4">
          <i class="pi pi-check-circle"></i>
          <span>{{ success() }}</span>
          <button class="btn btn-ghost btn-sm" (click)="success.set(null)">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }

      @else {
        <!-- Profile Tab -->
        @if (activeTab === 'profile') {
          <!-- Logo Upload Card -->
          <div class="card bg-base-200 border border-neutral mb-6">
            <div class="card-body">
              <h2 class="card-title mb-4">Business Logo</h2>
              <p class="text-secondary text-sm mb-4">
                Upload your business logo. This will appear on the map and in search results.
                Recommended: Square image (1:1 ratio), max 2MB.
              </p>
              <div class="flex flex-col md:flex-row items-start gap-6">
                <!-- Logo Preview -->
                <div class="flex-shrink-0">
                  @if (profile.logoUrl) {
                    <div class="relative group">
                      <img
                        [src]="profile.logoUrl"
                        alt="Business Logo"
                        class="w-32 h-32 rounded-lg object-cover border-2 border-neutral"
                      />
                      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                        <button
                          type="button"
                          (click)="removeLogo()"
                          class="btn btn-sm btn-error"
                          [disabled]="isUploadingLogo()"
                        >
                          <i class="pi pi-trash"></i>
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="w-32 h-32 rounded-lg border-2 border-dashed border-neutral flex items-center justify-center bg-base-300">
                      <i class="pi pi-image text-4xl text-secondary"></i>
                    </div>
                  }
                </div>

                <!-- Upload Controls -->
                <div class="flex-1">
                  <input
                    type="file"
                    #logoInput
                    (change)="onLogoSelected($event)"
                    accept="image/jpeg,image/png,image/webp"
                    class="hidden"
                  />
                  <button
                    type="button"
                    (click)="logoInput.click()"
                    class="btn btn-primary btn-outline"
                    [disabled]="isUploadingLogo()"
                  >
                    @if (isUploadingLogo()) {
                      <span class="loading loading-spinner loading-sm"></span>
                      Uploading...
                    } @else {
                      <i class="pi pi-upload mr-2"></i>
                      {{ profile.logoUrl ? 'Change Logo' : 'Upload Logo' }}
                    }
                  </button>
                  <p class="text-xs text-secondary mt-2">
                    Supports: JPG, PNG, WebP. Max size: 2MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="card bg-base-200 border border-neutral">
            <div class="card-body">
              <h2 class="card-title mb-4">Business Information</h2>
              <form (ngSubmit)="saveProfile()">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Business Name -->
                  <div class="form-control md:col-span-2">
                    <label class="label">
                      <span class="label-text">Business Name *</span>
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="profile.name"
                      name="name"
                      class="input input-bordered bg-base-300"
                      required
                    />
                  </div>

                  <!-- Description -->
                  <div class="form-control md:col-span-2">
                    <label class="label">
                      <span class="label-text">Description</span>
                    </label>
                    <textarea
                      [(ngModel)]="profile.description"
                      name="description"
                      class="textarea textarea-bordered bg-base-300 h-24"
                      placeholder="Tell customers about your business..."
                    ></textarea>
                  </div>

                  <!-- Phone -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Phone Number</span>
                    </label>
                    <input
                      type="tel"
                      [(ngModel)]="profile.phone"
                      name="phone"
                      class="input input-bordered bg-base-300"
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>

                  <!-- Email -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      [(ngModel)]="profile.email"
                      name="email"
                      class="input input-bordered bg-base-300"
                    />
                  </div>

                  <!-- Website -->
                  <div class="form-control md:col-span-2">
                    <label class="label">
                      <span class="label-text">Website</span>
                    </label>
                    <input
                      type="url"
                      [(ngModel)]="profile.website"
                      name="website"
                      class="input input-bordered bg-base-300"
                      placeholder="https://..."
                    />
                  </div>

                  <!-- Address -->
                  <div class="form-control md:col-span-2">
                    <label class="label">
                      <span class="label-text">Street Address</span>
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="profile.address"
                      name="address"
                      class="input input-bordered bg-base-300"
                    />
                  </div>

                  <!-- City -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">City</span>
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="profile.city"
                      name="city"
                      class="input input-bordered bg-base-300"
                    />
                  </div>

                  <!-- Province -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Province</span>
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="profile.province"
                      name="province"
                      class="input input-bordered bg-base-300"
                    />
                  </div>

                  <!-- Postal Code -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Postal Code</span>
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="profile.postalCode"
                      name="postalCode"
                      class="input input-bordered bg-base-300"
                    />
                  </div>

                  <!-- Physical Location Toggle -->
                  <div class="form-control md:col-span-2">
                    <label class="label cursor-pointer justify-start gap-4">
                      <input
                        type="checkbox"
                        [(ngModel)]="profile.hasPhysicalLocation"
                        name="hasPhysicalLocation"
                        class="toggle toggle-primary"
                      />
                      <div>
                        <span class="label-text font-medium">Physical location customers can visit</span>
                        <p class="text-xs text-secondary mt-1">
                          Turn off if you're an online-only business (no storefront). Online-only businesses won't appear on the map but can still be found via search.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="card-actions justify-end mt-6">
                  <button
                    type="submit"
                    class="btn btn-primary"
                    [disabled]="isSaving()"
                  >
                    @if (isSaving()) {
                      <span class="loading loading-spinner loading-sm"></span>
                    }
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- Operating Hours Tab -->
        @if (activeTab === 'hours') {
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body">
              <h2 class="card-title mb-4">Operating Hours</h2>
              <form (ngSubmit)="saveHours()">
                <div class="space-y-4">
                  @for (day of daysOfWeek; track day.key) {
                    <div class="flex flex-col md:flex-row md:items-center gap-4 py-3 border-b border-neutral last:border-0">
                      <div class="w-28 font-medium">{{ day.label }}</div>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          [checked]="!getHours(day.key).closed"
                          (change)="toggleDay(day.key)"
                          class="checkbox checkbox-primary checkbox-sm"
                        />
                        <span class="text-sm">Open</span>
                      </label>
                      @if (!getHours(day.key).closed) {
                        <div class="flex items-center gap-2">
                          <input
                            type="time"
                            [value]="getHours(day.key).open"
                            (change)="setOpenTime(day.key, $event)"
                            class="input input-bordered input-sm bg-base-300 w-32"
                          />
                          <span class="text-secondary">to</span>
                          <input
                            type="time"
                            [value]="getHours(day.key).close"
                            (change)="setCloseTime(day.key, $event)"
                            class="input input-bordered input-sm bg-base-300 w-32"
                          />
                        </div>
                      } @else {
                        <span class="text-secondary text-sm">Closed</span>
                      }
                    </div>
                  }
                </div>

                <div class="card-actions justify-end mt-6">
                  <button
                    type="submit"
                    class="btn btn-primary"
                    [disabled]="isSaving()"
                  >
                    @if (isSaving()) {
                      <span class="loading loading-spinner loading-sm"></span>
                    }
                    Save Hours
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- Payment Tab -->
        @if (activeTab === 'payment') {
          <div class="space-y-6">
            <!-- Payment Methods -->
            <div class="card bg-base-200 border border-neutral">
              <div class="card-body">
                <h2 class="card-title mb-4">Payment Methods</h2>
                <p class="text-secondary text-sm mb-6">
                  Configure how customers can pay for their orders. You'll need to manually verify payments before processing orders.
                </p>

                <div class="space-y-6">
                  <!-- GCash -->
                  <div class="border border-neutral rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <i class="pi pi-wallet text-white"></i>
                        </div>
                        <div>
                          <p class="font-medium">GCash</p>
                          <p class="text-xs text-secondary">Mobile wallet payment</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        [(ngModel)]="paymentSettings.acceptsGcash"
                        class="toggle toggle-primary"
                      />
                    </div>
                    @if (paymentSettings.acceptsGcash) {
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div class="form-control">
                          <label class="label">
                            <span class="label-text">GCash Number *</span>
                          </label>
                          <input
                            type="tel"
                            [(ngModel)]="paymentSettings.gcashNumber"
                            class="input input-bordered bg-base-300"
                            placeholder="09XX XXX XXXX"
                          />
                        </div>
                        <div class="form-control">
                          <label class="label">
                            <span class="label-text">Account Name *</span>
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="paymentSettings.gcashName"
                            class="input input-bordered bg-base-300"
                            placeholder="Name shown on GCash"
                          />
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Bank Transfer -->
                  <div class="border border-neutral rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <i class="pi pi-building text-white"></i>
                        </div>
                        <div>
                          <p class="font-medium">Bank Transfer</p>
                          <p class="text-xs text-secondary">Direct bank deposit</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        [(ngModel)]="paymentSettings.acceptsBankTransfer"
                        class="toggle toggle-primary"
                      />
                    </div>
                    @if (paymentSettings.acceptsBankTransfer) {
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div class="form-control">
                          <label class="label">
                            <span class="label-text">Bank Name *</span>
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="paymentSettings.bankName"
                            class="input input-bordered bg-base-300"
                            placeholder="e.g., BDO, BPI, Metrobank"
                          />
                        </div>
                        <div class="form-control">
                          <label class="label">
                            <span class="label-text">Account Number *</span>
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="paymentSettings.bankAccountNumber"
                            class="input input-bordered bg-base-300"
                            placeholder="XXXX XXXX XXXX"
                          />
                        </div>
                        <div class="form-control md:col-span-2">
                          <label class="label">
                            <span class="label-text">Account Name *</span>
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="paymentSettings.bankAccountName"
                            class="input input-bordered bg-base-300"
                            placeholder="Account holder name"
                          />
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Cash on Delivery -->
                  <div class="border border-neutral rounded-lg p-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                          <i class="pi pi-money-bill text-white"></i>
                        </div>
                        <div>
                          <p class="font-medium">Cash on Delivery</p>
                          <p class="text-xs text-secondary">Pay when order is received</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        [(ngModel)]="paymentSettings.acceptsCod"
                        class="toggle toggle-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Shipping Options -->
            <div class="card bg-base-200 border border-neutral">
              <div class="card-body">
                <h2 class="card-title mb-4">Shipping & Pickup</h2>
                <p class="text-secondary text-sm mb-6">
                  Configure how customers can receive their orders.
                </p>

                <div class="space-y-6">
                  <!-- Pickup -->
                  <div class="border border-neutral rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <i class="pi pi-map-marker text-white"></i>
                        </div>
                        <div>
                          <p class="font-medium">Store Pickup</p>
                          <p class="text-xs text-secondary">Customer picks up at your location</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        [(ngModel)]="paymentSettings.offersPickup"
                        class="toggle toggle-primary"
                      />
                    </div>
                    @if (paymentSettings.offersPickup) {
                      <div class="form-control mt-4">
                        <label class="label">
                          <span class="label-text">Pickup Address</span>
                        </label>
                        <textarea
                          [(ngModel)]="paymentSettings.pickupAddress"
                          class="textarea textarea-bordered bg-base-300"
                          placeholder="Full address for customer pickup"
                          rows="2"
                        ></textarea>
                        <label class="label">
                          <span class="label-text-alt text-secondary">
                            Leave blank to use your business address
                          </span>
                        </label>
                      </div>
                    }
                  </div>

                  <!-- Delivery -->
                  <div class="border border-neutral rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                          <i class="pi pi-truck text-white"></i>
                        </div>
                        <div>
                          <p class="font-medium">Delivery</p>
                          <p class="text-xs text-secondary">Ship orders to customers</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        [(ngModel)]="paymentSettings.offersDelivery"
                        class="toggle toggle-primary"
                      />
                    </div>
                    @if (paymentSettings.offersDelivery) {
                      <div class="form-control mt-4">
                        <label class="label">
                          <span class="label-text">Delivery Fee (₱)</span>
                        </label>
                        <input
                          type="number"
                          [ngModel]="paymentSettings.deliveryFeeCents / 100"
                          (ngModelChange)="paymentSettings.deliveryFeeCents = $event * 100"
                          class="input input-bordered bg-base-300 w-40"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                        <label class="label">
                          <span class="label-text-alt text-secondary">
                            Set to 0 for free delivery
                          </span>
                        </label>
                      </div>
                    }
                  </div>
                </div>

                <div class="card-actions justify-end mt-6">
                  <button
                    type="button"
                    (click)="savePaymentSettings()"
                    class="btn btn-primary"
                    [disabled]="isSavingPayment()"
                  >
                    @if (isSavingPayment()) {
                      <span class="loading loading-spinner loading-sm"></span>
                    }
                    Save Payment Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Account Tab -->
        @if (activeTab === 'account') {
          <div class="space-y-6">
            <!-- Account Info -->
            <div class="card bg-base-200 border border-neutral">
              <div class="card-body">
                <h2 class="card-title mb-4">Account Information</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p class="text-sm text-secondary">Email</p>
                    <p class="font-medium">{{ authService.business()?.ownerEmail || 'N/A' }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-secondary">Business Type</p>
                    <p class="font-medium capitalize">{{ authService.business()?.businessType || 'N/A' }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-secondary">Verification Status</p>
                    <span [class]="'badge ' + getVerificationBadge(authService.business()?.verificationStatus)">
                      {{ authService.business()?.verificationStatus || 'N/A' }}
                    </span>
                  </div>
                  <div>
                    <p class="text-sm text-secondary">Subscription</p>
                    <span class="badge badge-primary">
                      {{ authService.business()?.subscriptionTier || 'Free' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Password Change -->
            <div class="card bg-base-200 border border-neutral">
              <div class="card-body">
                <h2 class="card-title mb-4">Change Password</h2>
                <form (ngSubmit)="changePassword()">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">New Password</span>
                      </label>
                      <input
                        type="password"
                        [(ngModel)]="newPassword"
                        name="newPassword"
                        class="input input-bordered bg-base-300"
                        minlength="8"
                        required
                      />
                    </div>
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">Confirm Password</span>
                      </label>
                      <input
                        type="password"
                        [(ngModel)]="confirmPassword"
                        name="confirmPassword"
                        class="input input-bordered bg-base-300"
                        required
                      />
                    </div>
                  </div>
                  <div class="card-actions justify-end mt-4">
                    <button
                      type="submit"
                      class="btn btn-primary"
                      [disabled]="isSaving() || !newPassword || newPassword !== confirmPassword"
                    >
                      @if (isSaving()) {
                        <span class="loading loading-spinner loading-sm"></span>
                      }
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Danger Zone -->
            <div class="card bg-base-200 border border-error">
              <div class="card-body">
                <h2 class="card-title text-error mb-4">Danger Zone</h2>
                <p class="text-secondary mb-4">
                  Logging out will end your session. You can log back in anytime.
                </p>
                <div class="flex gap-4">
                  <button
                    (click)="logout()"
                    class="btn btn-error btn-outline"
                  >
                    <i class="pi pi-sign-out mr-2"></i>
                    Log Out
                  </button>
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
export class SettingsComponent implements OnInit {
  authService = inject(AuthService);
  supabase = inject(SupabaseService);
  orderService = inject(OrderService);
  router = inject(Router);

  activeTab: 'profile' | 'hours' | 'payment' | 'account' = 'profile';

  // State
  isLoading = signal(false);
  isSaving = signal(false);
  isUploadingLogo = signal(false);
  isSavingPayment = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Payment settings
  paymentSettings: PaymentSettings = {
    id: '',
    businessId: '',
    businessType: '',
    acceptsGcash: false,
    gcashNumber: '',
    gcashName: '',
    acceptsBankTransfer: false,
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    acceptsCod: false,
    offersPickup: true,
    pickupAddress: '',
    offersDelivery: false,
    deliveryFeeCents: 0,
  };

  // Profile form
  profile: BusinessProfile = {
    id: '',
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    operatingHours: {},
    hasPhysicalLocation: true,
  };

  // Operating hours
  operatingHours: OperatingHours = {};

  // Password change
  newPassword = '';
  confirmPassword = '';

  daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ] as const;

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const response = await this.supabase.callFunctionWithAuth<BusinessProfile>(
        'manage-business-profile',
        { action: 'get' }
      );

      if (response) {
        this.profile = {
          ...response,
          hasPhysicalLocation: response.hasPhysicalLocation ?? true,
        };
        this.operatingHours = response.operatingHours || {};
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveProfile(): Promise<void> {
    try {
      this.isSaving.set(true);
      this.error.set(null);
      this.success.set(null);

      await this.supabase.callFunctionWithAuth(
        'manage-business-profile',
        {
          action: 'update',
          name: this.profile.name,
          description: this.profile.description,
          phone: this.profile.phone,
          email: this.profile.email,
          website: this.profile.website,
          address: this.profile.address,
          city: this.profile.city,
          province: this.profile.province,
          postalCode: this.profile.postalCode,
          hasPhysicalLocation: this.profile.hasPhysicalLocation,
        }
      );

      this.success.set('Profile updated successfully');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      this.isSaving.set(false);
    }
  }

  async saveHours(): Promise<void> {
    try {
      this.isSaving.set(true);
      this.error.set(null);
      this.success.set(null);

      await this.supabase.callFunctionWithAuth(
        'manage-business-profile',
        {
          action: 'update',
          operatingHours: this.operatingHours,
        }
      );

      this.success.set('Operating hours updated successfully');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save hours');
    } finally {
      this.isSaving.set(false);
    }
  }

  getHours(day: string): DayHours {
    return (this.operatingHours as Record<string, DayHours>)[day] || { open: '09:00', close: '18:00', closed: true };
  }

  toggleDay(day: string): void {
    const current = this.getHours(day);
    (this.operatingHours as Record<string, DayHours>)[day] = {
      ...current,
      closed: !current.closed,
    };
  }

  setOpenTime(day: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const current = this.getHours(day);
    (this.operatingHours as Record<string, DayHours>)[day] = {
      ...current,
      open: value,
    };
  }

  setCloseTime(day: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const current = this.getHours(day);
    (this.operatingHours as Record<string, DayHours>)[day] = {
      ...current,
      close: value,
    };
  }

  async changePassword(): Promise<void> {
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    try {
      this.isSaving.set(true);
      this.error.set(null);
      this.success.set(null);

      await this.supabase.callFunctionWithAuth(
        'update-password',
        { newPassword: this.newPassword }
      );

      this.success.set('Password updated successfully');
      this.newPassword = '';
      this.confirmPassword = '';
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      this.isSaving.set(false);
    }
  }

  getVerificationBadge(status?: string): string {
    switch (status) {
      case 'approved': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'rejected': return 'badge-error';
      default: return 'badge-neutral';
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error.set('Logo must be under 2MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.error.set('Logo must be JPG, PNG, or WebP');
      return;
    }

    try {
      this.isUploadingLogo.set(true);
      this.error.set(null);

      // Upload to R2
      const result = await this.supabase.uploadImageToR2(file, 'service-providers', 'logo.jpg');

      // Update profile with new logo URL
      await this.supabase.callFunctionWithAuth(
        'manage-business-profile',
        {
          action: 'update',
          logoUrl: result.url,
        }
      );

      this.profile.logoUrl = result.url;
      this.success.set('Logo uploaded successfully');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      this.isUploadingLogo.set(false);
      // Reset input
      input.value = '';
    }
  }

  async removeLogo(): Promise<void> {
    try {
      this.isUploadingLogo.set(true);
      this.error.set(null);

      await this.supabase.callFunctionWithAuth(
        'manage-business-profile',
        {
          action: 'update',
          logoUrl: null,
        }
      );

      this.profile.logoUrl = undefined;
      this.success.set('Logo removed');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to remove logo');
    } finally {
      this.isUploadingLogo.set(false);
    }
  }

  async loadPaymentSettings(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const settings = await this.orderService.loadPaymentSettings();
      if (settings) {
        this.paymentSettings = { ...settings };
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load payment settings');
    } finally {
      this.isLoading.set(false);
    }
  }

  async savePaymentSettings(): Promise<void> {
    try {
      this.isSavingPayment.set(true);
      this.error.set(null);
      this.success.set(null);

      await this.orderService.updatePaymentSettings({
        acceptsGcash: this.paymentSettings.acceptsGcash,
        gcashNumber: this.paymentSettings.gcashNumber,
        gcashName: this.paymentSettings.gcashName,
        acceptsBankTransfer: this.paymentSettings.acceptsBankTransfer,
        bankName: this.paymentSettings.bankName,
        bankAccountNumber: this.paymentSettings.bankAccountNumber,
        bankAccountName: this.paymentSettings.bankAccountName,
        acceptsCod: this.paymentSettings.acceptsCod,
        offersPickup: this.paymentSettings.offersPickup,
        pickupAddress: this.paymentSettings.pickupAddress,
        offersDelivery: this.paymentSettings.offersDelivery,
        deliveryFeeCents: this.paymentSettings.deliveryFeeCents,
      });

      this.success.set('Payment settings updated successfully');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save payment settings');
    } finally {
      this.isSavingPayment.set(false);
    }
  }
}
