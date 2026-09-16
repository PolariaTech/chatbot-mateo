'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaExpand, FaTimes, FaRedo } from 'react-icons/fa';
import {
  EMBED_FRAME_PATH,
  EMBED_MSG_LOAD,
  EMBED_MSG_READY,
  peekEmbedUrl,
} from '../lib/embed-registry';
import { extractFirstUrl as extractFirstUrlFromText } from '../lib/message-links';

export default function EmbedPanel({ token, title, onClose }) {
  const [loadError, setLoadError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);

  const sendTargetUrl = () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow || !token) return;

    const targetUrl = peekEmbedUrl(token);
    if (!targetUrl) {
      setLoadError(true);
      return;
    }

    frame.contentWindow.postMessage(
      { type: EMBED_MSG_LOAD, url: targetUrl },
      window.location.origin
    );
  };

  useEffect(() => {
    setLoadError(false);
    setIframeKey((k) => k + 1);
  }, [token]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== EMBED_MSG_READY) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      const frame = iframeRef.current;
      const targetUrl = peekEmbedUrl(token);
      if (!frame?.contentWindow || !targetUrl) {
        setLoadError(true);
        return;
      }

      frame.contentWindow.postMessage(
        { type: EMBED_MSG_LOAD, url: targetUrl },
        window.location.origin
      );
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [token, iframeKey]);

  if (!token) return null;

  const label = title || 'Reporte';

  const handleRetry = () => {
    setLoadError(false);
    setIframeKey((k) => k + 1);
  };

  return (
    <aside
      className={`embed-panel${isFullscreen ? ' embed-panel--fullscreen' : ''}`}
      aria-label="Vista embebida"
    >
      <header className="embed-panel__header">
        <div className="embed-panel__tabs" role="tablist">
          <button
            type="button"
            className="embed-panel__tab embed-panel__tab--active"
            role="tab"
            aria-selected="true"
          >
            Vista
          </button>
        </div>
        <div className="embed-panel__meta">{label}</div>
        <div className="embed-panel__actions">
          <button
            type="button"
            className="embed-panel__action"
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            <FaExpand size={13} />
          </button>
          <button
            type="button"
            className="embed-panel__action"
            onClick={onClose}
            aria-label="Cerrar vista embebida"
            title="Cerrar"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </header>

      <div className="embed-panel__body">
        {loadError ? (
          <div className="embed-panel__error">
            <p className="embed-panel__error-title">No se pudo cargar la vista</p>
            <p className="embed-panel__error-text">
              El sitio puede bloquear la visualización embebida. Puedes reintentar.
            </p>
            <div className="embed-panel__error-actions">
              <button type="button" className="outline-btn" onClick={handleRetry}>
                <FaRedo size={12} />
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={EMBED_FRAME_PATH}
            title={label}
            className="embed-panel__iframe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
            referrerPolicy="no-referrer"
            onLoad={sendTargetUrl}
            onError={() => setLoadError(true)}
          />
        )}
      </div>
    </aside>
  );
}

/**
 * Extrae la primera URL http(s) de un texto (markdown o bare).
 */
export function extractFirstUrl(text) {
  return extractFirstUrlFromText(text);
}
