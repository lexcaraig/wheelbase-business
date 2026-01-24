import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  ServiceProviderInfo,
  SubmitClaimRequest,
  ClaimSubmissionResponse,
  ExistingClaimInfo,
  ClaimStatus,
  SearchProvidersRequest,
  SearchProvidersResponse,
  SearchProviderResult,
  CreateProviderRequest,
  CreateProviderResponse,
} from '../models/claim.model';

@Injectable({
  providedIn: 'root'
})
export class ClaimService {
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private providerSignal = signal<ServiceProviderInfo | null>(null);
  private existingClaimSignal = signal<ExistingClaimInfo | null>(null);

  // Search state
  private searchResultsSignal = signal<SearchProviderResult[]>([]);
  private searchLoadingSignal = signal<boolean>(false);

  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly provider = computed(() => this.providerSignal());
  readonly existingClaim = computed(() => this.existingClaimSignal());
  readonly hasExistingClaim = computed(() => this.existingClaimSignal() !== null);
  readonly searchResults = computed(() => this.searchResultsSignal());
  readonly isSearching = computed(() => this.searchLoadingSignal());

  constructor(private supabase: SupabaseService) {}

  clearError(): void {
    this.errorSignal.set(null);
  }

  clearSearchResults(): void {
    this.searchResultsSignal.set([]);
  }

  /**
   * Search for claimable providers (unclaimed or rejected)
   */
  async searchProviders(request: SearchProvidersRequest): Promise<SearchProvidersResponse | null> {
    try {
      this.searchLoadingSignal.set(true);
      this.errorSignal.set(null);

      // Build query params for GET request
      const params = new URLSearchParams({
        query: request.query,
        claimable: 'true',
        limit: String(request.limit || 10),
      });
      if (request.city) params.append('city', request.city);
      if (request.category) params.append('category', request.category);

      // Call search-providers with GET
      const response = await this.supabase.callFunction<SearchProvidersResponse>(
        `search-providers?${params.toString()}`
      );

      this.searchResultsSignal.set(response.providers || []);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to search providers';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.searchLoadingSignal.set(false);
    }
  }

  /**
   * Create a new provider AND claim it in one transaction
   */
  async createAndClaimProvider(request: CreateProviderRequest): Promise<CreateProviderResponse | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<CreateProviderResponse>(
        'create-and-claim-provider',
        request
      );

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create and claim provider';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Fetch provider details for the claim flow confirmation step
   */
  async getProvider(providerId: string): Promise<ServiceProviderInfo | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const provider = await this.supabase.callFunction<ServiceProviderInfo>(
        'get-provider',
        { providerId }
      );

      this.providerSignal.set(provider);
      return provider;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch provider';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Check if user already has a claimed/pending business
   */
  async checkExistingClaim(): Promise<ExistingClaimInfo | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const claim = await this.supabase.callFunctionWithAuth<ExistingClaimInfo | null>(
        'get-user-claim-status'
      );

      this.existingClaimSignal.set(claim);
      return claim;
    } catch (error) {
      // If no claim exists, the function returns null which is fine
      if (error instanceof Error && error.message.includes('No claim found')) {
        this.existingClaimSignal.set(null);
        return null;
      }
      const message = error instanceof Error ? error.message : 'Failed to check claim status';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Upload a document to R2 storage
   */
  async uploadDocument(file: File, documentType: string): Promise<string | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // Get current user for folder organization
      const session = await this.supabase.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Convert file to base64
      const base64 = await this.fileToBase64(file);

      // Call upload-to-r2 edge function
      const response = await this.supabase.callFunctionWithAuth<{ url: string }>(
        'upload-to-r2',
        {
          folder: 'verification',
          filename: `${documentType}_${Date.now()}`,
          contentType: file.type,
          base64Data: base64,
        }
      );

      return response.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload document';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Submit claim request (calls existing claim-provider function)
   */
  async submitClaim(request: SubmitClaimRequest): Promise<ClaimSubmissionResponse | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<ClaimSubmissionResponse>(
        'claim-provider',
        request
      );

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit claim';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get claim status for the logged-in user's claimed provider
   */
  async getClaimStatus(): Promise<{ status: ClaimStatus; rejectionReason?: string } | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<{
        status: ClaimStatus;
        rejectionReason?: string;
      }>('get-claim-status');

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get claim status';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Helper to convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Reset state (useful when navigating away)
   */
  reset(): void {
    this.providerSignal.set(null);
    this.existingClaimSignal.set(null);
    this.errorSignal.set(null);
    this.searchResultsSignal.set([]);
  }
}
