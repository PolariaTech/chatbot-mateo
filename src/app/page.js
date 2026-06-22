"use client";
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import PolariaIcon from '../components/PolariaIcon';
import LogoutForm from '../components/LogoutForm';
import PWAInstallButton from '../components/PWAInstallButton';
import WmsLinkButton from '../components/WmsLinkButton';
import { isDirectLoginEnabled, redirectToWmsLogin } from '../lib/auth-config';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/LoginForm';
import { useChat } from '../hooks/useChat';
import FormattedMessage from '../components/FormattedMessage';

import { FaWarehouse, FaBrain , FaChartBar  } from 'react-icons/fa';

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutForm, setShowLogoutForm] = useState(false);
  const chatEndRef = useRef(null);

  const { user, isAuthenticated, isReady, logout, applySession } = useAuth();
  const allowDirectLogin = isDirectLoginEnabled();

  const {
    messages,
    history,
    inputValue,
    setInputValue,
    showWelcome,
    nuevoChat,
    enviarMensaje
  } = useChat({
    user,
    isAuthenticated,
    onRequireLogin: redirectToWmsLogin,
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
          <button className="icon-btn" onClick={toggleSidebar}>☰</button>
          <PolariaIcon size={22} className="brand-icon" />
          <span>Polaria AI</span>
        </div>

        <button className="new-chat" onClick={nuevoChat}>+ Nuevo Chat</button>

        <div className="section-title">Conversaciones</div>
        <div className="history">
          {history.map((item, index) => (
            <div key={index} className="history-item">{item}</div>
          ))}
        </div>

        <div className="user-panel">
          <div className="avatar">
            {isAuthenticated ? (user.nombre || user.username || '?').charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <div className="user-name">
              {isAuthenticated ? user.nombre || user.username : 'Invitado'}
            </div>
            <div className="user-role">
              {isAuthenticated ? user.role || user.codigoEmpresa || 'Usuario' : 'Sin sesión'}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {(isSidebarCollapsed || isMobile) && (
              <button className="icon-btn" onClick={toggleSidebar} aria-label="Abrir menú">☰</button>
            )}
            <h2 className="topbar-title">
              <PolariaIcon size={22} />
              Mateo IA
            </h2>
          </div>
          <div className="topbar-actions">
            <WmsLinkButton compact={isMobile} />
            <PWAInstallButton compact={isMobile} />
            <button className="login-btn" onClick={() => setShowLogoutForm(true)}>
              Cerrar sesión
            </button>
          </div>
        </header>

        {showWelcome && (
         <section className="welcome">
         <div className="hero-logo">
           <Image
             src="/images/logo.png"
             alt="Polaria AI"
             width={360}
             height={90}
             priority
             className="hero-logo__img"
           />
         </div>
         
         <h1>¿Cómo puedo ayudarte hoy?</h1>
         
         {/* Subtítulo descriptivo sobre lo que hace Mateo */}
         <p className="welcome-subtitle">
            Soy Mateo. Una IA estratégica para el control inteligente de tus ventas, compras y utilidades.
         </p>
       
         {/* Contenedor de tarjetas adaptado al estilo de lista de image_36b6df.png */}
         <div className="cards-list">
           
           <div className="card-item">
             <div className="card-avatar card-avatar--sales"> <FaWarehouse size={24} /></div>
             <div className="card-content">
               <h3>Consulta Instantánea de Inventarios</h3>
               <p>Información precisa y actualizada para decisiones rápidas.</p>
             </div>
           </div>
       
           <div className="card-item">
             <div className="card-avatar card-avatar--purchases"> <FaBrain size={24} /></div>
             <div className="card-content">
               <h3>Conocimiento y Gestión del Negocio</h3>
               <p>Insights diarios para una administración con visión de futuro.</p>
             </div>
           </div>
       
         
       
           <div className="card-item">
             <div className="card-avatar card-avatar--reports"><FaChartBar size={24} /></div>
             <div className="card-content">
               <h3>Disponibilidad Total de Informes</h3>
               <p>Acceso inmediato a informes detallados y listos para la toma de decisiones.</p>
             </div>
           </div>
       
         </div>
       </section>
        )}

        {!showWelcome && (
          <div className="chat">
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
            <input
              type="text"
              placeholder="Pregunta cualquier cosa..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={enviarMensaje}>Enviar</button>
          </div>
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
