'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../hooks/useAuth';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../../lib/auth-config';
import LoginForm from '../../components/LoginForm';
import '../../styles/auth.css';
import '../../styles/reportes.css';

const ReporteFoliosTablero = dynamic(() => import('../../components/ReporteFoliosTablero'), {
  ssr: false,
});

export default function ReporteFoliosPage() {
  const { accessToken, isAuthenticated, isReady, logout, applySession } = useAuth();
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
          <p>Serás enviado al portal de Polaria WMS.</p>
        </div>
      </div>
    );
  }

  return (
    <ReporteFoliosTablero
      accessToken={accessToken}
      onSessionInvalid={logout}
    />
  );
}
