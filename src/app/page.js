"use client";
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import PolariaIcon from '../components/PolariaIcon';
import LoginForm from '../components/LoginForm';
import LogoutForm from '../components/LogoutForm';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';

import { FaWarehouse, FaBrain , FaChartBar  } from 'react-icons/fa';

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showLogoutForm, setShowLogoutForm] = useState(false);
  const chatEndRef = useRef(null);

  const { user, isAuthenticated, login, logout, prelogin } = useAuth();

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
    onRequireLogin: () => setShowLoginForm(true),
  });

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
              Asistente Mateo
            </h2>
          </div>
          {isAuthenticated ? (
            <button className="login-btn" onClick={() => setShowLogoutForm(true)}>
              Cerrar sesión
            </button>
          ) : (
            <button className="login-btn" onClick={() => setShowLoginForm(true)}>
              Iniciar sesión
            </button>
          )}
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
              <div key={index} className={`message ${msg.tipo}`}>
                {msg.tipo === 'ia' ? (
                  <>
                    <div className="message-header">
                      <PolariaIcon size={18} />
                      Mateo
                    </div>
                    <div>{msg.texto}</div>
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
              placeholder={
                isAuthenticated
                  ? 'Pregunta cualquier cosa...'
                  : 'Inicia sesión para chatear con Mateo...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={enviarMensaje}>Enviar</button>
          </div>
        </footer>
      </main>

      {showLoginForm && (
        <LoginForm
          onLogin={login}
          onPrelogin={prelogin}
          onClose={() => setShowLoginForm(false)}
        />
      )}
      {showLogoutForm && isAuthenticated && (
        <LogoutForm
          user={user}
          onLogout={logout}
          onClose={() => setShowLogoutForm(false)}
        />
      )}
    </div>
  );
}
