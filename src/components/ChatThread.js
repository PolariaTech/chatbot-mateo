'use client';

import React from 'react';
import FormattedMessage from './FormattedMessage';
import RouteChoice from './RouteChoice';
import DescargaOv from './DescargaOv';

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

function MensajeIa({ msg, esUltimo, isSending, openEmbed, enviarMensaje, accessToken }) {
  return (
    <>
      <MateoSparkleAvatar />
      <div className="message-col">
        <div className="message-bubble">
          <FormattedMessage text={msg.texto} onOpenEmbed={openEmbed} />
        </div>
        {msg.descarga && <DescargaOv pedido={msg.descarga} accessToken={accessToken} />}
        {msg.createdAt && (
          <time className="message-time" dateTime={msg.createdAt}>{formatoHora(msg.createdAt)}</time>
        )}
        {msg.elegirRuta && esUltimo && (
          <RouteChoice disabled={isSending} onElegir={enviarMensaje} />
        )}
      </div>
    </>
  );
}

function MensajeUsuario({ msg }) {
  return (
    <>
      <div className="message-bubble">{msg.texto}</div>
      {msg.createdAt && (
        <time className="message-time" dateTime={msg.createdAt}>{formatoHora(msg.createdAt)}</time>
      )}
    </>
  );
}

export default function ChatThread({
  isLoadingMensajes,
  messages,
  isSending,
  openEmbed,
  enviarMensaje,
  accessToken,
  chatEndRef,
}) {
  return (
    <div className="chat">
      <div className="chat-thread">
        {isLoadingMensajes && messages.length === 0 && (
          <div className="chat-status">Cargando mensajes…</div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.tipo}`}>
            {msg.tipo === 'ia' ? (
              <MensajeIa
                msg={msg}
                esUltimo={index === messages.length - 1}
                isSending={isSending}
                openEmbed={openEmbed}
                enviarMensaje={enviarMensaje}
                accessToken={accessToken}
              />
            ) : (
              <MensajeUsuario msg={msg} />
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
  );
}
