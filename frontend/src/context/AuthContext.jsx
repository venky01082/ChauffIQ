import React, { createContext, useState } from 'react';
import { chauffiq, ApiClientError } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await chauffiq.auth.login({ email, password });
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

  const logout = () => {
    chauffiq.auth.logout();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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

