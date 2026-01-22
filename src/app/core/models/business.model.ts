/**
 * Business Portal Models
 */

export type BusinessType = 'shop' | 'service_provider' | 'retailer' | 'dealership';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
  };
}

export interface Business {
  id: string;
  authId: string;
  ownerEmail: string;
  businessName: string;
  businessType: BusinessType;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  operatingHours: OperatingHours;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  rejectionReason: string | null;
  countryCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  inviteCode: string;
  email: string;
  password: string;
  businessName: string;
  businessType: BusinessType;
  phone?: string;
  address?: string;
  countryCode?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  businessName?: string;
  description?: string;
  phone?: string;
  website?: string;
  address?: string;
  operatingHours?: OperatingHours;
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginResponse {
  session: AuthSession;
  business: Business;
}

export interface RegisterResponse {
  business: {
    id: string;
    business_name: string;
    business_type: BusinessType;
    verification_status: VerificationStatus;
    subscription_tier: SubscriptionTier;
    subscription_expires_at: string;
    created_at: string;
  };
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: number;
  };
  meta?: {
    timestamp: string;
    action?: string;
    [key: string]: unknown;
  };
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  shop: 'Motorcycle Shop',
  service_provider: 'Service Provider',
  retailer: 'Parts Retailer',
  dealership: 'Dealership',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};
