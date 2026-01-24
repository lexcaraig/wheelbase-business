import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import {
  Business,
  UpdateProfileRequest,
} from '../models/business.model';
import { ClaimStatus, ExistingClaimInfo } from '../models/claim.model';

const BUSINESS_STORAGE_KEY = 'wheelbase-business-profile';
const CLAIM_STORAGE_KEY = 'wheelbase-claim-status';

/**
 * Unified business status that handles both:
 * - Legacy business accounts (from invite code flow)
 * - Claimed service providers (from new claim flow)
 */
export interface UnifiedBusinessStatus {
  type: 'business_account' | 'claimed_provider';
  id: string;
  businessName: string;
  claimStatus: ClaimStatus;
  verificationStatus?: string;
  rejectionReason?: string;
  submittedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private businessSignal = signal<Business | null>(null);
  private claimedProviderSignal = signal<ExistingClaimInfo | null>(null);
  private loadingSignal = signal<boolean>(true);
  private errorSignal = signal<string | null>(null);
  private hasSessionSignal = signal<boolean>(false);

  // Computed signals
  readonly business = computed(() => this.businessSignal());
  readonly claimedProvider = computed(() => this.claimedProviderSignal());

  // User has either a business account OR a claimed provider
  readonly hasBusinessOrClaim = computed(() =>
    this.businessSignal() !== null || this.claimedProviderSignal() !== null
  );

  // Full authentication: session + (business OR claimed provider with pending/verified status)
  readonly isAuthenticated = computed(() => {
    if (!this.hasSessionSignal()) return false;
    if (this.businessSignal()) return true;
    const claim = this.claimedProviderSignal();
    return claim !== null && (claim.claimStatus === 'pending' || claim.claimStatus === 'verified');
  });

  readonly hasSession = computed(() => this.hasSessionSignal());

  // User has session but no business AND no claim
  readonly needsBusiness = computed(() =>
    this.hasSessionSignal() &&
    !this.businessSignal() &&
    !this.claimedProviderSignal() &&
    !this.loadingSignal()
  );

  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  // Verification status from either source
  readonly verificationStatus = computed(() => {
    if (this.businessSignal()) {
      return this.businessSignal()?.verificationStatus || null;
    }
    return this.claimedProviderSignal()?.claimStatus || null;
  });

  readonly isApproved = computed(() =>
    this.businessSignal()?.verificationStatus === 'approved' ||
    this.claimedProviderSignal()?.claimStatus === 'verified'
  );

  readonly isPending = computed(() =>
    this.businessSignal()?.verificationStatus === 'pending' ||
    this.claimedProviderSignal()?.claimStatus === 'pending'
  );

  readonly isRejected = computed(() =>
    this.businessSignal()?.verificationStatus === 'rejected' ||
    this.claimedProviderSignal()?.claimStatus === 'rejected'
  );

  // Get unified business info
  readonly unifiedBusiness = computed<UnifiedBusinessStatus | null>(() => {
    const business = this.businessSignal();
    if (business) {
      return {
        type: 'business_account',
        id: business.id,
        businessName: business.businessName,
        claimStatus: business.verificationStatus as ClaimStatus,
        verificationStatus: business.verificationStatus,
        rejectionReason: business.rejectionReason || undefined,
      };
    }

    const claim = this.claimedProviderSignal();
    if (claim) {
      return {
        type: 'claimed_provider',
        id: claim.providerId,
        businessName: claim.businessName,
        claimStatus: claim.claimStatus,
        submittedAt: claim.submittedAt,
      };
    }

    return null;
  });

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.initializeAuth();

