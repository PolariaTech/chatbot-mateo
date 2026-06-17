"use client";
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import PolariaIcon from '../components/PolariaIcon';
import { useChat } from '../hooks/useChat';

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const chatEndRef = useRef(null);

  const {
    messages,
    history,
    inputValue,
    setInputValue,
    showWelcome,
    nuevoChat,
    enviarMensaje
  } = useChat();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      enviarMensaje();
    }
  };

  return (
    <div className="layout">
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
          <div className="avatar">M</div>
          <div>
            <div className="user-name">Mauricio</div>
            <div className="user-role">Administrador</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {isSidebarCollapsed && (
              <button className="icon-btn" onClick={toggleSidebar}>☰</button>
            )}
            <h2 className="topbar-title">
              <PolariaIcon size={22} />
              Asistente Mateo
            </h2>
          </div>
          <button className="login-btn">Login con Google</button>
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
             <div className="card-avatar card-avatar--sales">📈</div>
             <div className="card-content">
               <h3>¿Cómo van las ventas de hoy?</h3>
               <p>Revisa los ingresos del día y los productos más vendidos.</p>
             </div>
           </div>
       
           <div className="card-item">
             <div className="card-avatar card-avatar--purchases">🛒</div>
             <div className="card-content">
               <h3>Revisar últimas compras</h3>
               <p>Controla los gastos recientes y las cuentas con proveedores.</p>
             </div>
           </div>
       
         
       
           <div className="card-item">
             <div className="card-avatar card-avatar--reports">📊</div>
             <div className="card-content">
               <h3>Balance general del negocio</h3>
               <p>Analiza la relación entre compras y ventas para saber si tu negocio está siendo rentable.</p>
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
          <input
            type="text"
            placeholder="Pregunta cualquier cosa..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={enviarMensaje}>Enviar</button>
        </footer>
      </main>
    </div>
  );
}
