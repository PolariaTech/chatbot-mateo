'use client';

import { Suspense, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../../../lib/auth-config';
import LoginForm from '../../../components/LoginForm';
import ReporteFoliosExcelDescarga from '../../../components/ReporteFoliosExcelDescarga';
import {
  SessionLoadingFallback,
  SessionRedirectFallback,
} from '../../../components/SessionStatusFallback';
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
    return <SessionLoadingFallback />;
  }

  if (!isAuthenticated) {
    if (allowDirectLogin) {
      return <LoginForm onLoginSuccess={applySession} />;
    }
    return <SessionRedirectFallback />;
  }

  return <ReporteFoliosExcelDescarga accessToken={accessToken} />;
}

export default function ReporteFoliosExportarPage() {
  return (
    <Suspense
      fallback={<SessionLoadingFallback />}
    >
      <ExportarContenido />
    </Suspense>
  );
}
