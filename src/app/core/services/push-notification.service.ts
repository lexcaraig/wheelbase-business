import { Injectable, inject, signal, computed } from '@angular/core';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { FirebaseService } from './firebase.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from '../auth/auth.service';

const VAPID_KEY = 'BJQ8Ovlx1sjGMrQnOWGqf9sgJky14r_w2zPcccz__Jg-riK4EtB-BFtGJUwFCJxc0QvjqLoHjOGqbxn78hHFs1s';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private firebaseService = inject(FirebaseService);
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);

  private messaging: Messaging | null = null;
  private permissionStatus = signal<NotificationPermission>('default');
  private fcmToken = signal<string | null>(null);

  readonly isSupported = computed(() => 'Notification' in window && 'serviceWorker' in navigator);
  readonly isPermissionGranted = computed(() => this.permissionStatus() === 'granted');
  readonly hasToken = computed(() => this.fcmToken() !== null);

  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('[Push] Browser does not support notifications');
      return;
    }

    this.permissionStatus.set(Notification.permission);

    if (Notification.permission === 'granted') {
      await this.setupMessaging();
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    const permission = await Notification.requestPermission();
    this.permissionStatus.set(permission);

    if (permission === 'granted') {
      await this.setupMessaging();
      return true;
    }

    return false;
  }

  private async setupMessaging(): Promise<void> {
    try {
      const app = this.firebaseService.getApp();
      if (!app) {
        console.warn('[Push] Firebase app not initialized');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[Push] Service worker registered');

      this.messaging = getMessaging(app);

      // Get FCM token
      if (!VAPID_KEY) {
        console.warn('[Push] VAPID_KEY not configured — FCM token generation skipped');
        // Fall back to browser notifications only (no background push)
        this.setupForegroundListener();
        return;
      }

      const token = await getToken(this.messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        this.fcmToken.set(token);
        console.log('[Push] FCM token obtained');
        await this.saveTokenToServer(token);
      }

      this.setupForegroundListener();
    } catch (error) {
      console.error('[Push] Setup failed:', error);
    }
  }

  private setupForegroundListener(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('[Push] Foreground message:', payload);

      const { title, body } = payload.notification || {};
      if (Notification.permission === 'granted') {
        new Notification(title || 'New Order', {
          body: body || 'You have a new order on Wheelbase',
          icon: '/assets/icons/icon-192x192.png',
          tag: 'wheelbase-order',
        });
      }
    });
  }

  private async saveTokenToServer(token: string): Promise<void> {
    try {
      const unified = this.authService.unifiedBusiness();
      if (!unified) return;

      await this.supabaseService.callFunctionWithAuth('save-fcm-token', {
        token,
        platform: 'web',
        device_type: 'business_portal',
        business_id: unified.id,
      });

      console.log('[Push] Token saved to server');
    } catch (error) {
      console.error('[Push] Failed to save token:', error);
    }
  }

  showLocalNotification(title: string, body: string, data?: Record<string, string>): void {
    if (Notification.permission !== 'granted') return;

    new Notification(title, {
      body,
      icon: '/assets/icons/icon-192x192.png',
      tag: 'wheelbase-order',
      data,
    });
  }
}
