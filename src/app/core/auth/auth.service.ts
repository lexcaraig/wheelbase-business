import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import {
  Business,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateProfileRequest,
  BusinessType,
} from '../models/business.model';

const BUSINESS_STORAGE_KEY = 'wheelbase-business-profile';

export interface ClaimRequest {
  inviteCode: string;
  businessType: BusinessType;
  phone?: string;
  address?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private businessSignal = signal<Business | null>(null);
  private loadingSignal = signal<boolean>(true);
  private errorSignal = signal<string | null>(null);
  private hasSessionSignal = signal<boolean>(false);
  private needsBusinessSignal = signal<boolean>(false);

  // Computed signals
  readonly business = computed(() => this.businessSignal());
  readonly isAuthenticated = computed(() => this.hasSessionSignal() && this.businessSignal() !== null);
  readonly hasSession = computed(() => this.hasSessionSignal());
  readonly needsBusiness = computed(() => this.hasSessionSignal() && this.businessSignal() === null && !this.loadingSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly verificationStatus = computed(() => this.businessSignal()?.verificationStatus || null);
  readonly isApproved = computed(() => this.businessSignal()?.verificationStatus === 'approved');
  readonly isPending = computed(() => this.businessSignal()?.verificationStatus === 'pending');

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.initializeAuth();

    // Listen to auth state changes
    this.supabase.session$.subscribe(async (session) => {
      if (session) {
        this.hasSessionSignal.set(true);
        // Try to fetch business profile
        await this.refreshProfile();
      } else {
        this.hasSessionSignal.set(false);
        this.businessSignal.set(null);
        this.clearStorage();
      }
    });
  }

  private async initializeAuth(): Promise<void> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // Try to load business from storage
      const storedBusiness = this.loadFromStorage();
      if (storedBusiness) {
        this.businessSignal.set(storedBusiness);
      }

      // Check if we have a valid session
      const session = await this.supabase.getSession();
      if (session) {
        this.hasSessionSignal.set(true);
        // Refresh business profile
        await this.refreshProfile();
      } else {
        // No session, clear any stored data
        this.hasSessionSignal.set(false);
        this.clearStorage();
        this.businessSignal.set(null);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.clearStorage();
      this.businessSignal.set(null);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Register a new business account
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunction<RegisterResponse>(
        'business-register',
        request
      );

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Login with email and password (legacy - for businesses with separate accounts)
   */
  async login(request: LoginRequest): Promise<void> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunction<LoginResponse>(
        'business-login',
        request
      );

      // Set the session
      await this.supabase.setSession(
        response.session.accessToken,
        response.session.refreshToken
      );

      // Store business profile
      this.businessSignal.set(response.business);
      this.saveToStorage(response.business);

      // Navigate to dashboard
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
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
   * Claim a business using an invite code (for users who signed in with Google)
   */
  async claimBusiness(request: ClaimRequest): Promise<Business> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<{ business: Business; message: string }>(
        'business-claim',
        request
      );

      // Store business profile
      this.businessSignal.set(response.business);
      this.saveToStorage(response.business);

      return response.business;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to claim business';
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
      await this.router.navigate(['/login']);
    }
  }

  /**
   * Refresh the business profile from the server
   */
  async refreshProfile(): Promise<Business | null> {
    try {
      const business = await this.supabase.callFunctionWithAuth<Business>(
        'business-profile'
      );

      this.businessSignal.set(business);
      this.saveToStorage(business);

      return business;
    } catch (error) {
      console.error('Profile refresh error:', error);
      // If we get an auth error, logout
      if (error instanceof Error && error.message.includes('session')) {
        await this.logout();
      }
      return null;
    }
  }

  /**
   * Update the business profile
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
      this.saveToStorage(business);

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

  // Storage helpers
  private saveToStorage(business: Business): void {
    try {
      localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(business));
    } catch (error) {
      console.error('Failed to save business to storage:', error);
    }
  }

  private loadFromStorage(): Business | null {
    try {
      const stored = localStorage.getItem(BUSINESS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load business from storage:', error);
      return null;
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(BUSINESS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}
