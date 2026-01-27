/**
 * Order Types for Business Portal
 */

export type OrderStatus =
  | 'pending_payment'
  | 'payment_uploaded'
  | 'payment_verified'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod = 'gcash' | 'bank_transfer' | 'cod';
export type ShippingMethod = 'pickup' | 'delivery' | 'cod';

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'pending_payment', label: 'Pending Payment', color: '#FFD535' },
  { value: 'payment_uploaded', label: 'Payment Uploaded', color: '#60A5FA' },
  { value: 'payment_verified', label: 'Payment Verified', color: '#10B981' },
  { value: 'processing', label: 'Processing', color: '#A78BFA' },
  { value: 'shipped', label: 'Shipped', color: '#34D399' },
  { value: 'delivered', label: 'Delivered', color: '#10B981' },
  { value: 'completed', label: 'Completed', color: '#6B7280' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
  { value: 'refunded', label: 'Refunded', color: '#FB923C' },
];

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'gcash', label: 'GCash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cod', label: 'Cash on Delivery' },
];

export const SHIPPING_METHOD_OPTIONS: { value: ShippingMethod; label: string }[] = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'cod', label: 'COD' },
];

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  contactName?: string;
  contactPhone?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productImageUrl?: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  isPreorder: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  businessId: string;
  businessType: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAvatarUrl?: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  status: OrderStatus;
  shippingMethod?: ShippingMethod;
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  paymentMethod?: PaymentMethod;
  paymentProofUrl?: string;
  paymentVerifiedAt?: string;
  chatId: string;
  customerNotes?: string;
  businessNotes?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface ListOrdersRequest {
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}

export interface UpdateOrderStatusRequest {
  orderId: string;
  status: OrderStatus;
  trackingNumber?: string;
  businessNotes?: string;
}

export interface PaymentSettings {
  id: string;
  businessId: string;
  businessType: string;
  acceptsGcash: boolean;
  gcashNumber?: string;
  gcashName?: string;
  acceptsBankTransfer: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  acceptsCod: boolean;
  offersPickup: boolean;
  pickupAddress?: string;
  offersDelivery: boolean;
  deliveryFeeCents: number;
}

export interface UpdatePaymentSettingsRequest {
  acceptsGcash?: boolean;
  gcashNumber?: string;
  gcashName?: string;
  acceptsBankTransfer?: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  acceptsCod?: boolean;
  offersPickup?: boolean;
  pickupAddress?: string;
  offersDelivery?: boolean;
  deliveryFeeCents?: number;
}

// Helper functions
export function formatPrice(priceCents: number, currency: string = 'PHP'): string {
  const symbols: Record<string, string> = {
    PHP: '₱',
    USD: '$',
    IDR: 'Rp',
    THB: '฿',
    VND: '₫',
    MYR: 'RM',
    SGD: 'S$',
  };
  const symbol = symbols[currency] || currency;
  const price = (priceCents / 100).toFixed(2);
  return `${symbol}${price}`;
}

export function getStatusConfig(status: OrderStatus): { label: string; color: string; bgColor: string } {
  const config = ORDER_STATUS_OPTIONS.find(s => s.value === status);
  return {
    label: config?.label || status,
    color: config?.color || '#6B7280',
    bgColor: `${config?.color || '#6B7280'}20`,
  };
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  const config = PAYMENT_METHOD_OPTIONS.find(p => p.value === method);
  return config?.label || method;
}

export function getShippingMethodLabel(method: ShippingMethod): string {
  const config = SHIPPING_METHOD_OPTIONS.find(s => s.value === method);
  return config?.label || method;
}
