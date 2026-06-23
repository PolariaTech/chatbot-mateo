'use client';

import { useState, useEffect, useCallback } from 'react';
import * as authApi from '../lib/auth-api';
import {
  isDirectLoginEnabled,
  redirectToWmsLogin,
  buildWmsSsoUrl,
  WMS_LOGIN_URL,
} from '../lib/auth-config';
import {
  captureSessionFromLocation,
  getStoredSession,
  setStoredSession,
  clearStoredSession,
} from '../lib/auth-storage';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const applySession = useCallback((session) => {
    if (!session?.accessToken) return;

    setStoredSession(session);
    setAccessToken(session.accessToken);
    setUser(session.user ?? null);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function hydrate() {
      captureSessionFromLocation();
      const stored = getStoredSession();
      if (cancelled) return;

      if (stored) {
        applySession(stored);
        setIsReady(true);
        return;
      }

      clearSession();

      if (!isDirectLoginEnabled()) {
        redirectToWmsLogin();
        return;
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
        return;
      }

      clearSession();

      if (!isDirectLoginEnabled()) {
        redirectToWmsLogin();
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

  const leaveForWms = useCallback(async () => {
    const token = accessToken ?? getStoredSession()?.accessToken;

    if (!token) {
      window.location.replace(WMS_LOGIN_URL);
      return { ok: true };
    }

    try {
      const handoff = await authApi.mateoHandoff(token);
      if (!handoff.ok || !handoff.data?.code) {
        return {
          ok: false,
          error: handoff.error || 'No se pudo preparar el acceso al WMS.',
        };
      }

      const redirectUrl = buildWmsSsoUrl(handoff.data.code);

      clearStoredSession();
      setAccessToken(null);
      setUser(null);

      try {
        await authApi.logout(token);
      } catch {
        // La redirección continúa aunque falle el logout en servidor.
      }

      window.location.replace(redirectUrl);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'No se pudo conectar con el servidor. Revisa tu conexión.',
      };
    }
  }, [accessToken]);

  const logout = async () => {
    if (user || accessToken) {
      try {
        await authApi.logout(accessToken);
      } catch {
        // La sesión local se limpia aunque falle el servidor.
      }
    }
    clearSession();

    if (!isDirectLoginEnabled()) {
      redirectToWmsLogin();
    }
  };

  return {
    user,
    accessToken,
    isReady,
    isAuthenticated: !!(user || accessToken),
    applySession,
    leaveForWms,
    logout,
  };
}
