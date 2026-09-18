import { Suspense } from 'react';
import SsoClient from './SsoClient';
import SsoStatusScreen from '../../../components/SsoStatusScreen';

export default function SsoPage() {
  return (
    <Suspense
      fallback={
        <SsoStatusScreen
          title="Conectando con Mateo IA…"
          message="Estamos validando tu sesión desde Polaria WMS."
        />
      }
    >
      <SsoClient />
    </Suspense>
  );
}
