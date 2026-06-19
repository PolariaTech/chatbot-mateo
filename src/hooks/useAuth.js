'use client';

import { useState, useEffect, useCallback } from 'react';
import * as authApi from '../lib/auth-api';
import { redirectToWmsLogin } from '../lib/auth-config';
import {
  getStoredSession,
  setStoredSession,
  clearStoredSession,
} from '../lib/auth-storage';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const applySession = useCallback((session) => {
    if (!session?.user) return;

    setStoredSession(session);
    setAccessToken(session.accessToken ?? null);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function hydrate() {
      const stored = getStoredSession();
      if (cancelled) return;

      if (stored) {
        applySession(stored);
      } else {
        clearSession();
      }

      setIsReady(true);
    }

    hydrate();

    const syncSession = (event) => {
      if (event.storageArea && event.key && event.key !== 'polaria-auth') {
        return;
      }

      const stored = getStoredSession();
      if (stored) {
        applySession(stored);
      } else {
        clearSession();
      }
    };

    window.addEventListener('storage', syncSession);
    window.addEventListener('focus', syncSession);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('focus', syncSession);
    };
  }, [applySession, clearSession]);

  const logout = async () => {
    if (user || accessToken) {
      try {
        await authApi.logout(accessToken);
      } catch {
        // La sesión local se limpia aunque falle el servidor.
      }
    }
    clearSession();
    redirectToWmsLogin();
  };

  return {
    user,
    accessToken,
    isReady,
    isAuthenticated: !!user,
    logout,
  };
}
