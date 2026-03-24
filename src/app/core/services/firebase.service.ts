import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  Database,
  ref,
  push,
  set,
  onValue,
  serverTimestamp,
  off,
  update,
  Unsubscribe,
} from 'firebase/database';
import {
  getAuth,
  Auth,
  signInWithCustomToken,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';

// Firebase config - using the same project as mobile app
const firebaseConfig = {
  apiKey: 'AIzaSyA6kqOTeWozgLAFEftBMZwp6UBbUpB7Fdg',
  authDomain: 'wheelbase-d688c.firebaseapp.com',
  databaseURL: 'https://wheelbase-d688c-default-rtdb.firebaseio.com',
  projectId: 'wheelbase-d688c',
  storageBucket: 'wheelbase-d688c.firebasestorage.app',
  messagingSenderId: '249886728996',
  appId: '1:249886728996:web:6f7ac9b03e830108cfc9b1',
};

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: string;
  timestamp: number;
  read: boolean;
  imageUrls?: string[];
  orderData?: OrderMessageData;
  paymentRequestData?: PaymentRequestData;
  paymentProofData?: PaymentProofData;
  statusUpdateData?: StatusUpdateData;
}

export interface OrderMessageData {
  orderId: string;
  orderNumber: string;
  totalCents: number;
  currency: string;
  itemCount: number;
  productImageUrl?: string;
  status: string;
}

export interface PaymentRequestData {
  method: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  amountCents: number;
  currency: string;
}

export interface PaymentProofData {
  imageUrl: string;
  status: string;
  verifiedBy?: string;
  verifiedAt?: number;
}

