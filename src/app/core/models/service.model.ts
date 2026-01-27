export type ServiceCategory = 'repair' | 'maintenance' | 'custom' | 'inspection' | 'other';
export type PriceType = 'fixed' | 'hourly' | 'quote';

export interface Service {
  id: string;
  businessId: string;
  title: string;
  description?: string;
  category: ServiceCategory;
  priceCents?: number;
  priceType: PriceType;
  durationMinutes?: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  title: string;
  description?: string;
  category: ServiceCategory;
  priceCents?: number;
  priceType?: PriceType;
  durationMinutes?: number;
  isAvailable?: boolean;
}

export interface UpdateServiceRequest {
  serviceId: string;
  title?: string;
  description?: string;
  category?: ServiceCategory;
  priceCents?: number;
  priceType?: PriceType;
  durationMinutes?: number;
  isAvailable?: boolean;
}

export interface ListServicesRequest {
  category?: ServiceCategory;
  search?: string;
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
}

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'custom', label: 'Customization' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

export const PRICE_TYPES: { value: PriceType; label: string }[] = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'quote', label: 'Contact for Quote' },
];

export function formatServicePrice(priceCents?: number, priceType?: PriceType, currency: string = 'PHP'): string {
  if (priceType === 'quote' || priceCents === undefined || priceCents === null) {
    return 'Contact for quote';
  }

  const price = priceCents / 100;
  const formatted = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);

  return priceType === 'hourly' ? `${formatted}/hr` : formatted;
}

export function formatDuration(minutes?: number): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
