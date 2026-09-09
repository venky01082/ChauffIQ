import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported, getToken, onMessage } from 'firebase/messaging';

let appInstance = null;
let authInstance = null;
let messagingInstance = null;

/**
 * Initializes or retrieves the Firebase App instance.
 * Dynamically resolves configuration from:
 * 1. Vite environment variables (e.g. VITE_FIREBASE_API_KEY)
 * 2. Firebase Hosting auto-served init.json (/__/firebase/init.json)
 * Zero sensitive keys or credentials are hardcoded in source.
 * @returns {Promise<import('firebase/app').FirebaseApp>}
 */
export async function getFirebaseApp() {
  if (appInstance) {
    return appInstance;
  }

  if (getApps().length > 0) {
    appInstance = getApp();
    return appInstance;
  }

  let config = null;

  // 1. Check environment variables
  if (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
    config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chauffiq-a0366.firebaseapp.com',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chauffiq-a0366',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'chauffiq-a0366.firebasestorage.app',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '479028083173',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:479028083173:web:64305c55013fbdfb84970c',
    };
  } else if (typeof window !== 'undefined') {
    // 2. Fetch automatic Firebase Hosting config when running in browser
    try {
      const res = await fetch('/__/firebase/init.json');
      if (res.ok) {
        config = await res.json();
      }
    } catch {
      // Ignore network errors; checked below
    }
  }

  if (!config) {
    // 3. Fallback to public project configuration when running outside Firebase Hosting (e.g. Vite dev server)
    config = {
      apiKey: 'AIzaSyCj7w7JAlJOSRlCIP_6XYLxhPCOtXhEVzM',
      authDomain: 'chauffiq-a0366.firebaseapp.com',
      projectId: 'chauffiq-a0366',
      storageBucket: 'chauffiq-a0366.firebasestorage.app',
      messagingSenderId: '479028083173',
      appId: '1:479028083173:web:64305c55013fbdfb84970c',
    };
  }

  appInstance = initializeApp(config);
  return appInstance;
}

/**
 * Initializes or retrieves the Firebase Authentication instance.
 * @returns {Promise<import('firebase/auth').Auth>}
 */
export async function getFirebaseAuth() {
  if (authInstance) {
    return authInstance;
  }

  const app = await getFirebaseApp();
  authInstance = getAuth(app);
  return authInstance;
}

/**
 * Initializes or retrieves the Firebase Messaging instance if supported.
 * Returns null if the browser environment does not support Web Push / FCM.
 * @returns {Promise<import('firebase/messaging').Messaging | null>}
 */
export async function getFirebaseMessaging() {
  if (messagingInstance) {
    return messagingInstance;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return null;
  }

  const app = await getFirebaseApp();
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

/**
 * Requests browser notification permission and retrieves an FCM Web Push token.
 * Non-blocking: will return failure reason if permission is denied or unsupported.
 * @param {string} [vapidKey]
 * @returns {Promise<{success: boolean, token?: string, reason?: string}>}
 */
export async function requestNotificationPermissionAndToken(vapidKey) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, reason: 'unsupported' };
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return { success: false, reason: 'messaging_not_supported' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return { success: false, reason: 'permission_denied' };
  }

  try {
    let registration;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
    }

    const resolvedVapidKey =
      vapidKey ||
      (import.meta.env && import.meta.env.VITE_FIREBASE_VAPID_KEY) ||
      (typeof window !== 'undefined' && window.__CHAUFFIQ_VAPID_KEY__) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('chauffiq_vapid_key')) ||
      undefined;

    const token = await getToken(messaging, {
      vapidKey: resolvedVapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      return { success: true, token };
    }
    return { success: false, reason: 'no_token_returned' };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

/**
 * Attaches a listener for foreground FCM messages.
 * @param {function(object): void} callback
 * @returns {Promise<function(): void>} Unsubscribe callback
 */
export async function onForegroundMessage(callback) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return () => {};
  }
  return onMessage(messaging, callback);
}
