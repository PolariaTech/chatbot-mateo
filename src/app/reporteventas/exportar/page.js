'use client';

import { Suspense, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../../../lib/auth-config';
import LoginForm from '../../../components/LoginForm';
import ReporteVentasExcelDescarga from '../../../components/ReporteVentasExcelDescarga';
import '../../../styles/auth.css';
import '../../../styles/reportes.css';

function ExportarContenido() {
  const { accessToken, isAuthenticated, isReady, applySession } = useAuth();
  const allowDirectLogin = isDirectLoginEnabled();

  useEffect(() => {
    if (isReady && !isAuthenticated && !allowDirectLogin) {
      redirectToWmsLogin();
    }
  }, [isReady, isAuthenticated, allowDirectLogin]);

  if (!isReady) {
    return (
      <div className="sso-page">
        <div className="sso-card">
          <h1>Cargando…</h1>
          <p>Preparando la sesión.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (allowDirectLogin) {
      return <LoginForm onLoginSuccess={applySession} />;
    }
    return (
      <div className="sso-page">
        <div className="sso-card">
          <h1>Redirigiendo al inicio de sesión…</h1>
        </div>
      </div>
    );
  }

  return <ReporteVentasExcelDescarga accessToken={accessToken} />;
}

export default function ReporteVentasExportarPage() {
  return (
    <Suspense
      fallback={
        <div className="sso-page">
          <div className="sso-card">
            <h1>Cargando…</h1>
          </div>
        </div>
      }
    >
      <ExportarContenido />
    </Suspense>
  );
}
