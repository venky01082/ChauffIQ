import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { chauffiq, ApiClientError } from '../api';
import { getFirebaseAuth } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Helper to convert ApiClientError into friendly human message
   */
  const formatError = (err) => {
    if (err instanceof ApiClientError) {
      if (err.status === 400) return err.message || 'Invalid input provided.';
      if (err.status === 401) return 'Invalid credentials or session expired.';
      if (err.status === 403) return 'You are not authorized for this action.';
      if (err.status === 404) return 'Requested resource not found.';
      if (err.status === 409) return 'An account with this email already exists.';
      if (err.status >= 500) return 'Server error. Please try again later.';
      return err.message;
    }
    return err?.message || 'An unexpected error occurred.';
  };

  // Restore authenticated session on mount (survives browser refresh/F5)
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    async function initAuthListener() {
      try {
        const auth = await getFirebaseAuth();
        unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (!isMounted) return;
          if (fbUser) {
            try {
              const idToken = await fbUser.getIdToken();
              chauffiq.tokenManager.setToken(idToken);
              chauffiq.tokenManager.setTokenProvider(() => fbUser.getIdToken());

              const tokenResult = await fbUser.getIdTokenResult();
              const claims = tokenResult.claims || {};
              const isAdmin = claims.admin === true || claims.role === 'ADMIN';

              setUser({
                uid: fbUser.uid,
                email: fbUser.email || '',
                name: fbUser.displayName || '',
                phone: fbUser.phoneNumber || '',
                role: isAdmin ? 'ADMIN' : (claims.role || 'PASSENGER'),
                admin: isAdmin,
              });
            } catch (err) {
              console.warn('Session token refresh error:', err);
              setUser(null);
            }
          } else {
            setUser((curr) => {
              if (!curr) chauffiq.tokenManager.clearToken();
              return null;
            });
          }
          if (isMounted) setInitializing(false);
        });
      } catch (err) {
        console.warn('Auth listener init error:', err);
        if (isMounted) setInitializing(false);
      }
    }

    initAuthListener();
    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Authenticate with backend API
      const res = await chauffiq.auth.login({ email, password });

      // 2. Also sign in to client Firebase SDK so session persists in IndexedDB across F5
      try {
        const auth = await getFirebaseAuth();
        await signInWithEmailAndPassword(auth, email, password);
      } catch {
        // Fall back gracefully to backend session if client Firebase signIn is unavailable
      }

      setUser(res.user);
      return res.user;
    } catch (err) {
      const msg = formatError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ email, password, name, phone, role }) => {
    setLoading(true);
    setError(null);
    try {
      await chauffiq.auth.register({ email, password, name, phone, role });
      // Automatically login after successful registration
      return await login(email, password);
    } catch (err) {
      const msg = formatError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const phoneLogin = async ({ idToken, name, role }) => {
    setLoading(true);
    setError(null);
    try {
      if (!idToken) {
        throw new Error('Authentication failed: Missing ID token.');
      }
      chauffiq.tokenManager.setToken(idToken);
      const res = await chauffiq.auth.syncUser({ name, role });
      setUser(res.user);
      return res.user;
    } catch (err) {
      const msg = formatError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const auth = await getFirebaseAuth();
      await signOut(auth);
    } catch {
      // ignore
    }
    chauffiq.auth.logout();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initializing,
        error,
        setError,
        login,
        register,
        phoneLogin,
        logout,
        formatError,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };

