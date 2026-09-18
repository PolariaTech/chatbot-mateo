'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../hooks/useAuth';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../../lib/auth-config';
import LoginForm from '../../components/LoginForm';
import DashboardLoadingScreen from '../../components/DashboardLoadingScreen';
import { SessionRedirectFallback } from '../../components/SessionStatusFallback';
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
    return <DashboardLoadingScreen />;
  }

  if (!isAuthenticated) {
    if (allowDirectLogin) {
      return <LoginForm onLoginSuccess={applySession} />;
    }

    return <SessionRedirectFallback />;
  }

  return (
    <ReporteFoliosTablero
      accessToken={accessToken}
      onSessionInvalid={logout}
    />
  );
}
