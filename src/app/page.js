"use client";
import React, { useState, useRef, useEffect } from 'react';
import LogoutForm from '../components/LogoutForm';
import PWAInstallButton from '../components/PWAInstallButton';
import WmsLinkButton from '../components/WmsLinkButton';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../lib/auth-config';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/LoginForm';
import { useChat } from '../hooks/useChat';
import FormattedMessage from '../components/FormattedMessage';
import EmbedPanel, { extractFirstUrl } from '../components/EmbedPanel';
import { registerEmbedUrl, releaseEmbedUrl } from '../lib/embed-registry';

import {
  FaPlus,
  FaWarehouse,
  FaBrain,
  FaChartBar,
  FaChartLine,
  FaMicrophone,
  FaSignOutAlt,
} from 'react-icons/fa';

function SidebarToggleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 4.2v15.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function MateoSparkleAvatar() {
  return (
    <div className="mateo-avatar" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    </div>
  );
}

const MESES_HISTORIAL = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

function formatoHistorialFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = MESES_HISTORIAL[d.getMonth()];
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'p. m.' : 'a. m.';
  hours = hours % 12 || 12;
  return `${day} de ${month}, ${String(hours).padStart(2, '0')}:${minutes} ${suffix}`;
}

function formatoHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'p. m.' : 'a. m.';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${suffix}`;
}

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutForm, setShowLogoutForm] = useState(false);
  const [embed, setEmbed] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
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
    if (e.key === 'Enter') {
      enviarMensaje();
    }
  };

  const handleNuevoChat = () => {
    nuevoChat();
    closeEmbed();
    lastAutoEmbedRef.current = null;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
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

  const displayName = isAuthenticated ? (user.nombre || user.username || 'Usuario') : 'Usuario';
  const userInitial = displayName.charAt(0).toUpperCase();
  const userDomain = isAuthenticated
    ? (user.email?.split('@')[1] || user.codigoEmpresa || 'polaria.tech')
    : '';

  const WELCOME_CARDS = [
    {
      icon: FaWarehouse,
      title: 'Consulta Instantánea de Inventarios',
      description: 'Información precisa y actualizada para decisiones rápidas.',
    },
    {
      icon: FaBrain,
      title: 'Conocimiento y Gestión del Negocio',
      description: 'Insights diarios para una administración con visión de futuro.',
    },
    {
      icon: FaChartBar,
      title: 'Disponibilidad Total de Informes',
      description: 'Acceso inmediato a informes detallados y listos para la toma de decisiones.',
    },
    {
      icon: FaChartLine,
      title: 'Seguimiento de Utilidades en Tiempo Real',
      description: 'Visualiza márgenes, costos y rentabilidad con datos consolidados al instante.',
    },
  ];

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

  const hasEmbed = Boolean(embed?.token);

  return (
    <div className={`layout${hasEmbed ? ' layout--with-embed' : ''}`}>
      {isMobile && !isSidebarCollapsed && (
        <div className="sidebar-backdrop" onClick={toggleSidebar} aria-hidden="true" />
      )}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <button
            className="menu-btn"
            type="button"
            onClick={toggleSidebar}
            aria-label="Alternar menú"
          >
            <SidebarToggleIcon size={20} />
          </button>
          <button
            className="brand-home"
            type="button"
            onClick={handleMostrarInicio}
            aria-label="Ir al inicio"
          >
            <span className="brand-name">Historial</span>
          </button>
        </div>

        <button className="new-chat" onClick={handleNuevoChat} type="button">
          <FaPlus size={12} aria-hidden="true" />
          Nueva conversación
        </button>

        {persistError && (
          <div className="history-empty history-empty--error">{persistError}</div>
        )}
        <div className="history">
          {isLoadingConversaciones && conversaciones.length === 0 && (
            <div className="history-empty">Cargando conversaciones…</div>
          )}
          {!isLoadingConversaciones && conversaciones.length === 0 && (
            <div className="history-empty">Sin conversaciones aún</div>
          )}
          {conversaciones.map((conversacion) => (
            <button
              key={conversacion.idConversacion}
              type="button"
              className={`history-item${activeConversacionId === conversacion.idConversacion ? ' active' : ''}`}
              onClick={() => handleAbrirConversacion(conversacion.idConversacion)}
            >
              <span className="history-item__title">
                {conversacion.titulo || 'Nueva conversación'}
              </span>
              {(conversacion.updatedAt || conversacion.createdAt) && (
                <span className="history-item__date">
                  {formatoHistorialFecha(conversacion.updatedAt || conversacion.createdAt)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-panel">
            <div className="avatar">
              {isAuthenticated ? (user.nombre || user.username || '?').charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div className="user-name">
                {isAuthenticated ? user.nombre || user.username : 'Invitado'}
              </div>
              <div className="user-role">
                {isAuthenticated ? userDomain : 'Sin sesión'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            {(isSidebarCollapsed || isMobile) && (
              <button
                className="menu-btn"
                type="button"
                onClick={toggleSidebar}
                aria-label="Abrir menú"
              >
                <SidebarToggleIcon size={20} />
              </button>
            )}
            <button
              className="topbar-title"
              type="button"
              onClick={handleMostrarInicio}
              aria-label="Ir al inicio"
            >
              <span className="topbar-logo" aria-hidden="true">
                <img src="/mateo-support-icon.png" alt="" width={62} height={68} />
              </span>
              <span className="topbar-title-text">
                <span className="topbar-title-name">Mateo IA</span>
                <span className="topbar-title-status">
                  En línea
                  {userDomain && (
                    <>
                      <span className="topbar-title-sep">·</span>
                      <span className="topbar-title-domain">{userDomain}</span>
                    </>
                  )}
                </span>
              </span>
            </button>
          </div>
          <div className="topbar-actions">
            <WmsLinkButton compact={isMobile} />
            <PWAInstallButton compact={isMobile} />
            <button className="logout-btn" type="button" onClick={() => setShowLogoutForm(true)}>
              <FaSignOutAlt size={16} aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </header>

        {showWelcome && (
          <section className="welcome">
            <div className="welcome-hero">
              <div className="welcome-hero__avatar" aria-hidden="true">
                {userInitial}
              </div>
              <h1 className="welcome-hero__greeting">
                Hola, <span className="welcome-hero__name">{displayName}</span>
              </h1>
              <p className="welcome-hero__subtitle">¿En qué puedo ayudarte hoy?</p>
            </div>

            <p className="welcome-description">
              Soy Mateo. Una IA estratégica para el control inteligente de tus ventas, compras y utilidades.
            </p>

            <div className="action-grid">
              {WELCOME_CARDS.map(({ icon: Icon, title, description }) => (
                <div key={title} className="action-btn">
                  <Icon size={20} className="action-btn__icon" />
                  <div className="action-btn__content">
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!showWelcome && (
          <div className="chat">
            <div className="chat-thread">
            {isLoadingMensajes && messages.length === 0 && (
              <div className="chat-status">Cargando mensajes…</div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.tipo}`}
              >
                {msg.tipo === 'ia' ? (
                  <>
                    <div className="message-bubble">
                      <FormattedMessage text={msg.texto} onOpenEmbed={openEmbed} />
                    </div>
                    <div className="message-meta">
                      <MateoSparkleAvatar />
                      {msg.createdAt && (
                        <time className="message-time" dateTime={msg.createdAt}>
                          {formatoHora(msg.createdAt)}
                        </time>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="message-bubble">{msg.texto}</div>
                    {msg.createdAt && (
                      <time className="message-time" dateTime={msg.createdAt}>
                        {formatoHora(msg.createdAt)}
                      </time>
                    )}
                  </>
                )}
              </div>
            ))}
            {isSending && (
              <div className="message ia message--typing" aria-live="polite" aria-label="Mateo está escribiendo">
                <MateoSparkleAvatar />
                <div className="typing-bubble">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
            </div>
          </div>
        )}

        <footer className="composer">
          <div className="composer-inner">
            <button className="composer-icon-btn" type="button" aria-label="Adjuntar archivo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 15V4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path d="M7.5 8 12 3.5 16.5 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 20h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribe tu mensaje..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="composer-icon-btn composer-icon-btn--voice" type="button" aria-label="Entrada de voz">
              <FaMicrophone size={18} />
            </button>
            <button
              className="composer-send"
              type="button"
              onClick={() => enviarMensaje()}
              disabled={isSending}
              aria-label="Enviar mensaje"
            >
              <svg width="15" height="15" viewBox="-1 -1 26 26" fill="none" aria-hidden="true">
                <path
                  d="m22 2-7 20-4-9-9-4 20-7Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d="M22 2 11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </footer>
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
