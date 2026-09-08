import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { chauffiq } from '../api';
import { requestNotificationPermissionAndToken, onForegroundMessage } from '../firebase';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [fcmStatus, setFcmStatus] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return 'enabled';
      if (Notification.permission === 'denied') return 'denied';
      return 'idle';
    }
    return 'unsupported';
  });
  const [foregroundToast, setForegroundToast] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribe = () => {};
    onForegroundMessage((payload) => {
      const title = payload?.notification?.title || payload?.data?.title || 'Ride Update';
      const body = payload?.notification?.body || payload?.data?.body || 'You have an update.';
      setForegroundToast({ title, body });
      setTimeout(() => {
        setForegroundToast(null);
      }, 6000);
    }).then((unsub) => {
      if (typeof unsub === 'function') {
        unsubscribe = unsub;
      }
    }).catch(() => {});

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isAuthenticated]);

  const handleEnablePush = useCallback(async () => {
    if (fcmStatus === 'loading') return;
    setFcmStatus('loading');
    try {
      let activeVapidKey =
        (import.meta.env && import.meta.env.VITE_FIREBASE_VAPID_KEY) ||
        (typeof window !== 'undefined' && window.__CHAUFFIQ_VAPID_KEY__) ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('chauffiq_vapid_key'));

      if (!activeVapidKey && typeof window !== 'undefined') {
        const inputKey = window.prompt(
          'Please enter the Public Web Push (VAPID) Key from Firebase Console (Project Settings > Cloud Messaging > Web Push certificates):'
        );
        if (inputKey && inputKey.trim()) {
          activeVapidKey = inputKey.trim();
          localStorage.setItem('chauffiq_vapid_key', activeVapidKey);
        }
      }

      const result = await requestNotificationPermissionAndToken(activeVapidKey);
      if (result.success && result.token) {
        await chauffiq.notifications.registerFcmToken({
          token: result.token,
          deviceInfo: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            platform: typeof navigator !== 'undefined' ? navigator.platform : '',
          },
        });
        setFcmStatus('enabled');
        setForegroundToast({
          title: 'Push Notifications Enabled 🔔',
          body: 'This device is now registered to receive real-time ride alerts.',
        });
      } else if (result.reason === 'permission_denied') {
        setFcmStatus('denied');
      } else {
        if (result.reason) {
          console.warn('FCM token request skipped or returned reason:', result.reason);
        }
        setFcmStatus('idle');
      }
    } catch (err) {
      console.warn('FCM token setup skipped or failed:', err?.message);
      setFcmStatus('idle');
    }
  }, [fcmStatus]);

  return (
    <header className="navbar">
      {foregroundToast && (
        <div className="fcm-toast" role="alert">
          <span><strong>{foregroundToast.title}</strong>: {foregroundToast.body}</span>
          <button
            type="button"
            className="fcm-toast-close"
            onClick={() => setForegroundToast(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
      <div className="nav-container">
        <div className="nav-brand">
          <span className="brand-logo">🚗</span>
          <span className="brand-name">ChauffIQ</span>
          {user?.role && (
            <span className={`role-badge ${user.role.toLowerCase()}`}>
              {user.role}
            </span>
          )}
        </div>

        {isAuthenticated && (
          <nav className="nav-links">
            <button
              type="button"
              className={`nav-tab ${activeTab === 'passenger' ? 'active' : ''}`}
              onClick={() => setActiveTab('passenger')}
            >
              Passenger
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'driver' ? 'active' : ''}`}
              onClick={() => setActiveTab('driver')}
            >
              Driver
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'family' ? 'active' : ''}`}
              onClick={() => setActiveTab('family')}
            >
              Family Tracking
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Trip History
            </button>
            {(user?.role === 'ADMIN' || user?.isAdmin === true) && (
              <button
                type="button"
                className={`nav-tab nav-tab-admin ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin
              </button>
            )}
          </nav>
        )}

        <div className="nav-user">
          {isAuthenticated ? (
            <div className="user-profile">
              {fcmStatus !== 'unsupported' && (
                <button
                  type="button"
                  className={`btn btn-sm btn-icon ${fcmStatus === 'enabled' ? 'btn-fcm-active' : 'btn-outline'}`}
                  onClick={handleEnablePush}
                  title={
                    fcmStatus === 'enabled'
                      ? 'Push notifications active'
                      : fcmStatus === 'denied'
                      ? 'Push notifications blocked in browser'
                      : 'Enable ride push notifications'
                  }
                  disabled={fcmStatus === 'loading' || fcmStatus === 'denied'}
                  aria-label="Push notifications"
                >
                  {fcmStatus === 'loading' ? '⏳' : fcmStatus === 'enabled' ? '🔔' : '🔕'}
                </button>
              )}
              <span className="user-name">{user.name || user.email}</span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <span className="nav-guest">
              {import.meta.env.PROD ? 'Cloud Connected' : 'Local Emulator'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
