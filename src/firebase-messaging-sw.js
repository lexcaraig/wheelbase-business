// Firebase Messaging Service Worker
// Handles background push notifications when the browser tab is not active
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA6kqOTeWozgLAFEftBMZwp6UBbUpB7Fdg',
  authDomain: 'wheelbase-d688c.firebaseapp.com',
  projectId: 'wheelbase-d688c',
  storageBucket: 'wheelbase-d688c.firebasestorage.app',
  messagingSenderId: '249886728996',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  const notificationTitle = title || 'New Order';
  const notificationOptions = {
    body: body || 'You have a new order on Wheelbase',
    icon: icon || '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    data: payload.data,
    tag: 'wheelbase-order',
    renotify: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/orders';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/orders') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
