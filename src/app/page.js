"use client";
import React, { useState, useRef, useEffect } from 'react';
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
          <span className="robot">🤖</span>
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
            <h2>🤖 Asistente Mateo</h2>
          </div>
          <button className="login-btn">Login con Google</button>
        </header>

        {showWelcome && (
          <section className="welcome">
            <div className="hero-robot">🤖</div>
            <h1>¿Cómo puedo ayudarte hoy?</h1>
            <div className="cards">
              <div className="card">⚡Consultas rápidas</div>
              <div className="card">📊 Análisis de datos</div>
              <div className="card">🤖 IA Empresarial</div>
              <div className="card">💻 Desarrollo</div>
            </div>
          </section>
        )}

        {!showWelcome && (
          <div className="chat">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.tipo}`}>
                {msg.tipo === 'ia' ? (
                  <>
                    <div className="message-header"> Mateo</div>
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
