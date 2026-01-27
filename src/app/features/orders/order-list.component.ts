import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_OPTIONS,
  formatPrice,
  getStatusConfig,
  getPaymentMethodLabel,
  getShippingMethodLabel,
} from '../../core/models/order.model';
import { ChatPanelComponent } from '../../shared/components/chat-panel/chat-panel.component';
import { FirebaseService } from '../../core/services/firebase.service';

type TabFilter = 'active' | 'completed' | 'cancelled' | 'all';

interface Tab {
  id: TabFilter;
  label: string;
  statuses: OrderStatus[];
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatPanelComponent],
  template: `
    <div class="flex h-[calc(100vh-64px)]">
      <!-- Orders List Section -->
      <div [class]="chatOrder() ? 'w-3/5 overflow-y-auto' : 'w-full overflow-y-auto'">
        <div class="p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">Orders</h1>
          <p class="text-secondary text-sm mt-1">
            Manage customer orders and payments
          </p>
        </div>
        <div class="flex gap-2">
          @if (orderService.paymentUploadedCount() > 0) {
            <div class="badge badge-warning badge-lg gap-1">
              <i class="pi pi-clock"></i>
              {{ orderService.paymentUploadedCount() }} awaiting verification
            </div>
          }
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body p-4">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-secondary text-sm">Pending Payment</p>
                <p class="text-2xl font-bold text-warning">{{ orderService.pendingCount() }}</p>
              </div>
              <div class="p-2 rounded-lg bg-warning/10">
                <i class="pi pi-clock text-warning text-xl"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body p-4">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-secondary text-sm">Needs Verification</p>
                <p class="text-2xl font-bold text-info">{{ orderService.paymentUploadedCount() }}</p>
              </div>
              <div class="p-2 rounded-lg bg-info/10">
                <i class="pi pi-eye text-info text-xl"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body p-4">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-secondary text-sm">Processing</p>
                <p class="text-2xl font-bold text-purple-400">{{ orderService.processingCount() }}</p>
              </div>
              <div class="p-2 rounded-lg bg-purple-400/10">
                <i class="pi pi-box text-purple-400 text-xl"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body p-4">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-secondary text-sm">Shipped</p>
                <p class="text-2xl font-bold text-success">{{ orderService.shippedCount() }}</p>
              </div>
              <div class="p-2 rounded-lg bg-success/10">
                <i class="pi pi-truck text-success text-xl"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-boxed bg-base-200 mb-6 p-1">
        @for (tab of tabs; track tab.id) {
          <button
            (click)="selectTab(tab.id)"
            [class]="selectedTab() === tab.id ? 'tab tab-active' : 'tab'"
          >
            {{ tab.label }}
            @if (getTabCount(tab.id) > 0) {
              <span class="badge badge-sm ml-2">{{ getTabCount(tab.id) }}</span>
            }
          </button>
        }
      </div>

      <!-- Error Alert -->
      @if (orderService.error()) {
        <div class="alert alert-error mb-4">
          <i class="pi pi-exclamation-circle"></i>
          <span>{{ orderService.error() }}</span>
          <button class="btn btn-ghost btn-sm" (click)="orderService.clearError()">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <!-- Loading State -->
      @if (orderService.isLoading()) {
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }

      <!-- Empty State -->
      @else if (filteredOrders().length === 0) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center py-12">
            <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-shopping-cart text-primary text-3xl"></i>
            </div>
            <h2 class="text-xl font-bold mb-2">No Orders Yet</h2>
            <p class="text-secondary mb-6">
              When customers place orders through Wheelbase, they'll appear here.
            </p>
          </div>
        </div>
      }

      <!-- Orders Table -->
      @else {
        <div class="card bg-base-200 border border-neutral overflow-hidden">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr class="bg-base-300">
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th class="text-right">Total</th>
                  <th>Date</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (order of filteredOrders(); track order.id) {
                  <tr
                    class="hover:bg-base-100 cursor-pointer"
                    (click)="selectOrder(order)"
                  >
                    <!-- Order Number -->
                    <td>
                      <div class="font-mono font-semibold">#{{ order.orderNumber }}</div>
                      @if (order.items && order.items.length > 0) {
                        <div class="text-sm text-secondary">
                          {{ order.items.length }} item{{ order.items.length > 1 ? 's' : '' }}
                        </div>
                      }
                    </td>

                    <!-- Customer -->
                    <td>
                      <div class="flex items-center gap-3">
                        @if (order.customerAvatarUrl) {
                          <img
                            [src]="order.customerAvatarUrl"
                            [alt]="order.customerName"
                            class="w-10 h-10 rounded-full object-cover"
                          />
                        } @else {
                          <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span class="text-primary font-semibold">
                              {{ getInitials(order.customerName || 'C') }}
                            </span>
                          </div>
                        }
                        <div>
                          <div class="font-medium">{{ order.customerName || 'Customer' }}</div>
                          @if (order.customerPhone) {
                            <div class="text-sm text-secondary">{{ order.customerPhone }}</div>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- Status -->
                    <td>
                      <span
                        class="badge gap-1"
                        [style.background-color]="getStatusConfig(order.status).bgColor"
                        [style.color]="getStatusConfig(order.status).color"
                        [style.border-color]="getStatusConfig(order.status).color"
                      >
                        {{ getStatusConfig(order.status).label }}
                      </span>
                    </td>

                    <!-- Payment -->
                    <td>
                      <div class="flex flex-col gap-1">
                        <span class="text-sm">{{ getPaymentMethodLabel(order.paymentMethod!) }}</span>
                        @if (order.status === 'payment_uploaded' && order.paymentProofUrl) {
                          <button
                            (click)="viewPaymentProof(order, $event)"
                            class="btn btn-xs btn-outline btn-info"
                          >
                            <i class="pi pi-eye mr-1"></i>
                            View Proof
                          </button>
                        }
                      </div>
                    </td>

                    <!-- Total -->
                    <td class="text-right">
                      <span class="font-mono font-semibold text-primary">
                        {{ formatPrice(order.totalCents, order.currency) }}
                      </span>
                    </td>

                    <!-- Date -->
                    <td>
                      <div class="text-sm">{{ formatDate(order.createdAt) }}</div>
                      <div class="text-xs text-secondary">{{ formatTime(order.createdAt) }}</div>
                    </td>

                    <!-- Actions -->
                    <td class="text-right">
                      <div class="flex justify-end gap-1" (click)="$event.stopPropagation()">
                        @if (order.status === 'payment_uploaded') {
                          <button
                            (click)="verifyPayment(order)"
                            class="btn btn-sm btn-success"
                            [disabled]="orderService.isSaving()"
                            title="Verify Payment"
                          >
                            @if (verifyingId() === order.id) {
                              <span class="loading loading-spinner loading-xs"></span>
                            } @else {
                              <i class="pi pi-check"></i>
                            }
                            Verify
                          </button>
                        }
                        @if (order.status === 'payment_verified') {
                          <button
                            (click)="markProcessing(order)"
                            class="btn btn-sm btn-primary"
                            [disabled]="orderService.isSaving()"
                            title="Start Processing"
                          >
                            @if (processingId() === order.id) {
                              <span class="loading loading-spinner loading-xs"></span>
                            } @else {
                              <i class="pi pi-box"></i>
                            }
                            Process
                          </button>
                        }
                        @if (order.status === 'processing') {
                          <button
                            (click)="openShipModal(order)"
                            class="btn btn-sm btn-info"
                            title="Mark as Shipped"
                          >
                            <i class="pi pi-truck"></i>
                            Ship
                          </button>
                        }
                        @if (order.status === 'shipped') {
                          <button
                            (click)="markDelivered(order)"
                            class="btn btn-sm btn-success"
                            [disabled]="orderService.isSaving()"
                            title="Mark as Delivered"
                          >
                            @if (deliveringId() === order.id) {
                              <span class="loading loading-spinner loading-xs"></span>
                            } @else {
                              <i class="pi pi-check-circle"></i>
                            }
                            Delivered
                          </button>
                        }
                        <button
                          (click)="openChat(order)"
                          class="btn btn-ghost btn-sm btn-square"
                          title="Open Chat"
                        >
                          <i class="pi pi-comments"></i>
                        </button>
                        @if (canCancelOrder(order)) {
                          <button
                            (click)="openCancelModal(order)"
                            class="btn btn-ghost btn-sm btn-square text-error"
                            title="Cancel Order"
                          >
                            <i class="pi pi-times"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Table Footer -->
          <div class="p-4 border-t border-neutral flex justify-between items-center">
            <span class="text-sm text-secondary">
              Showing {{ filteredOrders().length }} of {{ orderService.total() }} orders
            </span>
          </div>
        </div>
      }

      <!-- Order Detail Modal -->
      @if (selectedOrderForDetail()) {
        <div class="modal modal-open">
          <div class="modal-box bg-base-200 border border-neutral max-w-2xl">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="font-bold text-lg">Order #{{ selectedOrderForDetail()?.orderNumber }}</h3>
                <p class="text-sm text-secondary">
                  {{ formatDate(selectedOrderForDetail()!.createdAt) }} at {{ formatTime(selectedOrderForDetail()!.createdAt) }}
                </p>
              </div>
              <span
                class="badge"
                [style.background-color]="getStatusConfig(selectedOrderForDetail()!.status).bgColor"
                [style.color]="getStatusConfig(selectedOrderForDetail()!.status).color"
              >
                {{ getStatusConfig(selectedOrderForDetail()!.status).label }}
              </span>
            </div>

            <!-- Customer Info -->
            <div class="bg-base-300 rounded-lg p-4 mb-4">
              <h4 class="font-semibold mb-2">Customer</h4>
              <div class="flex items-center gap-3">
                @if (selectedOrderForDetail()!.customerAvatarUrl) {
                  <img
                    [src]="selectedOrderForDetail()!.customerAvatarUrl"
                    class="w-12 h-12 rounded-full object-cover"
                  />
                } @else {
                  <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span class="text-primary font-semibold text-lg">
                      {{ getInitials(selectedOrderForDetail()!.customerName || 'C') }}
                    </span>
                  </div>
                }
                <div>
                  <div class="font-medium">{{ selectedOrderForDetail()!.customerName }}</div>
                  @if (selectedOrderForDetail()!.customerEmail) {
                    <div class="text-sm text-secondary">{{ selectedOrderForDetail()!.customerEmail }}</div>
                  }
                  @if (selectedOrderForDetail()!.customerPhone) {
                    <div class="text-sm text-secondary">{{ selectedOrderForDetail()!.customerPhone }}</div>
                  }
                </div>
              </div>
            </div>

            <!-- Order Items -->
            <div class="bg-base-300 rounded-lg p-4 mb-4">
              <h4 class="font-semibold mb-2">Items</h4>
              @if (loadingDetail()) {
                <div class="flex justify-center py-4">
                  <span class="loading loading-spinner loading-md text-primary"></span>
                </div>
              } @else if (selectedOrderForDetail()!.items && selectedOrderForDetail()!.items!.length > 0) {
                <div class="space-y-3">
                  @for (item of selectedOrderForDetail()!.items; track item.id) {
                    <div class="flex items-center gap-3">
                      @if (item.productImageUrl) {
                        <img
                          [src]="item.productImageUrl"
                          [alt]="item.productTitle"
                          class="w-12 h-12 rounded-lg object-cover"
                        />
                      } @else {
                        <div class="w-12 h-12 rounded-lg bg-base-200 flex items-center justify-center">
                          <i class="pi pi-box text-secondary"></i>
                        </div>
                      }
                      <div class="flex-1">
                        <div class="font-medium">{{ item.productTitle }}</div>
                        <div class="text-sm text-secondary">
                          {{ formatPrice(item.unitPriceCents, selectedOrderForDetail()!.currency) }} x {{ item.quantity }}
                        </div>
                      </div>
                      <div class="font-mono">
                        {{ formatPrice(item.lineTotalCents, selectedOrderForDetail()!.currency) }}
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-secondary text-sm">No items found</p>
              }
            </div>

            <!-- Order Summary -->
            <div class="bg-base-300 rounded-lg p-4 mb-4">
              <h4 class="font-semibold mb-2">Summary</h4>
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-secondary">Subtotal</span>
                  <span>{{ formatPrice(selectedOrderForDetail()!.subtotalCents, selectedOrderForDetail()!.currency) }}</span>
                </div>
                @if (selectedOrderForDetail()!.shippingCents > 0) {
                  <div class="flex justify-between text-sm">
                    <span class="text-secondary">Shipping</span>
                    <span>{{ formatPrice(selectedOrderForDetail()!.shippingCents, selectedOrderForDetail()!.currency) }}</span>
                  </div>
                }
                <div class="divider my-2"></div>
                <div class="flex justify-between font-semibold">
                  <span>Total</span>
                  <span class="text-primary">{{ formatPrice(selectedOrderForDetail()!.totalCents, selectedOrderForDetail()!.currency) }}</span>
                </div>
              </div>
            </div>

            <!-- Shipping & Payment -->
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="bg-base-300 rounded-lg p-4">
                <h4 class="font-semibold mb-2">Shipping</h4>
                <p>{{ getShippingMethodLabel(selectedOrderForDetail()!.shippingMethod!) }}</p>
                @if (selectedOrderForDetail()!.trackingNumber) {
                  <p class="text-sm text-secondary mt-1">
                    Tracking: {{ selectedOrderForDetail()!.trackingNumber }}
                  </p>
                }
              </div>
              <div class="bg-base-300 rounded-lg p-4">
                <h4 class="font-semibold mb-2">Payment</h4>
                <p>{{ getPaymentMethodLabel(selectedOrderForDetail()!.paymentMethod!) }}</p>
                @if (selectedOrderForDetail()!.paymentProofUrl) {
                  <button
                    (click)="viewPaymentProof(selectedOrderForDetail()!)"
                    class="btn btn-xs btn-outline btn-info mt-2"
                  >
                    <i class="pi pi-eye mr-1"></i>
                    View Proof
                  </button>
                }
              </div>
            </div>

            <!-- Notes -->
            @if (selectedOrderForDetail()!.customerNotes) {
              <div class="bg-base-300 rounded-lg p-4 mb-4">
                <h4 class="font-semibold mb-2">Customer Notes</h4>
                <p class="text-secondary">{{ selectedOrderForDetail()!.customerNotes }}</p>
              </div>
            }

            <div class="modal-action">
              <button (click)="closeDetailModal()" class="btn btn-ghost">
                Close
              </button>
              <button (click)="openChat(selectedOrderForDetail()!)" class="btn btn-primary">
                <i class="pi pi-comments mr-2"></i>
                Open Chat
              </button>
            </div>
          </div>
          <div class="modal-backdrop bg-black/50" (click)="closeDetailModal()"></div>
        </div>
      }

      <!-- Ship Order Modal -->
      @if (shippingOrder()) {
        <div class="modal modal-open">
          <div class="modal-box bg-base-200 border border-neutral">
            <h3 class="font-bold text-lg mb-4">Ship Order #{{ shippingOrder()?.orderNumber }}</h3>
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Tracking Number (Optional)</span>
              </label>
              <input
                type="text"
                [(ngModel)]="trackingNumber"
                class="input input-bordered bg-base-300"
                placeholder="Enter tracking number"
              />
            </div>
            <div class="modal-action">
              <button
                (click)="cancelShip()"
                class="btn btn-ghost"
                [disabled]="orderService.isSaving()"
              >
                Cancel
              </button>
              <button
                (click)="confirmShip()"
                class="btn btn-info"
                [disabled]="orderService.isSaving()"
              >
                @if (orderService.isSaving()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                <i class="pi pi-truck mr-2"></i>
                Mark as Shipped
              </button>
            </div>
          </div>
          <div class="modal-backdrop bg-black/50" (click)="cancelShip()"></div>
        </div>
      }

      <!-- Payment Proof Modal -->
      @if (viewingProofUrl()) {
        <div class="modal modal-open">
          <div class="modal-box bg-base-200 border border-neutral max-w-lg">
            <h3 class="font-bold text-lg mb-4">Payment Proof</h3>
            <img
              [src]="viewingProofUrl()"
              alt="Payment Proof"
              class="w-full rounded-lg"
            />
            <div class="modal-action">
              <button (click)="closeProofModal()" class="btn btn-ghost">
                Close
              </button>
            </div>
          </div>
          <div class="modal-backdrop bg-black/50" (click)="closeProofModal()"></div>
        </div>
      }

      <!-- Cancel Order Bottom Sheet -->
      @if (cancellingOrder()) {
        <div class="modal modal-open modal-bottom sm:modal-middle">
          <div class="modal-box bg-base-200 border border-neutral sm:rounded-t-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl">
            <!-- Handle bar for mobile -->
            <div class="flex justify-center mb-4 sm:hidden">
              <div class="w-12 h-1.5 bg-base-300 rounded-full"></div>
            </div>

            <div class="flex items-center gap-3 mb-4">
              <div class="p-3 rounded-full bg-error/10">
                <i class="pi pi-exclamation-triangle text-error text-xl"></i>
              </div>
              <div>
                <h3 class="font-bold text-lg">Cancel Order</h3>
                <p class="text-sm text-secondary">Order #{{ cancellingOrder()?.orderNumber }}</p>
              </div>
            </div>

            <p class="text-secondary mb-4">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>

            <div class="form-control mb-6">
              <label class="label">
                <span class="label-text">Cancellation Reason (Optional)</span>
              </label>
              <textarea
                [(ngModel)]="cancelReason"
                class="textarea textarea-bordered bg-base-300 h-24"
                placeholder="Enter reason for cancellation..."
              ></textarea>
            </div>

            <div class="flex flex-col gap-2">
              <button
                (click)="confirmCancel()"
                class="btn btn-error w-full"
                [disabled]="orderService.isSaving()"
              >
                @if (orderService.isSaving()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                <i class="pi pi-times-circle mr-2"></i>
                Cancel Order
              </button>
              <button
                (click)="closeCancelModal()"
                class="btn btn-ghost w-full"
                [disabled]="orderService.isSaving()"
              >
                Keep Order
              </button>
            </div>
          </div>
          <div class="modal-backdrop bg-black/50" (click)="closeCancelModal()"></div>
        </div>
      }
        </div>
      </div>

      <!-- Chat Panel Section -->
      @if (chatOrder()) {
        <div class="w-2/5 h-full">
          <app-chat-panel
            [chatId]="chatOrder()!.chatId!"
            [customerName]="chatCustomerName"
            [customerAvatar]="chatCustomerAvatar"
            [orderNumber]="chatOrderNumber"
            (onClose)="closeChat()"
          ></app-chat-panel>
        </div>
      }
    </div>
  `,
  styles: []
})
export class OrderListComponent implements OnInit, OnDestroy {
  orderService = inject(OrderService);
  firebaseService = inject(FirebaseService);

