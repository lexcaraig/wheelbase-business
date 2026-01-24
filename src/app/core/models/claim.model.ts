/**
 * Claim Flow Models
 * For service provider claim process
 */

export type ClaimStatus = 'unclaimed' | 'pending' | 'verified' | 'rejected';
export type ClaimRole = 'owner' | 'manager' | 'authorized_rep';

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  unclaimed: 'Unclaimed',
  pending: 'Pending Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const CLAIM_ROLE_LABELS: Record<ClaimRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  authorized_rep: 'Authorized Representative',
};

export interface ServiceProviderInfo {
  id: string;
  businessName: string;
  category: string;
  address: string | null;
  city: string | null;
  claimStatus: ClaimStatus;
  isClaimable: boolean;
  logoUrl: string | null;
}

export interface ClaimFormData {
  providerId: string;
  role: ClaimRole;
  contactPhone: string;
  businessEmail: string;
  governmentIdUrl: string;
  businessPermitUrl?: string;
  dtiSecRegistrationUrl?: string;
  birCertificateUrl?: string;
}

export interface SubmitClaimRequest {
  providerId: string;
  ownerName: string;
  contactNumber: string;
  email: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  businessPermitUrl?: string;
  taxIdDocumentUrl?: string;
  proofOfOwnershipUrl?: string;
}

export interface ClaimSubmissionResponse {
  requestId: string;
  providerId: string;
  status: 'pending';
  submittedAt: string;
  message: string;
}

export interface ExistingClaimInfo {
  providerId: string;
  businessName: string;
  claimStatus: ClaimStatus;
  submittedAt: string;
}

// ============================================
// Search Types (for business portal search)
// ============================================

export interface SearchProvidersRequest {
  query: string;
  city?: string;
  category?: string;
  limit?: number;
}

export interface SearchProviderResult {
  id: string;
  business_name: string;
  category: string;
  address: string | null;
  city: string | null;
  claim_status: 'unclaimed' | 'rejected';
  logo_url: string | null;
}

export interface SearchProvidersResponse {
  providers: SearchProviderResult[];
  total: number;
  hasMore: boolean;
}

// ============================================
// Create Provider Types (for add new business flow)
// ============================================

export type ProviderCategory =
  | 'tire_shop'
  | 'repair_shop'
  | 'parts_store'
  | 'dealership'
  | 'towing_service'
  | 'gas_station'
  | 'motorcycle_wash'
  | 'custom_shop'
  | 'other';

export const PROVIDER_CATEGORIES: { value: ProviderCategory; label: string; icon: string }[] = [
  { value: 'repair_shop', label: 'Repair Shop', icon: 'pi pi-wrench' },
  { value: 'tire_shop', label: 'Tire Shop', icon: 'pi pi-circle' },
  { value: 'parts_store', label: 'Parts Store', icon: 'pi pi-box' },
  { value: 'dealership', label: 'Dealership', icon: 'pi pi-building' },
  { value: 'gas_station', label: 'Gas Station', icon: 'pi pi-bolt' },
  { value: 'towing_service', label: 'Towing Service', icon: 'pi pi-truck' },
  { value: 'motorcycle_wash', label: 'Motorcycle Wash', icon: 'pi pi-car' },
  { value: 'custom_shop', label: 'Custom Shop', icon: 'pi pi-cog' },
  { value: 'other', label: 'Other', icon: 'pi pi-map-marker' },
];

export interface ClaimDocuments {
  governmentId: string;
  businessPermit?: string;
  dtiRegistration?: string;
  birCertificate?: string;
}

export interface CreateProviderRequest {
  businessName: string;
  category: ProviderCategory;
  address: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode: string;
  location: { lat: number; lng: number };
  phoneNumber?: string;
  whatsappNumber?: string;
  email?: string;
  websiteUrl?: string;
  ownerName: string;
  role: ClaimRole;
  documents: ClaimDocuments;
}

export interface CreateProviderResponse {
  providerId: string;
  requestId: string;
  status: 'pending';
  message: string;
}
