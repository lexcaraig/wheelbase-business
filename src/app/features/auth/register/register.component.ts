import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { BusinessType, BUSINESS_TYPE_LABELS } from '../../../core/models/business.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="card">
      <h2 class="text-2xl font-bold text-text-primary mb-6 text-center">
        Register Your Business
      </h2>

      @if (authService.error()) {
        <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          {{ authService.error() }}
        </div>
      }

      @if (registrationSuccess()) {
        <div class="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400">
          <h3 class="font-semibold mb-2">Registration Successful!</h3>
          <p class="text-sm">
            Your business account is active and ready to use.
            You can now sign in to manage your business profile.
          </p>
          <button
            (click)="goToLogin()"
            class="mt-4 w-full btn-primary py-2"
          >
            Sign In Now
          </button>
        </div>
      } @else {
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="inviteCode" class="block text-text-secondary mb-2">Invite Code</label>
            <input
              type="text"
              id="inviteCode"
              [(ngModel)]="inviteCode"
              name="inviteCode"
              class="input-field uppercase tracking-widest text-center font-mono"
              placeholder="XXXXXXXX"
              required
              maxlength="8"
              [disabled]="isSubmitting()"
            />
            <p class="text-xs text-text-muted mt-1">Enter the 8-character code sent to your email</p>
          </div>

          <div>
            <label for="businessName" class="block text-text-secondary mb-2">Business Name</label>
            <input
              type="text"
              id="businessName"
              [(ngModel)]="businessName"
              name="businessName"
              class="input-field"
              placeholder="Your Business Name"
              required
              [disabled]="isSubmitting()"
            />
          </div>

          <div>
            <label for="businessType" class="block text-text-secondary mb-2">Business Type</label>
            <select
              id="businessType"
              [(ngModel)]="businessType"
              name="businessType"
              class="input-field"
              required
              [disabled]="isSubmitting()"
            >
              <option value="">Select business type</option>
              @for (type of businessTypes; track type.value) {
                <option [value]="type.value">{{ type.label }}</option>
              }
            </select>
          </div>

          <div>
            <label for="email" class="block text-text-secondary mb-2">Email</label>
            <input
              type="email"
              id="email"
              [(ngModel)]="email"
              name="email"
              class="input-field"
              placeholder="you&#64;example.com"
              required
              [disabled]="isSubmitting()"
            />
          </div>

          <div>
            <label for="password" class="block text-text-secondary mb-2">Password</label>
            <input
              type="password"
              id="password"
              [(ngModel)]="password"
              name="password"
              class="input-field"
              placeholder="Minimum 8 characters"
              required
              minlength="8"
              [disabled]="isSubmitting()"
            />
          </div>

          <div>
            <label for="phone" class="block text-text-secondary mb-2">Phone (Optional)</label>
            <input
              type="tel"
              id="phone"
              [(ngModel)]="phone"
              name="phone"
              class="input-field"
              placeholder="+63 XXX XXX XXXX"
              [disabled]="isSubmitting()"
            />
          </div>

          <div>
            <label for="address" class="block text-text-secondary mb-2">Address (Optional)</label>
            <input
              type="text"
              id="address"
              [(ngModel)]="address"
              name="address"
              class="input-field"
              placeholder="Business address"
              [disabled]="isSubmitting()"
            />
          </div>

          <button
            type="submit"
            class="w-full btn-primary py-3 flex items-center justify-center gap-2"
            [disabled]="isSubmitting() || !isFormValid()"
          >
            @if (isSubmitting()) {
              <i class="pi pi-spinner pi-spin"></i>
              <span>Registering...</span>
            } @else {
              <span>Register Business</span>
            }
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-text-secondary">
            Already have an account?
            <a routerLink="/login" class="text-primary hover:underline ml-1">
              Sign in
            </a>
          </p>
        </div>
      }
    </div>
  `,
  styles: []
})
export class RegisterComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  inviteCode = '';
  businessName = '';
  businessType: BusinessType | '' = '';
  email = '';
  password = '';
  phone = '';
  address = '';

  isSubmitting = signal(false);
  registrationSuccess = signal(false);

  businessTypes = Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({
    value: value as BusinessType,
    label
  }));

  isFormValid(): boolean {
    return !!(
      this.inviteCode.trim().length >= 6 &&
      this.businessName.trim() &&
      this.businessType &&
      this.email.trim() &&
      this.password.length >= 8
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isSubmitting.set(true);
    this.authService.clearError();

    try {
      await this.authService.register({
        inviteCode: this.inviteCode.toUpperCase().trim(),
        email: this.email,
        password: this.password,
        businessName: this.businessName,
        businessType: this.businessType as BusinessType,
        phone: this.phone || undefined,
        address: this.address || undefined,
        countryCode: 'PH'
      });

      this.registrationSuccess.set(true);
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