  // Chat panel state
  chatOrder = signal<Order | null>(null);
  chatCustomerName = signal<string>('Customer');
  chatCustomerAvatar = signal<string | null>(null);
  chatOrderNumber = signal<string | null>(null);

  // Tab configuration
  tabs: Tab[] = [
    {
      id: 'active',
      label: 'Active',
      statuses: ['pending_payment', 'payment_uploaded', 'payment_verified', 'processing', 'shipped', 'delivered']
    },
    { id: 'completed', label: 'Completed', statuses: ['completed'] },
    { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled', 'refunded'] },
    { id: 'all', label: 'All', statuses: [] },
  ];

  selectedTab = signal<TabFilter>('active');

  // Loading states
  verifyingId = signal<string | null>(null);
  processingId = signal<string | null>(null);
  deliveringId = signal<string | null>(null);
  loadingDetail = signal<boolean>(false);

  // Modal states
  selectedOrderForDetail = signal<Order | null>(null);
  shippingOrder = signal<Order | null>(null);
  trackingNumber = '';
  viewingProofUrl = signal<string | null>(null);
  cancellingOrder = signal<Order | null>(null);
  cancelReason = '';

  // Helper functions
  formatPrice = formatPrice;
  getStatusConfig = getStatusConfig;
  getPaymentMethodLabel = getPaymentMethodLabel;
  getShippingMethodLabel = getShippingMethodLabel;

  async ngOnInit(): Promise<void> {
    await this.loadOrders();
  }

  ngOnDestroy(): void {
    this.orderService.reset();
  }

  async loadOrders(): Promise<void> {
    await this.orderService.loadOrders({ limit: 100 });
  }

  selectTab(tab: TabFilter): void {
    this.selectedTab.set(tab);
  }

  getTabCount(tabId: TabFilter): number {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab || tab.statuses.length === 0) {
      return this.orderService.orders().length;
    }
    return this.orderService.orders().filter(o => tab.statuses.includes(o.status)).length;
  }

