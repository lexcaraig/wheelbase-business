import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Order,
  OrderItem,
  OrderStatus,
  ListOrdersRequest,
  UpdateOrderStatusRequest,
  PaymentSettings,
  UpdatePaymentSettingsRequest,
} from '../models/order.model';

interface OrderListMeta {
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ordersSignal = signal<Order[]>([]);
  private selectedOrderSignal = signal<Order | null>(null);
  private loadingSignal = signal<boolean>(false);
  private savingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private metaSignal = signal<OrderListMeta>({ total: 0, limit: 50, offset: 0 });
  private paymentSettingsSignal = signal<PaymentSettings | null>(null);

  readonly orders = computed(() => this.ordersSignal());
  readonly selectedOrder = computed(() => this.selectedOrderSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly isSaving = computed(() => this.savingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly total = computed(() => this.metaSignal().total);
  readonly meta = computed(() => this.metaSignal());
  readonly paymentSettings = computed(() => this.paymentSettingsSignal());

  // Computed order counts by status
  readonly pendingCount = computed(() =>
    this.ordersSignal().filter(o => o.status === 'pending_payment').length
  );
  readonly paymentUploadedCount = computed(() =>
    this.ordersSignal().filter(o => o.status === 'payment_uploaded').length
  );
  readonly processingCount = computed(() =>
    this.ordersSignal().filter(o => o.status === 'processing').length
  );
  readonly shippedCount = computed(() =>
    this.ordersSignal().filter(o => o.status === 'shipped').length
  );

  constructor(private supabase: SupabaseService) {}

  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Load orders for the current business
   */
  async loadOrders(request: ListOrdersRequest = {}): Promise<Order[]> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<Order[]>(
        'business-orders',
        {
          action: 'list_business',
          ...request,
        }
      );

      this.ordersSignal.set(response || []);
      return response || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load orders';
      this.errorSignal.set(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get a single order with items
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<{ order: Order; items: OrderItem[] }>(
        'business-orders',
        {
          action: 'get',
          orderId,
        }
      );

      if (response) {
        const orderWithItems = { ...response.order, items: response.items };
        this.selectedOrderSignal.set(orderWithItems);
        return orderWithItems;
      }

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load order';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(request: UpdateOrderStatusRequest): Promise<Order | null> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<Order>(
        'business-orders',
        {
          action: 'update_status',
          ...request,
        }
      );

      if (response) {
        // Update in local list
        this.ordersSignal.update(orders =>
          orders.map(o => o.id === response.id ? response : o)
        );

        // Update selected order if it's the same
        if (this.selectedOrderSignal()?.id === response.id) {
          this.selectedOrderSignal.update(order =>
            order ? { ...order, ...response } : null
          );
        }
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update order status';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.savingSignal.set(false);
    }
  }

  /**
   * Verify payment for an order
   */
  async verifyPayment(orderId: string): Promise<Order | null> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<Order>(
        'business-orders',
        {
          action: 'verify_payment',
          orderId,
          approved: true,
        }
      );

      if (response) {
        // Update in local list
        this.ordersSignal.update(orders =>
          orders.map(o => o.id === response.id ? response : o)
        );

        // Update selected order
        if (this.selectedOrderSignal()?.id === response.id) {
          this.selectedOrderSignal.update(order =>
            order ? { ...order, ...response } : null
          );
        }
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify payment';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.savingSignal.set(false);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order | null> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<Order>(
        'business-orders',
        {
          action: 'cancel',
          orderId,
          reason,
        }
      );

      if (response) {
        // Update in local list
        this.ordersSignal.update(orders =>
          orders.map(o => o.id === response.id ? response : o)
        );

        // Update selected order
        if (this.selectedOrderSignal()?.id === response.id) {
          this.selectedOrderSignal.update(order =>
            order ? { ...order, ...response } : null
          );
        }
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel order';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.savingSignal.set(false);
    }
  }

  /**
   * Load payment settings
   */
  async loadPaymentSettings(): Promise<PaymentSettings | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<PaymentSettings>(
        'business-orders',
        {
          action: 'get_payment_settings',
        }
      );

      this.paymentSettingsSignal.set(response);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payment settings';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Update payment settings
   */
  async updatePaymentSettings(request: UpdatePaymentSettingsRequest): Promise<PaymentSettings | null> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<PaymentSettings>(
        'business-orders',
        {
          action: 'update_payment_settings',
          ...request,
        }
      );

      if (response) {
        this.paymentSettingsSignal.set(response);
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update payment settings';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.savingSignal.set(false);
    }
  }

  /**
   * Select an order for detail view
   */
  selectOrder(order: Order | null): void {
    this.selectedOrderSignal.set(order);
  }

  /**
   * Get orders filtered by status
   */
  getOrdersByStatus(status: OrderStatus | OrderStatus[]): Order[] {
    const statuses = Array.isArray(status) ? status : [status];
    return this.ordersSignal().filter(o => statuses.includes(o.status));
  }

  /**
   * Reset state
   */
  reset(): void {
    this.ordersSignal.set([]);
    this.selectedOrderSignal.set(null);
    this.errorSignal.set(null);
    this.metaSignal.set({ total: 0, limit: 50, offset: 0 });
  }
}
