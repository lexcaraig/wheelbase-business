import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { BusinessType, BUSINESS_TYPE_LABELS } from '../../../core/models/business.model';

@Component({
  selector: 'app-claim',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card max-w-md mx-auto">
      <h2 class="text-2xl font-bold text-text-primary mb-2 text-center">
        Claim Your Business
      </h2>
      <p class="text-text-secondary text-center mb-6">
        Enter your invite code to set up your business account.
      </p>

      @if (authService.error()) {
        <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          {{ authService.error() }}
        </div>
      }

      @if (claimSuccess()) {
        <div class="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400">
          <h3 class="font-semibold mb-2">Business Claimed!</h3>
          <p class="text-sm">
            Your business account is now active. Redirecting to dashboard...
          </p>
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
              class="input-field uppercase tracking-widest text-center font-mono text-lg"
              placeholder="XXXXXXXX"
              required
              maxlength="8"
              [disabled]="isSubmitting()"
            />
            <p class="text-xs text-text-muted mt-1">Enter the 8-character code sent to your email</p>
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
              <span>Claiming...</span>
            } @else {
              <span>Claim Business</span>
            }
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-border-color">
          <p class="text-text-muted text-sm text-center mb-4">
            Don't have an invite code?
          </p>
          <p class="text-text-secondary text-xs text-center">
            Contact us at <a href="mailto:business@ridewheelbase.app" class="text-primary hover:underline">business&#64;ridewheelbase.app</a> to register your business.
          </p>
        </div>

        <div class="mt-4 text-center">
          <button
            (click)="signOut()"
            class="text-text-muted hover:text-text-secondary text-sm"
          >
            Sign out and use a different account
          </button>
        </div>
      }
    </div>
  `,
  styles: []
})
export class ClaimComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  inviteCode = '';
  businessType: BusinessType | '' = '';
  phone = '';
  address = '';

  isSubmitting = signal(false);
  claimSuccess = signal(false);

  businessTypes = Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({
    value: value as BusinessType,
    label
  }));

  isFormValid(): boolean {
    return !!(
      this.inviteCode.trim().length >= 6 &&
      this.businessType
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isSubmitting.set(true);
    this.authService.clearError();

    try {
      await this.authService.claimBusiness({
        inviteCode: this.inviteCode.toUpperCase().trim(),
        businessType: this.businessType as BusinessType,
        phone: this.phone || undefined,
        address: this.address || undefined,
      });

      this.claimSuccess.set(true);

      // Redirect to dashboard after short delay
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1500);
    } catch (error) {
      console.error('Claim error:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.authService.logout();
  }
}
