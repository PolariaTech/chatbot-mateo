'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { redirectToWmsLogin } from '../../../lib/auth-config';
import * as authApi from '../../../lib/auth-api';
import { setStoredSession } from '../../../lib/auth-storage';
import PolariaIcon from '../../../components/PolariaIcon';
import '../../../styles/auth.css';

export default function SsoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
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

  return (
    <div className="sso-page">
      <div className="sso-card">
        <PolariaIcon size={28} />
        {error ? (
          <>
            <h1>No se pudo iniciar sesión</h1>
            <p className="auth-error">{error}</p>
            <button
              type="button"
              className="auth-btn auth-btn--primary"
              onClick={redirectToWmsLogin}
            >
              Ir al inicio de sesión
            </button>
          </>
        ) : (
          <>
            <h1>Conectando con Mateo…</h1>
            <p>Validando tu sesión desde el WMS.</p>
          </>
        )}
      </div>
    </div>
  );
}