  filteredOrders(): Order[] {
    const tab = this.tabs.find(t => t.id === this.selectedTab());
    if (!tab || tab.statuses.length === 0) {
      return this.orderService.orders();
    }
    return this.orderService.orders().filter(o => tab.statuses.includes(o.status));
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  async selectOrder(order: Order): Promise<void> {
    // Show modal immediately with basic info
    this.selectedOrderForDetail.set(order);
    this.loadingDetail.set(true);

    // Fetch full order with items
    const fullOrder = await this.orderService.getOrder(order.id);
    if (fullOrder) {
      this.selectedOrderForDetail.set(fullOrder);
    }
    // If fetch fails, we already have the basic order displayed

    this.loadingDetail.set(false);
  }

  closeDetailModal(): void {
    this.selectedOrderForDetail.set(null);
  }

  async verifyPayment(order: Order): Promise<void> {
    this.verifyingId.set(order.id);
    await this.orderService.verifyPayment(order.id);
    this.verifyingId.set(null);
  }

  async markProcessing(order: Order): Promise<void> {
    this.processingId.set(order.id);
    await this.orderService.updateOrderStatus({
      orderId: order.id,
      status: 'processing'
    });
    this.processingId.set(null);
  }

  async markDelivered(order: Order): Promise<void> {
    this.deliveringId.set(order.id);
    await this.orderService.updateOrderStatus({
      orderId: order.id,
      status: 'delivered'
    });
    this.deliveringId.set(null);
  }

  openShipModal(order: Order): void {
    this.shippingOrder.set(order);
    this.trackingNumber = '';
  }

  cancelShip(): void {
    this.shippingOrder.set(null);
    this.trackingNumber = '';
  }

  async confirmShip(): Promise<void> {
    const order = this.shippingOrder();
    if (!order) return;

    await this.orderService.updateOrderStatus({
      orderId: order.id,
      status: 'shipped',
      trackingNumber: this.trackingNumber || undefined,
    });

    this.shippingOrder.set(null);
    this.trackingNumber = '';
  }

  viewPaymentProof(order: Order, event?: Event): void {
    event?.stopPropagation();
    if (order.paymentProofUrl) {
      this.viewingProofUrl.set(order.paymentProofUrl);
    }
  }

  closeProofModal(): void {
    this.viewingProofUrl.set(null);
  }

  openChat(order: Order): void {
    if (!order.chatId) {
      alert('No chat available for this order.');
      return;
    }

    // Set chat panel state
    this.chatOrder.set(order);
    this.chatCustomerName.set(order.customerName || 'Customer');
    this.chatCustomerAvatar.set(order.customerAvatarUrl || null);
    this.chatOrderNumber.set(order.orderNumber);

    // Close the detail modal if open
    this.selectedOrderForDetail.set(null);
  }

  closeChat(): void {
    this.chatOrder.set(null);
    this.chatCustomerName.set('Customer');
    this.chatCustomerAvatar.set(null);
    this.chatOrderNumber.set(null);
  }

  canCancelOrder(order: Order): boolean {
    // Can only cancel orders that are not yet shipped, delivered, completed, or already cancelled
    const nonCancellableStatuses: OrderStatus[] = ['shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
    return !nonCancellableStatuses.includes(order.status);
  }

  openCancelModal(order: Order): void {
    this.cancellingOrder.set(order);
    this.cancelReason = '';
  }

  closeCancelModal(): void {
    this.cancellingOrder.set(null);
    this.cancelReason = '';
  }

  async confirmCancel(): Promise<void> {
    const order = this.cancellingOrder();
    if (!order) return;

    const result = await this.orderService.cancelOrder(order.id, this.cancelReason || undefined);
    if (result) {
      this.closeCancelModal();
    }
  }
}
