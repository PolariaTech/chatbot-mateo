'use client';

import { useState, useEffect, useCallback } from 'react';
import * as authApi from '../lib/auth-api';
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
    setStoredSession(session);
    setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const stored = getStoredSession();
      if (!stored) {
        if (!cancelled) setIsReady(true);
        return;
      }

      setAccessToken(stored.accessToken);
      setUser(stored.user);

      const me = await authApi.fetchMe(stored.accessToken);
      if (cancelled) return;

      if (me.ok) {
        const session = {
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken ?? null,
          user: me.user,
        };
        applySession(session);
      } else {
        clearSession();
      }

      setIsReady(true);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  const prelogin = async (identificador, codigoEmpresa) => {
    const trimmed = identificador?.trim();
    if (!trimmed) {
      return { success: false, error: 'Ingresa tu nombre de usuario.' };
    }

    try {
      const result = await authApi.prelogin(trimmed, codigoEmpresa?.trim() || undefined);

      if (result.ok) {
        return { success: true, needsCompany: false };
      }

      if (authApi.needsCompanyCode(result.status, result.data)) {
        return {
          success: false,
          needsCompany: true,
          error: result.error || 'Ingresa el código de empresa.',
        };
      }

      return {
        success: false,
        needsCompany: false,
        error: result.error || 'No se pudo validar el usuario.',
      };
    } catch {
      return {
        success: false,
        needsCompany: false,
        error: 'No se pudo conectar con el servidor. Intenta de nuevo.',
      };
    }
  };

  const login = async (identificador, password, codigoEmpresa) => {
    const trimmedUser = identificador?.trim();
    const trimmedPassword = password?.trim();

    if (!trimmedUser || !trimmedPassword) {
      return { success: false, error: 'Completa todos los campos.' };
    }

    try {
      const result = await authApi.login(
        trimmedUser,
        trimmedPassword,
        codigoEmpresa?.trim() || undefined,
      );

      if (!result.ok) {
        if (authApi.needsCompanyCode(result.status, result.data)) {
          return {
            success: false,
            needsCompany: true,
            error: result.error || 'Ingresa el código de empresa.',
          };
        }

        return {
          success: false,
          needsCompany: false,
          error: result.error || 'Credenciales incorrectas.',
        };
      }

      applySession(result.session);
      return { success: true };
    } catch {
      return {
        success: false,
        needsCompany: false,
        error: 'No se pudo conectar con el servidor. Intenta de nuevo.',
      };
    }
  };

  const establishSession = useCallback(
    (session) => {
      applySession(session);
    },
    [applySession],
  );

  const logout = async () => {
    if (accessToken) {
      try {
        await authApi.logout(accessToken);
      } catch {
        // La sesión local se limpia aunque falle el servidor.
      }
    }
    clearSession();
  };

  return {
    user,
    accessToken,
    isReady,
    isAuthenticated: !!user && !!accessToken,
    prelogin,
    login,
    logout,
    establishSession,
  };
}
