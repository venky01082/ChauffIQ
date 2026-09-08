/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker for ChauffIQ
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

// Auto-initialize when hosted on Firebase Hosting
try {
  importScripts('/__/firebase/init.js');
} catch {
  // Gracefully handle if /__/firebase/init.js is not present
}

// Fallback initialization if init.js was not loaded
if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
  firebase.initializeApp({
    projectId: 'chauffiq-a0366',
    messagingSenderId: '479028083173',
    appId: '1:479028083173:web:64305c55013fbdfb84970c',
  });
}

if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background push:', payload);

    const title = (payload.notification && payload.notification.title) ||
      (payload.data && payload.data.title) ||
      'ChauffIQ Notification';

    const options = {
      body: (payload.notification && payload.notification.body) ||
        (payload.data && payload.data.body) ||
        'You have an update regarding your ride.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: payload.data || {},
    };

    return self.registration.showNotification(title, options);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
