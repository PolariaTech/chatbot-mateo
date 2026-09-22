'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../hooks/useAuth';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../../lib/auth-config';
import { allowScreenRotation } from '../../lib/pwa-install';
import LoginForm from '../../components/LoginForm';
import DashboardLoadingScreen from '../../components/DashboardLoadingScreen';
import { SessionRedirectFallback } from '../../components/SessionStatusFallback';
import '../../styles/auth.css';
import '../../styles/reportes.css';

const ReporteGerenciaTablero = dynamic(() => import('../../components/ReporteGerenciaTablero'), {
  ssr: false,
});

export default function ReporteGerenciaPage() {
  const { accessToken, isAuthenticated, isReady, logout, applySession } = useAuth();
  const allowDirectLogin = isDirectLoginEnabled();

  useEffect(() => {
    allowScreenRotation();
    const onFirstGesture = () => allowScreenRotation();
    window.addEventListener('pointerdown', onFirstGesture, { once: true });

    if (isReady && !isAuthenticated && !allowDirectLogin) {
      redirectToWmsLogin();
    }

    return () => window.removeEventListener('pointerdown', onFirstGesture);
  }, [isReady, isAuthenticated, allowDirectLogin]);

  if (!isReady) {
    return <DashboardLoadingScreen />;
  }

  if (!isAuthenticated) {
    if (allowDirectLogin) {
      return <LoginForm onLoginSuccess={applySession} />;
    }

    return <SessionRedirectFallback />;
  }

  return (
    <ReporteGerenciaTablero
      accessToken={accessToken}
      onSessionInvalid={logout}
    />
  );
}
