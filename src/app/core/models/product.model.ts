/**
 * Product Types for Business Portal
 */

export type ProductCategory = 'parts' | 'accessories' | 'gear' | 'motorcycle';

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'parts', label: 'Parts' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'gear', label: 'Gear' },
  { value: 'motorcycle', label: 'Motorcycle' },
];

export interface VariantOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  attributes: Record<string, string>;
  sku?: string;
  stockQuantity: number;
  priceCents?: number | null;
}

export interface Product {
  id: string;
  businessId: string;
  title: string;
  description: string | null;
  category: ProductCategory;
  subcategory: string | null;
  priceCents: number;
  currency: string;
  images: string[];
  specifications: Record<string, string | number>;
  stockQuantity: number;
  allowPreorder: boolean;
  variantOptions: VariantOption[];
  variants: ProductVariant[];
  isAvailable: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  title: string;
  description?: string;
  category: ProductCategory;
  subcategory?: string;
  priceCents: number;
  currency?: string;
  images?: string[];
  specifications?: Record<string, string | number>;
  stockQuantity?: number;
  allowPreorder?: boolean;
  variantOptions?: VariantOption[];
  variants?: ProductVariant[];
  isAvailable?: boolean;
  isFeatured?: boolean;
}

export interface UpdateProductRequest {
  productId: string;
  title?: string;
  description?: string;
  category?: ProductCategory;
  subcategory?: string;
  priceCents?: number;
  currency?: string;
  images?: string[];
  specifications?: Record<string, string | number>;
  stockQuantity?: number;
  allowPreorder?: boolean;
  variantOptions?: VariantOption[];
  variants?: ProductVariant[];
  isAvailable?: boolean;
  isFeatured?: boolean;
}

export interface ListProductsRequest {
  category?: ProductCategory;
  search?: string;
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
}

// Currency options for product pricing
export const CURRENCY_OPTIONS = [
  { value: 'PHP', label: 'PHP - Philippine Peso', symbol: '₱' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'IDR', label: 'IDR - Indonesian Rupiah', symbol: 'Rp' },
  { value: 'THB', label: 'THB - Thai Baht', symbol: '฿' },
  { value: 'VND', label: 'VND - Vietnamese Dong', symbol: '₫' },
  { value: 'MYR', label: 'MYR - Malaysian Ringgit', symbol: 'RM' },
  { value: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$' },
];

// Helper to format price
export function formatPrice(priceCents: number, currency: string = 'PHP'): string {
  const currencyInfo = CURRENCY_OPTIONS.find(c => c.value === currency);
  const symbol = currencyInfo?.symbol || currency;
  const price = (priceCents / 100).toFixed(2);
  return `${symbol}${price}`;
}

// Helper to get currency symbol
export function getCurrencySymbol(currency: string): string {
  const currencyInfo = CURRENCY_OPTIONS.find(c => c.value === currency);
  return currencyInfo?.symbol || currency;
}
