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