    // Listen to auth state changes
    this.supabase.session$.subscribe(async (session) => {
      if (session) {
        this.hasSessionSignal.set(true);
        // Try to fetch business profile or claim status
        await this.refreshAllStatus();
      } else {
        this.hasSessionSignal.set(false);
        this.businessSignal.set(null);
        this.claimedProviderSignal.set(null);
        this.clearStorage();
      }
    });
  }

  private async initializeAuth(): Promise<void> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // Try to load from storage
      const storedBusiness = this.loadBusinessFromStorage();
      if (storedBusiness) {
        this.businessSignal.set(storedBusiness);
      }

      const storedClaim = this.loadClaimFromStorage();
      if (storedClaim) {
        this.claimedProviderSignal.set(storedClaim);
      }

      // Check if we have a valid session
      const session = await this.supabase.getSession();
      if (session) {
        this.hasSessionSignal.set(true);
        // Refresh from server
        await this.refreshAllStatus();
      } else {
        // No session, clear any stored data
        this.hasSessionSignal.set(false);
        this.clearStorage();
        this.businessSignal.set(null);
        this.claimedProviderSignal.set(null);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.clearStorage();
      this.businessSignal.set(null);
      this.claimedProviderSignal.set(null);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Refresh both business profile and claim status
   */
  private async refreshAllStatus(): Promise<void> {
    // Try to fetch business profile (legacy)
    await this.refreshProfile();

    // If no business, check for claimed provider
    if (!this.businessSignal()) {
      await this.refreshClaimStatus();
    }
  }

  /**
   * Sign in with Google (uses existing Wheelbase account)
   */
  async signInWithGoogle(): Promise<void> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);
      await this.supabase.signInWithGoogle();
      // Redirect happens automatically, callback handles the rest
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await this.supabase.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearStorage();
      this.businessSignal.set(null);
      this.claimedProviderSignal.set(null);
      await this.router.navigate(['/login']);
    }
  }

  /**
   * Refresh the business profile from the server (legacy flow)
   */
  async refreshProfile(): Promise<Business | null> {
    try {
      const business = await this.supabase.callFunctionWithAuth<Business>(
        'business-profile'
      );

      this.businessSignal.set(business);
      this.saveBusinessToStorage(business);

      return business;
    } catch (error) {
      // Expected error if user doesn't have a business account
      console.log('No business account found (expected for claim flow users)');
      this.businessSignal.set(null);
      return null;
    }
  }

  /**
   * Refresh claim status for claimed service provider
   */
  async refreshClaimStatus(): Promise<ExistingClaimInfo | null> {
    try {
      const claim = await this.supabase.callFunctionWithAuth<ExistingClaimInfo | null>(
        'get-user-claim-status'
      );

      this.claimedProviderSignal.set(claim);
      if (claim) {
        this.saveClaimToStorage(claim);
      } else {
        localStorage.removeItem(CLAIM_STORAGE_KEY);
      }

      return claim;
    } catch (error) {
      console.log('No claim status found');
      this.claimedProviderSignal.set(null);
      return null;
    }
  }

  /**
   * Update the business profile (legacy flow)
   */
  async updateProfile(updates: UpdateProfileRequest): Promise<Business> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.client.functions.invoke('business-profile', {
        method: 'PUT',
        body: updates
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Update failed');
      }

      const business = response.data.data as Business;
      this.businessSignal.set(business);
      this.saveBusinessToStorage(business);

      return business;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Clear any error
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  // Storage helpers - Business
  private saveBusinessToStorage(business: Business): void {
    try {
      localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(business));
    } catch (error) {
      console.error('Failed to save business to storage:', error);
    }
  }

  private loadBusinessFromStorage(): Business | null {
    try {
      const stored = localStorage.getItem(BUSINESS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load business from storage:', error);
      return null;
    }
  }

  // Storage helpers - Claim
  private saveClaimToStorage(claim: ExistingClaimInfo): void {
    try {
      localStorage.setItem(CLAIM_STORAGE_KEY, JSON.stringify(claim));
    } catch (error) {
      console.error('Failed to save claim to storage:', error);
    }
  }

  private loadClaimFromStorage(): ExistingClaimInfo | null {
    try {
      const stored = localStorage.getItem(CLAIM_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load claim from storage:', error);
      return null;
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(BUSINESS_STORAGE_KEY);
      localStorage.removeItem(CLAIM_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}
