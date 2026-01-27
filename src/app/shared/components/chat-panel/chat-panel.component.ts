import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, ChatMessage } from '../../../core/services/firebase.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-base-200 border-l border-neutral">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-neutral">
        <div class="flex items-center gap-3">
          @if (customerAvatar()) {
            <img
              [src]="customerAvatar()"
              [alt]="customerName()"
              class="w-10 h-10 rounded-full object-cover"
            />
          } @else {
            <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span class="text-primary font-semibold">
                {{ getInitials(customerName()) }}
              </span>
            </div>
          }
          <div>
            <div class="font-semibold">{{ customerName() }}</div>
            @if (orderNumber()) {
              <div class="text-xs text-secondary">Order #{{ orderNumber() }}</div>
            }
          </div>
        </div>
        <button
          (click)="onClose.emit()"
          class="btn btn-ghost btn-sm btn-square"
          title="Close chat"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Messages -->
      <div #messagesContainer class="flex-1 overflow-y-auto p-4 space-y-4">
        @if (firebaseService.isLoading()) {
          <div class="flex justify-center py-8">
            <span class="loading loading-spinner loading-md text-primary"></span>
          </div>
        } @else if (messages().length === 0) {
          <div class="text-center text-secondary py-8">
            <i class="pi pi-comments text-4xl mb-2 opacity-50"></i>
            <p>No messages yet</p>
            <p class="text-xs mt-1">Start the conversation</p>
          </div>
        } @else {
          @for (message of messages(); track message.id) {
            <div
              [class]="message.senderId === currentUserId() ? 'flex justify-end' : 'flex justify-start'"
            >
              <div
                [class]="message.senderId === currentUserId()
                  ? 'bg-primary text-primary-content rounded-lg rounded-br-sm px-4 py-2 max-w-[80%]'
                  : 'bg-base-300 rounded-lg rounded-bl-sm px-4 py-2 max-w-[80%]'"
              >
                @if (message.senderId !== currentUserId()) {
                  <div class="text-xs text-secondary mb-1">{{ message.senderName }}</div>
                }

                <!-- Regular text message -->
                @if (message.type === 'text') {
                  <div class="whitespace-pre-wrap break-words">{{ message.content }}</div>
                }

                <!-- System message -->
                @if (message.type === 'system') {
                  <div class="text-sm italic">{{ message.content }}</div>
                }

                <!-- Status update message -->
                @if (message.type === 'statusUpdate') {
                  <div class="flex items-center gap-2">
                    <i class="pi pi-refresh text-info"></i>
                    <span>{{ message.content }}</span>
                  </div>
                }

                <!-- Payment request message -->
                @if (message.type === 'paymentRequest' && message.paymentRequestData) {
                  <div class="bg-base-100/20 rounded p-2 mt-1">
                    <div class="font-semibold">Payment Request</div>
                    <div class="text-sm">
                      {{ formatPaymentMethod(message.paymentRequestData.method) }}
                    </div>
                    @if (message.paymentRequestData.accountNumber) {
                      <div class="text-sm font-mono">
                        {{ message.paymentRequestData.accountNumber }}
                      </div>
                    }
                    <div class="font-bold mt-1">
                      {{ formatAmount(message.paymentRequestData.amountCents, message.paymentRequestData.currency) }}
                    </div>
                  </div>
                }

                <!-- Payment proof message -->
                @if (message.type === 'paymentProof' && message.paymentProofData) {
                  <div class="mt-1">
                    <img
                      [src]="message.paymentProofData.imageUrl"
                      alt="Payment Proof"
                      class="rounded max-w-full cursor-pointer hover:opacity-80"
                      (click)="openImage(message.paymentProofData.imageUrl)"
                    />
                    <div class="text-xs mt-1">
                      @if (message.paymentProofData.status === 'pending') {
                        <span class="badge badge-sm badge-warning">Pending verification</span>
                      } @else if (message.paymentProofData.status === 'verified') {
                        <span class="badge badge-sm badge-success">Verified</span>
                      }
                    </div>
                  </div>
                }

                <!-- Order card message -->
                @if (message.type === 'orderCard' && message.orderData) {
                  <div class="bg-base-100/20 rounded p-2 mt-1">
                    <div class="flex items-center gap-2">
                      @if (message.orderData.productImageUrl) {
                        <img
                          [src]="message.orderData.productImageUrl"
                          alt="Product"
                          class="w-12 h-12 rounded object-cover"
                        />
                      }
                      <div>
                        <div class="font-semibold">Order #{{ message.orderData.orderNumber }}</div>
                        <div class="text-sm">{{ message.orderData.itemCount }} item(s)</div>
                        <div class="font-bold">
                          {{ formatAmount(message.orderData.totalCents, message.orderData.currency) }}
                        </div>
                      </div>
                    </div>
                  </div>
                }

                <!-- Image message -->
                @if (message.type === 'image' && message.imageUrls && message.imageUrls.length > 0) {
                  <div class="mt-1 space-y-1">
                    @for (imageUrl of message.imageUrls; track imageUrl) {
                      <img
                        [src]="imageUrl"
                        alt="Image"
                        class="rounded max-w-full cursor-pointer hover:opacity-80"
                        (click)="openImage(imageUrl)"
                      />
                    }
                  </div>
                }

                <div class="text-xs opacity-60 mt-1 text-right">
                  {{ firebaseService.formatTime(message.timestamp) }}
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Input -->
      <div class="p-4 border-t border-neutral">
        <form (submit)="sendMessage($event)" class="flex gap-2">
          <input
            type="text"
            [(ngModel)]="newMessage"
            name="message"
            placeholder="Type a message..."
            class="input input-bordered flex-1 bg-base-300"
            [disabled]="sending()"
          />
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!newMessage.trim() || sending()"
          >
            @if (sending()) {
              <span class="loading loading-spinner loading-sm"></span>
            } @else {
              <i class="pi pi-send"></i>
            }
          </button>
        </form>
      </div>
    </div>

    <!-- Image Modal -->
    @if (viewingImage()) {
      <div class="modal modal-open">
        <div class="modal-box bg-base-200 max-w-3xl">
          <img [src]="viewingImage()" alt="Full size" class="w-full rounded" />
          <div class="modal-action">
            <button (click)="viewingImage.set(null)" class="btn">Close</button>
          </div>
        </div>
        <div class="modal-backdrop bg-black/70" (click)="viewingImage.set(null)"></div>
      </div>
    }
  `,
  styles: []
})
export class ChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() chatId: string = '';
  @Input() customerName = signal<string>('Customer');
  @Input() customerAvatar = signal<string | null>(null);
  @Input() orderNumber = signal<string | null>(null);

  @Output() onClose = new EventEmitter<void>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  firebaseService: FirebaseService;
  private authService: AuthService;

  newMessage = '';
  sending = signal<boolean>(false);
  viewingImage = signal<string | null>(null);

  currentUserId = signal<string>('');
  messages = signal<ChatMessage[]>([]);

  private shouldScrollToBottom = true;
  private previousMessageCount = 0;

  constructor(
    firebaseService: FirebaseService,
    authService: AuthService
  ) {
    this.firebaseService = firebaseService;
    this.authService = authService;

    // Update current user ID when auth changes
    effect(() => {
      const business = this.authService.business();
      if (business) {
        this.currentUserId.set(business.id);
      }
    });

    // Update messages when they change in the service
    effect(() => {
      const allMessages = this.firebaseService.messages();
      if (this.chatId && allMessages.has(this.chatId)) {
        const chatMessages = allMessages.get(this.chatId) || [];
        this.messages.set(chatMessages);

        // Check if new messages arrived
        if (chatMessages.length > this.previousMessageCount) {
          this.shouldScrollToBottom = true;
        }
        this.previousMessageCount = chatMessages.length;
      }
    });
  }

  ngOnInit(): void {
    if (this.chatId) {
      this.firebaseService.subscribeToChat(this.chatId);
    }
  }

  ngOnDestroy(): void {
    if (this.chatId) {
      this.firebaseService.unsubscribeFromChat(this.chatId);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatAmount(cents: number, currency: string): string {
    const amount = cents / 100;
    if (currency === 'PHP') {
      return `₱${amount.toFixed(2)}`;
    }
    return `${currency} ${amount.toFixed(2)}`;
  }

  formatPaymentMethod(method: string): string {
    switch (method) {
      case 'gcash':
        return 'GCash';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'cod':
        return 'Cash on Delivery';
      default:
        return method;
    }
  }

  openImage(url: string): void {
    this.viewingImage.set(url);
  }

  async sendMessage(event: Event): Promise<void> {
    event.preventDefault();

    const content = this.newMessage.trim();
    if (!content || !this.chatId) return;

    this.sending.set(true);
    this.newMessage = '';

    try {
      await this.firebaseService.sendMessage(this.chatId, content);
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message if send failed
      this.newMessage = content;
    } finally {
      this.sending.set(false);
    }
  }
}
