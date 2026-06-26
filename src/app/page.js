"use client";
import React, { useState, useRef, useEffect } from 'react';
import PolariaIcon from '../components/PolariaIcon';
import LogoutForm from '../components/LogoutForm';
import PWAInstallButton from '../components/PWAInstallButton';
import WmsLinkButton from '../components/WmsLinkButton';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../lib/auth-config';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/LoginForm';
import { useChat } from '../hooks/useChat';
import FormattedMessage from '../components/FormattedMessage';

import {
  FaPenSquare,
  FaWarehouse,
  FaBrain,
  FaChartBar,
  FaChartLine,
  FaPaperclip,
  FaMicrophone,
  FaPaperPlane,
  FaSignOutAlt,
} from 'react-icons/fa';
import { HiSparkles, HiBars3 } from 'react-icons/hi2';

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutForm, setShowLogoutForm] = useState(false);
  const chatEndRef = useRef(null);

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
  }, [messages]);

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

  const toggleSidebar = () => {
    setIsSidebarCollapsed((collapsed) => !collapsed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      enviarMensaje();
    }
  };

  const displayName = isAuthenticated ? (user.nombre || user.username || 'Usuario') : 'Usuario';
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

  return (
    <div className="layout">
      {isMobile && !isSidebarCollapsed && (
        <div className="sidebar-backdrop" onClick={toggleSidebar} aria-hidden="true" />
      )}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <button
            className="outline-btn outline-btn--icon"
            type="button"
            onClick={toggleSidebar}
            aria-label="Alternar menú"
          >
            <HiBars3 size={18} />
          </button>
          <PolariaIcon size={22} className="brand-icon" />
          <span className="brand-name">Polaria AI</span>
        </div>

        <button className="new-chat outline-btn" onClick={nuevoChat} type="button">
          <FaPenSquare size={16} />
          Nuevo chat
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
              onClick={() => abrirConversacion(conversacion.idConversacion)}
            >
              {conversacion.titulo || 'Nueva conversación'}
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
                className="outline-btn outline-btn--icon"
                type="button"
                onClick={toggleSidebar}
                aria-label="Abrir menú"
              >
                <HiBars3 size={18} />
              </button>
            )}
            <h2 className="topbar-title">
              <PolariaIcon size={22} />
              Mateo IA
            </h2>
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
              <div className="welcome-hero__icon">
                <HiSparkles size={28} />
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
            {isLoadingMensajes && messages.length === 0 && (
              <div className="chat-status">Cargando mensajes…</div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.tipo}${msg.tipo === 'ia' ? ' message--formatted' : ''}`}
              >
                {msg.tipo === 'ia' ? (
                  <>
                    <div className="message-header">
                      <PolariaIcon size={18} />
                      Mateo
                    </div>
                    <FormattedMessage text={msg.texto} />
                  </>
                ) : (
                  msg.texto
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        <footer className="composer">
          <div className="composer-inner">
            <button className="composer-icon-btn" type="button" aria-label="Adjuntar archivo">
              <FaPaperclip size={18} />
            </button>
            <input
              type="text"
              placeholder="Escribe un mensaje a Mateo IA..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="composer-icon-btn" type="button" aria-label="Entrada de voz">
              <FaMicrophone size={18} />
            </button>
            <button
              className="composer-send"
              type="button"
              onClick={() => enviarMensaje()}
              disabled={isSending}
              aria-label="Enviar mensaje"
            >
              <FaPaperPlane size={16} />
            </button>
          </div>
          <p className="composer-disclaimer">
            Mateo IA puede cometer errores. Verifica la información importante.
          </p>
        </footer>
      </main>

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
