'use client';

import { useEffect, useState } from 'react';
import DashboardLoadingScreen from '../../components/DashboardLoadingScreen';
import {
  EMBED_MSG_ERROR,
  EMBED_MSG_LOAD,
  EMBED_MSG_READY,
} from '../../lib/embed-registry';

function isSafeHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function VistaEmbebidaPage() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window.parent) return;
      if (!event.data || event.data.type !== EMBED_MSG_LOAD) return;

      const targetUrl = event.data.url;
      if (!isSafeHttpUrl(targetUrl)) {
        setStatus('error');
        window.parent.postMessage({ type: EMBED_MSG_ERROR }, window.location.origin);
        return;
      }

      setStatus('redirecting');
      window.location.replace(targetUrl);
    };

    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: EMBED_MSG_READY }, window.location.origin);

    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (status === 'error') {
    return (
      <DashboardLoadingScreen
        title="No se pudo cargar la vista"
        message="El enlace no es válido o el sitio bloqueó la visualización."
      />
    );
  }

  return <DashboardLoadingScreen />;
}
