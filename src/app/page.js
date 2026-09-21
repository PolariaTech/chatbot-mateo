"use client";
import React, { useState, useRef, useEffect } from 'react';
import LogoutForm from '../components/LogoutForm';
import MateoTopbar from '../components/MateoTopbar';
import SsoStatusScreen from '../components/SsoStatusScreen';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../lib/auth-config';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/LoginForm';
import { useChat } from '../hooks/useChat';
import FormattedMessage from '../components/FormattedMessage';
import EmbedPanel, { extractFirstUrl } from '../components/EmbedPanel';
import { registerEmbedUrl, releaseEmbedUrl } from '../lib/embed-registry';
import { getDisplayInitial, getDisplayName } from '../lib/display-name';

function OutlineIcon({ children }) {
  return (
    <svg
      className="action-btn__icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconInventario() {
  return (
    <OutlineIcon>
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <path d="m3.3 7 8.7 5 8.7-5" />
    </OutlineIcon>
  );
}

function IconNegocio() {
  return (
    <OutlineIcon>
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </OutlineIcon>
  );
}

function IconInformes() {
  return (
    <OutlineIcon>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 18v-2" />
      <path d="M12 18v-4" />
      <path d="M16 18v-6" />
    </OutlineIcon>
  );
}

function IconUtilidades() {
  return (
    <OutlineIcon>
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </OutlineIcon>
  );
}

function SidebarToggleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <line x1="6.5" y1="3" x2="6.5" y2="13" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MateoSparkleAvatar() {
  return (
    <div className="mateo-avatar" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M4.9685 7.74997C4.92386 7.57695 4.83367 7.41905 4.70731 7.29269C4.58095 7.16633 4.42304 7.07614 4.25 7.0315L1.1825 6.2405C1.13017 6.22565 1.0841 6.19412 1.0513 6.15072C1.01851 6.10732 1.00076 6.05441 1.00076 6C1.00076 5.9456 1.01851 5.89268 1.0513 5.84928C1.0841 5.80588 1.13017 5.77436 1.1825 5.7595L4.25 4.968C4.42298 4.92341 4.58084 4.83329 4.7072 4.70702C4.83356 4.58075 4.92378 4.42295 4.9685 4.25L5.7595 1.1825C5.77421 1.12996 5.80569 1.08367 5.84916 1.0507C5.89263 1.01772 5.94569 0.999878 6.00025 0.999878C6.05481 0.999878 6.10787 1.01772 6.15134 1.0507C6.19481 1.08367 6.2263 1.12996 6.241 1.1825L7.0315 4.25C7.07614 4.42304 7.16633 4.58095 7.29269 4.70731C7.41905 4.83367 7.57695 4.92386 7.74998 4.9685L10.8175 5.759C10.8703 5.77355 10.9168 5.80501 10.9499 5.84854C10.9831 5.89208 11.001 5.94528 11.001 6C11.001 6.05472 10.9831 6.10793 10.9499 6.15146C10.9168 6.19499 10.8703 6.22645 10.8175 6.241L7.74998 7.0315C7.57695 7.07614 7.41905 7.16633 7.29269 7.29269C7.16633 7.41905 7.07614 7.57695 7.0315 7.74997L6.2405 10.8175C6.2258 10.87 6.19431 10.9163 6.15084 10.9493C6.10737 10.9823 6.05431 11.0001 5.99975 11.0001C5.94519 11.0001 5.89213 10.9823 5.84866 10.9493C5.8052 10.9163 5.7737 10.87 5.759 10.8175L4.9685 7.74997Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.05"
        />
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

  const WELCOME_CARDS = [
    {
      icon: IconInventario,
      title: 'Consulta Instantánea de Inventarios',
      description: 'Información precisa y actualizada para decisiones rápidas.',
    },
    {
      icon: IconNegocio,
      title: 'Conocimiento y Gestión del Negocio',
      description: 'Insights diarios para una administración con visión de futuro.',
    },
    {
      icon: IconInformes,
      title: 'Disponibilidad Total de Informes',
      description: 'Acceso inmediato a informes detallados y listos para la toma de decisiones.',
    },
    {
      icon: IconUtilidades,
      title: 'Seguimiento de Utilidades en Tiempo Real',
      description: 'Visualiza márgenes, costos y rentabilidad con datos consolidados al instante.',
    },
  ];

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
      {isMobile && !isSidebarCollapsed && (
        <div className="sidebar-backdrop" onClick={toggleSidebar} aria-hidden="true" />
      )}
      {isMobile && isSidebarCollapsed ? (
        <button
          className="menu-btn sidebar-open-btn"
          type="button"
          onClick={toggleSidebar}
          aria-label="Abrir menú"
        >
          <SidebarToggleIcon />
        </button>
      ) : null}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <button
            className="menu-btn"
            type="button"
            onClick={toggleSidebar}
            aria-label="Alternar menú"
          >
            <SidebarToggleIcon />
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

        <div className="sidebar-actions">
          <button className="new-chat" onClick={handleNuevoChat} type="button">
            <span className="new-chat__icon">
              <IconPlus />
            </span>
            Nueva conversación
          </button>
        </div>

        {persistError && (
          <div className="history-empty history-empty--error">{persistError}</div>
        )}
        <div className="history polaria-scrollbar">
          {isLoadingConversaciones && conversaciones.length === 0 && (
            <div className="history-empty">Cargando conversaciones…</div>
          )}
          {!isLoadingConversaciones && conversaciones.length === 0 && (
            <div className="history-empty">Sin conversaciones aún</div>
          )}
          {conversaciones.map((conversacion) => (
            <div
              key={conversacion.idConversacion}
              className={`history-item${activeConversacionId === conversacion.idConversacion ? ' active' : ''}`}
            >
              <button
                type="button"
                className="history-item__open"
                onClick={() => handleAbrirConversacion(conversacion.idConversacion)}
              >
                <span className="history-item__icon">
                  <IconChat />
                </span>
                <span className="history-item__body">
                  <span className="history-item__title">
                    {conversacion.titulo || 'Nueva conversación'}
                  </span>
                  {(conversacion.updatedAt || conversacion.createdAt) && (
                    <span className="history-item__date">
                      {formatoHistorialFecha(conversacion.updatedAt || conversacion.createdAt)}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                className="history-item__delete"
                onClick={(event) => handleEliminarConversacion(
                  event,
                  conversacion.idConversacion,
                )}
                aria-label={`Eliminar ${conversacion.titulo || 'conversación'}`}
                title="Eliminar conversación"
              >
                <IconTrash />
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-panel">
            <div className="avatar">
              {isAuthenticated ? getDisplayInitial(user) : '?'}
            </div>
            <div className="user-panel__info">
              <div className="user-name">
                {isAuthenticated ? getDisplayName(user) || 'Usuario' : 'Invitado'}
              </div>
              <div className="user-role">
                {isAuthenticated ? userDomain : 'Sin sesión'}
              </div>
            </div>
          </div>
        </div>
      </aside>

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
              <p className="welcome-hero__subtitle">¿En qué puedo ayudarte hoy?</p>
            </div>

            <p className="welcome-description">
              Soy Mateo. Te ayudo a ver ventas, compras, márgenes e inventario por producto, y el estado de tus facturas.
            </p>

            <div className="action-grid">
              {WELCOME_CARDS.map(({ icon: Icon, title, description }) => (
                <div key={title} className="action-btn">
                  <span className="action-btn__icon-wrap">
                    <Icon />
                  </span>
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
                    <MateoSparkleAvatar />
                    <div className="message-col">
                      <div className="message-bubble">
                        <FormattedMessage text={msg.texto} onOpenEmbed={openEmbed} />
                      </div>
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
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribe tu mensaje..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Escribe tu mensaje"
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
