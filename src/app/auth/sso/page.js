import { Suspense } from 'react';
import SsoClient from './SsoClient';

export default function SsoPage() {
  return (
    <Suspense
      fallback={
        <div className="sso-page">
          <div className="sso-card">
            <h1>Conectando con Mateo…</h1>
            <p>Validando tu sesión desde el WMS.</p>
          </div>
        </div>
      }
    >
      <SsoClient />
    </Suspense>
  );
}