export interface StatusUpdateData {
  oldStatus: string;
  newStatus: string;
  trackingNumber?: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService implements OnDestroy {
  private app: FirebaseApp;
  private db: Database;
  private auth: Auth;
  private messageListeners: Map<string, Unsubscribe> = new Map();
  private authInitPromise: Promise<void> | null = null;

  // Signals for reactive state
  private messagesSignal = signal<Map<string, ChatMessage[]>>(new Map());
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private firebaseAuthenticatedSignal = signal<boolean>(false);
  private unreadChatIdsSignal = signal<Set<string>>(new Set());
  private metadataListeners: Map<string, Unsubscribe> = new Map();

  readonly messages = computed(() => this.messagesSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly isFirebaseAuthenticated = computed(() => this.firebaseAuthenticatedSignal());
  readonly unreadChatIds = computed(() => this.unreadChatIdsSignal());

  getApp(): FirebaseApp | null {
    return this.app ?? null;
  }

  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {
    // Initialize Firebase
    this.app = initializeApp(firebaseConfig, 'wheelbase-business');
    this.db = getDatabase(this.app);
    this.auth = getAuth(this.app);

    // Listen to Firebase auth state changes
    onAuthStateChanged(this.auth, (user: FirebaseUser | null) => {
      this.firebaseAuthenticatedSignal.set(!!user);
      if (user) {
        console.log('✅ [FirebaseService] Firebase authenticated:', user.uid);
      } else {
        console.log('⚠️ [FirebaseService] Firebase not authenticated');
      }
    });

    console.log('✅ [FirebaseService] Initialized');
  }

  /**
   * Authenticate with Firebase using custom token from Supabase Edge Function
   */
  async authenticateWithFirebase(): Promise<void> {
    // If already authenticated, return
    if (this.auth.currentUser) {
      console.log('[FirebaseService] Already authenticated with Firebase');
      return;
    }

    // If already authenticating, wait for it
    if (this.authInitPromise) {
      return this.authInitPromise;
    }

    this.authInitPromise = this.doFirebaseAuth();
    try {
      await this.authInitPromise;
    } finally {
      this.authInitPromise = null;
    }
  }

  private async doFirebaseAuth(): Promise<void> {
    try {
      console.log('[FirebaseService] Getting Firebase custom token...');

      // Get Supabase access token
      const accessToken = await this.supabaseService.getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated with Supabase');
      }

      // Call Edge Function to get Firebase custom token
      const response = await fetch(
        `${environment.supabaseUrl}/functions/v1/create-firebase-token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to get Firebase token: ${response.status}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error('No Firebase token received');
      }

      console.log('[FirebaseService] Got Firebase custom token, signing in...');

      // Sign in to Firebase with custom token
      await signInWithCustomToken(this.auth, data.token);

      console.log('✅ [FirebaseService] Firebase authentication successful');
    } catch (error) {
      console.error('❌ [FirebaseService] Firebase authentication failed:', error);
      throw error;
    }
  }

  ngOnDestroy(): void {
    // Clean up all listeners
    this.messageListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.messageListeners.clear();
    this.metadataListeners.forEach((unsub) => unsub());
    this.metadataListeners.clear();
  }

  /**
   * Clear the error state (for retry UI)
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Get messages for a chat (as computed signal)
   */
  getMessages(chatId: string): ChatMessage[] {
    return this.messagesSignal().get(chatId) || [];
  }

  /**
   * Subscribe to messages for a chat
   */
  async subscribeToChat(chatId: string): Promise<void> {
    if (this.messageListeners.has(chatId)) {
      console.log(`[FirebaseService] Already subscribed to chat: ${chatId}`);
      return;
    }

    // Ensure Firebase is authenticated before subscribing
    try {
      await this.authenticateWithFirebase();
    } catch (error) {
      console.error(`[FirebaseService] Failed to authenticate for chat: ${chatId}`, error);
      this.errorSignal.set('Firebase authentication failed. Please try again.');
      return;
    }

    console.log(`[FirebaseService] Subscribing to chat: ${chatId}`);
    this.loadingSignal.set(true);

    const messagesRef = ref(this.db, `chats/${chatId}/messages`);

    const unsubscribe = onValue(
      messagesRef,
      (snapshot) => {
        const messages: ChatMessage[] = [];

        if (snapshot.exists()) {
          const data = snapshot.val();
          Object.keys(data).forEach((key) => {
            const msg = data[key];
            messages.push({
              id: msg.id || key,
              senderId: msg.senderId || '',
              senderName: msg.senderName || 'Unknown',
              senderAvatar: msg.senderAvatar,
              content: msg.content || '',
              type: msg.type || 'text',
              timestamp: msg.timestamp || 0,
              read: msg.read || false,
              imageUrls: msg.imageUrls,
              orderData: msg.orderData,
              paymentRequestData: msg.paymentRequestData,
              paymentProofData: msg.paymentProofData,
              statusUpdateData: msg.statusUpdateData,
            });
          });

          // Sort by timestamp
          messages.sort((a, b) => a.timestamp - b.timestamp);
        }

        // Update signal
        this.messagesSignal.update((map) => {
          const newMap = new Map(map);
          newMap.set(chatId, messages);
          return newMap;
        });

        this.loadingSignal.set(false);
        console.log(`[FirebaseService] Loaded ${messages.length} messages for ${chatId}`);
      },
      (error) => {
        console.error(`[FirebaseService] Error loading messages: ${error}`);
        this.errorSignal.set(error.message);
        this.loadingSignal.set(false);
      }
    );

    this.messageListeners.set(chatId, unsubscribe);
  }

  /**
   * Unsubscribe from a chat
   */
  unsubscribeFromChat(chatId: string): void {
    const unsubscribe = this.messageListeners.get(chatId);
    if (unsubscribe) {
      unsubscribe();
      this.messageListeners.delete(chatId);
      console.log(`[FirebaseService] Unsubscribed from chat: ${chatId}`);
    }
  }

  /**
   * Send a message to a chat
   * Supports both legacy business accounts and claimed providers
   */
  async sendMessage(
    chatId: string,
    content: string,
    type: string = 'text'
  ): Promise<void> {
    try {
      // Use unifiedBusiness to support both legacy business accounts and claimed providers
      const unified = this.authService.unifiedBusiness();
      if (!unified) {
        throw new Error('Not authenticated');
      }

      // Get logo URL from business account (claimed providers don't store logo in ExistingClaimInfo)
      const logoUrl = this.authService.business()?.logoUrl || null;

      // Ensure Firebase is authenticated before sending
      await this.authenticateWithFirebase();

      const messagesRef = ref(this.db, `chats/${chatId}/messages`);
      const newMessageRef = push(messagesRef);

      const messageData = {
        id: newMessageRef.key,
        senderId: unified.id,
        senderName: unified.businessName,
        senderAvatar: logoUrl,
        content,
        type,
        timestamp: serverTimestamp(),
        read: false,
      };

      await set(newMessageRef, messageData);

      // Update chat metadata with senderId for unread tracking
      await this.updateChatMetadata(chatId, content, unified.id);

      console.log(`[FirebaseService] Sent message to ${chatId} as ${unified.type}`);
    } catch (error) {
      console.error(`[FirebaseService] Error sending message: ${error}`);
      throw error;
    }
  }

  /**
   * Send a status update message
   * Supports both legacy business accounts and claimed providers
   */
  async sendStatusUpdateMessage(
    chatId: string,
    oldStatus: string,
    newStatus: string,
    trackingNumber?: string,
    reason?: string
  ): Promise<void> {
    try {
      // Use unifiedBusiness to support both legacy business accounts and claimed providers
      const unified = this.authService.unifiedBusiness();
      if (!unified) {
        throw new Error('Not authenticated');
      }

      // Get logo URL from business account (claimed providers don't store logo in ExistingClaimInfo)
      const logoUrl = this.authService.business()?.logoUrl || null;

      // Ensure Firebase is authenticated before sending
      await this.authenticateWithFirebase();

      const messagesRef = ref(this.db, `chats/${chatId}/messages`);
      const newMessageRef = push(messagesRef);

      // Generate content based on status
      let content: string;
      switch (newStatus) {
        case 'payment_verified':
          content = 'Payment verified';
          break;
        case 'processing':
          content = 'Order is being prepared';
          break;
        case 'shipped':
          content = trackingNumber
            ? `Order shipped - Tracking: ${trackingNumber}`
            : 'Order shipped';
          break;
        case 'delivered':
          content = 'Order delivered';
          break;
        case 'completed':
          content = 'Order completed';
          break;
        case 'cancelled':
          content = reason ? `Order cancelled: ${reason}` : 'Order cancelled';
          break;
        case 'refunded':
          content = 'Order refunded';
          break;
        default:
          content = `Order status updated to ${newStatus}`;
      }

      const messageData = {
        id: newMessageRef.key,
        senderId: unified.id,
        senderName: unified.businessName,
        senderAvatar: logoUrl,
        content,
        type: 'statusUpdate',
        timestamp: serverTimestamp(),
        read: false,
        statusUpdateData: {
          oldStatus,
          newStatus,
          trackingNumber: trackingNumber || null,
          reason: reason || null,
        },
      };

      await set(newMessageRef, messageData);
      await this.updateChatMetadata(chatId, content, unified.id);

      console.log(`[FirebaseService] Sent status update to ${chatId} as ${unified.type}`);
    } catch (error) {
      console.error(`[FirebaseService] Error sending status update: ${error}`);
      throw error;
    }
  }

  /**
   * Update chat metadata
   */
  private async updateChatMetadata(chatId: string, lastMessage: string, senderId?: string): Promise<void> {
    const metadataRef = ref(this.db, `chats/${chatId}/metadata`);
    const updates: Record<string, unknown> = {
      lastMessage,
      lastMessageTimestamp: serverTimestamp(),
    };
    if (senderId) {
      updates['lastSenderId'] = senderId;
    }
    await update(metadataRef, updates);
  }

  /**
   * Mark a chat as read by the business.
   * Sets businessLastReadAt in metadata so we can detect unread messages.
   */
  async markChatAsRead(chatId: string): Promise<void> {
    try {
      await this.authenticateWithFirebase();
      const metadataRef = ref(this.db, `chats/${chatId}/metadata`);
      await update(metadataRef, {
        businessLastReadAt: serverTimestamp(),
      });
      // Remove from unread set immediately for responsive UI
      this.unreadChatIdsSignal.update((set) => {
        const next = new Set(set);
        next.delete(chatId);
        return next;
      });
    } catch (error) {
      console.error(`[FirebaseService] Error marking chat as read:`, error);
    }
  }

  /**
   * Subscribe to chat metadata for multiple chats to detect unread messages.
   * Compares lastMessageTimestamp vs businessLastReadAt.
   */
  async subscribeToUnreadStatus(chatIds: string[], businessId: string): Promise<void> {
    // Clean up old metadata listeners
    this.metadataListeners.forEach((unsub) => unsub());
    this.metadataListeners.clear();

    try {
      await this.authenticateWithFirebase();
    } catch (error) {
      console.error('[FirebaseService] Failed to auth for unread status:', error);
      return;
    }

    for (const chatId of chatIds) {
      if (!chatId) continue;

      const metadataRef = ref(this.db, `chats/${chatId}/metadata`);
      const unsub = onValue(metadataRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const meta = snapshot.val();
        const lastTs = meta.lastMessageTimestamp || 0;
        const lastReadTs = meta.businessLastReadAt || 0;
        const lastSender = meta.lastSenderId || '';

        // Unread if: there's a newer message AND it wasn't sent by the business
        const isUnread = lastTs > lastReadTs && lastSender !== businessId;

        this.unreadChatIdsSignal.update((set) => {
          const next = new Set(set);
          if (isUnread) {
            next.add(chatId);
          } else {
            next.delete(chatId);
          }
          return next;
        });
      }, (error) => {
        console.error(`[FirebaseService] Error watching metadata for ${chatId}:`, error);
      });

      this.metadataListeners.set(chatId, unsub);
    }
  }

  /**
   * Format timestamp to readable time
   */
  formatTime(timestamp: number): string {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();

    if (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
}
