'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { redirectToWmsLogin } from '../../../lib/auth-config';
import * as authApi from '../../../lib/auth-api';
import { captureSessionFromLocation, getStoredSession, setStoredSession } from '../../../lib/auth-storage';
import SsoStatusScreen from '../../../components/SsoStatusScreen';

export default function SsoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const capturedSession = captureSessionFromLocation();
    const code = searchParams.get('code');

    if (!code) {
      if (capturedSession || getStoredSession()) {
        router.replace('/');
        return;
      }

      setError('No se recibió un código de acceso. Vuelve al WMS e intenta de nuevo.');
      return;
    }

    let cancelled = false;

    async function exchange() {
      try {
        const result = await authApi.exchangeMateoCode(code);
        if (cancelled) return;

        if (!result.ok || !result.session) {
          setError(
            result.error ||
              'El código de acceso no es válido o ya expiró. Vuelve al WMS e intenta de nuevo.',
          );
          return;
        }

        setStoredSession(result.session);
        router.replace('/');
      } catch {
        if (!cancelled) {
          setError('No se pudo conectar con el servidor. Intenta de nuevo desde el WMS.');
        }
      }
    }

    exchange();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  if (error) {
    return (
      <SsoStatusScreen title="No se pudo iniciar sesión" message={error}>
        <button
          type="button"
          className="auth-btn auth-btn--primary"
          onClick={redirectToWmsLogin}
        >
          Ir al inicio de sesión
        </button>
      </SsoStatusScreen>
    );
  }

  return (
    <SsoStatusScreen
      title="Conectando con Mateo IA…"
      message="Estamos validando tu sesión desde Polaria WMS."
    />
  );
}
