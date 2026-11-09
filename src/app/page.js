"use client";
import React, { useState, useRef, useEffect } from 'react';
import LogoutForm from '../components/LogoutForm';
import MateoTopbar from '../components/MateoTopbar';
import SsoStatusScreen from '../components/SsoStatusScreen';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../lib/auth-config';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/LoginForm';
import { useChat } from '../hooks/useChat';
import RouteChoice from '../components/RouteChoice';
import ChatThread from '../components/ChatThread';
import ChatSidebar from '../components/ChatSidebar';
import ComposerInput from '../components/ComposerInput';
import EmbedPanel, { extractFirstUrl } from '../components/EmbedPanel';
import { registerEmbedUrl, releaseEmbedUrl } from '../lib/embed-registry';
import { getDisplayInitial, getDisplayName } from '../lib/display-name';

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutForm, setShowLogoutForm] = useState(false);
  const [embed, setEmbed] = useState(null);
  const chatEndRef = useRef(null);
  const lastAutoEmbedRef = useRef(null);

  const { user, accessToken, isAuthenticated, isReady, logout, applySession } = useAuth();
  const allowDirectLogin = isDirectLoginEnabled();

  const {
    messages,
    conversaciones,
    activeConversacionId,
    inputValue,
    setInputValue,
    showWelcome,
    isLoadingConversaciones,
    isLoadingMensajes,
    isSending,
    persistError,
    nuevoChat,
    mostrarInicio,
    abrirConversacion,
    eliminarConversacion,
    enviarMensaje,
  } = useChat({
    user,
    accessToken,
    isAuthenticated,
    onRequireLogin: redirectToWmsLogin,
    onSessionInvalid: logout,
  });

  useEffect(() => {
    if (isReady && !isAuthenticated && !allowDirectLogin) {
      redirectToWmsLogin();
    }
  }, [isReady, isAuthenticated, allowDirectLogin]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const syncLayout = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setIsSidebarCollapsed(mobile);
    };

    syncLayout();

    mq.addEventListener('change', syncLayout);
    return () => mq.removeEventListener('change', syncLayout);
  }, []);

  // Auto-embeber la URL cuando Mateo responde con un enlace
  useEffect(() => {
    if (showWelcome || messages.length === 0 || isSending) return;

    const lastIa = [...messages].reverse().find((m) => m.tipo === 'ia');
    if (!lastIa?.texto) return;

    const found = extractFirstUrl(lastIa.texto);
    if (!found?.url) return;
    if (lastAutoEmbedRef.current === found.url) return;

    lastAutoEmbedRef.current = found.url;
    setEmbed((prev) => {
      if (prev?.token) releaseEmbedUrl(prev.token);
      const token = registerEmbedUrl(found.url);
      if (!token) return null;
      return { token, title: found.label || 'Reporte' };
    });
  }, [messages, showWelcome, isSending]);

  const openEmbed = ({ url, label }) => {
    if (!url) return;
    lastAutoEmbedRef.current = url;
    setEmbed((prev) => {
      if (prev?.token) releaseEmbedUrl(prev.token);
      const token = registerEmbedUrl(url);
      if (!token) return null;
      return { token, title: label || 'Reporte' };
    });
  };

  const closeEmbed = () => {
    setEmbed((prev) => {
      if (prev?.token) releaseEmbedUrl(prev.token);
      return null;
    });
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((collapsed) => !collapsed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const handleNuevoChat = () => {
    nuevoChat();
    closeEmbed();
    lastAutoEmbedRef.current = null;
  };

  const handleMostrarInicio = () => {
    mostrarInicio();
    closeEmbed();
    lastAutoEmbedRef.current = null;
  };

  const handleAbrirConversacion = (id) => {
    lastAutoEmbedRef.current = null;
    closeEmbed();
    abrirConversacion(id);
  };

  const handleEliminarConversacion = async (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    const confirmar = window.confirm('¿Eliminar esta conversación del historial?');
    if (!confirmar) return;

    await eliminarConversacion(id);
    if (activeConversacionId === id) {
      closeEmbed();
      lastAutoEmbedRef.current = null;
    }
  };

  const displayName = isAuthenticated ? getDisplayName(user) : '';
  const userInitial = isAuthenticated ? getDisplayInitial(user) : 'U';
  const userDomain = isAuthenticated
    ? (user.email?.split('@')[1] || user.codigoEmpresa || 'polaria.tech')
    : '';

  const esperaEleccion = showWelcome || Boolean(messages.at(-1)?.elegirRuta);

  if (!isReady) {
    return (
      <SsoStatusScreen
        title="Conectando con Mateo IA…"
        message="Estamos validando tu sesión desde Polaria WMS."
      />
    );
  }

  if (!isAuthenticated) {
    if (allowDirectLogin) {
      return <LoginForm onLoginSuccess={applySession} />;
    }

    return (
      <SsoStatusScreen
        title="Conectando con Polaria WMS…"
        message="Estamos validando tu sesión desde Mateo IA."
      />
    );
  }

  const hasEmbed = Boolean(embed?.token);

  return (
    <div className={`layout${hasEmbed ? ' layout--with-embed' : ''}${isSidebarCollapsed ? ' layout--sidebar-collapsed' : ''}`}>
      <ChatSidebar
        isMobile={isMobile}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        onNuevoChat={handleNuevoChat}
        onInicio={handleMostrarInicio}
        persistError={persistError}
        isLoadingConversaciones={isLoadingConversaciones}
        conversaciones={conversaciones}
        activeConversacionId={activeConversacionId}
        onAbrir={handleAbrirConversacion}
        onEliminar={handleEliminarConversacion}
        isAuthenticated={isAuthenticated}
        user={user}
        userDomain={userDomain}
      />

      <main className="main">
        <MateoTopbar
          onHome={handleMostrarInicio}
          onLogout={() => setShowLogoutForm(true)}
        />

        {showWelcome && (
          <section className="welcome">
            <div className="welcome-hero">
              <div className="welcome-hero__avatar" aria-hidden="true">
                {userInitial}
              </div>
              <h1 className="welcome-hero__greeting">
                {displayName ? (
                  <>
                    Hola, <span className="welcome-hero__name">{displayName}</span>
                  </>
                ) : (
                  'Hola'
                )}
              </h1>
              <p className="welcome-hero__subtitle">
                Soy Mateo. Elige Ventas o Pedidos, o escribe tu pregunta.
              </p>
            </div>

            <RouteChoice disabled={isSending} onElegir={enviarMensaje} />
          </section>
        )}

        {!showWelcome && (
          <ChatThread
            isLoadingMensajes={isLoadingMensajes}
            messages={messages}
            isSending={isSending}
            openEmbed={openEmbed}
            enviarMensaje={enviarMensaje}
            accessToken={accessToken}
            chatEndRef={chatEndRef}
          />
        )}

        {!esperaEleccion && (
        <footer className="composer">
          <div className="composer-inner">
            <button className="composer-icon-btn" type="button" aria-label="Adjuntar archivo">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2.33363 9.91638V11.0836C2.33363 11.393 2.45651 11.6896 2.67525 11.9084C2.89399 12.1271 3.19066 12.25 3.5 12.25H10.5C10.8093 12.25 11.106 12.1271 11.3248 11.9084C11.5435 11.6896 11.6664 11.393 11.6664 11.0836V9.91638"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.225"
                />
                <path d="M9.33362 4.66638L7 2.33363L4.66638 4.66638" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.225" />
                <path d="M7 2.33363V9.33363" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.225" />
              </svg>
            </button>
            <ComposerInput
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="composer-send"
              type="button"
              onClick={() => enviarMensaje()}
              disabled={isSending}
              aria-label="Enviar mensaje"
            >
              {isSending ? (
                <svg className="composer-send__spinner" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
                  <path d="M12.5 7A5.5 5.5 0 007 1.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M7.41941 11.0689C7.43881 11.1172 7.47252 11.1584 7.51602 11.1871C7.55953 11.2157 7.61075 11.2303 7.6628 11.229C7.71486 11.2277 7.76527 11.2104 7.80725 11.1796C7.84923 11.1488 7.88078 11.1059 7.89768 11.0567L11.2154 1.35873C11.2318 1.31351 11.2348 1.26456 11.2244 1.21762C11.2139 1.1707 11.1903 1.12771 11.1563 1.09371C11.1223 1.0597 11.0793 1.0361 11.0324 1.02563C10.9855 1.01517 10.9365 1.01828 10.8913 1.03462L1.19335 4.35232C1.1441 4.36922 1.10119 4.40077 1.07038 4.44275C1.03958 4.48473 1.02235 4.53514 1.02102 4.5872C1.01968 4.63925 1.0343 4.69047 1.06292 4.73398C1.09154 4.77748 1.13278 4.8112 1.1811 4.83059L5.22871 6.45371C5.35666 6.50493 5.47292 6.58155 5.57047 6.67892C5.66801 6.77629 5.74483 6.89241 5.79629 7.02027L7.41941 11.0689Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.1375"
                  />
                  <path d="M11.1547 1.09587L5.57069 6.67931" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1375" />
                </svg>
              )}
            </button>
          </div>
        </footer>
        )}
      </main>

      {hasEmbed && (
        <EmbedPanel
          token={embed.token}
          title={embed.title}
          onClose={closeEmbed}
        />
      )}

      {showLogoutForm && (
        <LogoutForm
          user={user}
          onLogout={logout}
          onClose={() => setShowLogoutForm(false)}
        />
      )}
    </div>
  );
}
