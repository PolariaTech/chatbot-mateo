'use client';

import React from 'react';
import { getDisplayInitial, getDisplayName } from '../lib/display-name';

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

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

function formatoHistorialFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = MESES[d.getMonth()];
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'p. m.' : 'a. m.';
  hours = hours % 12 || 12;
  return `${day} de ${month}, ${String(hours).padStart(2, '0')}:${minutes} ${suffix}`;
}

function PieUsuario({ isAuthenticated, user, userDomain }) {
  return (
    <div className="sidebar-footer">
      <div className="user-panel">
        <div className="avatar">{isAuthenticated ? getDisplayInitial(user) : '?'}</div>
        <div className="user-panel__info">
          <div className="user-name">{isAuthenticated ? getDisplayName(user) || 'Usuario' : 'Invitado'}</div>
          <div className="user-role">{isAuthenticated ? userDomain : 'Sin sesión'}</div>
        </div>
      </div>
    </div>
  );
}

function ListaHistorial({
  conversaciones,
  activeConversacionId,
  onAbrir,
  onEliminar,
}) {
  return conversaciones.map((conversacion) => (
    <div
      key={conversacion.idConversacion}
      className={`history-item${activeConversacionId === conversacion.idConversacion ? ' active' : ''}`}
    >
      <button
        type="button"
        className="history-item__open"
        onClick={() => onAbrir(conversacion.idConversacion)}
      >
        <span className="history-item__icon"><IconChat /></span>
        <span className="history-item__body">
          <span className="history-item__title">{conversacion.titulo || 'Nueva conversación'}</span>
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
        onClick={(event) => onEliminar(event, conversacion.idConversacion)}
        aria-label={`Eliminar ${conversacion.titulo || 'conversación'}`}
        title="Eliminar conversación"
      >
        <IconTrash />
      </button>
    </div>
  ));
}

export default function ChatSidebar({
  isMobile,
  isSidebarCollapsed,
  onToggle,
  onNuevoChat,
  onInicio,
  persistError,
  isLoadingConversaciones,
  conversaciones,
  activeConversacionId,
  onAbrir,
  onEliminar,
  isAuthenticated,
  user,
  userDomain,
}) {
  return (
    <>
      {isMobile && !isSidebarCollapsed && (
        <div className="sidebar-backdrop" onClick={onToggle} aria-hidden="true" />
      )}
      {isMobile && isSidebarCollapsed ? (
        <button className="menu-btn sidebar-open-btn" type="button" onClick={onToggle} aria-label="Abrir menú">
          <SidebarToggleIcon />
        </button>
      ) : null}
      <CuerpoSidebar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggle={onToggle}
        onNuevoChat={onNuevoChat}
        onInicio={onInicio}
        persistError={persistError}
        isLoadingConversaciones={isLoadingConversaciones}
        conversaciones={conversaciones}
        activeConversacionId={activeConversacionId}
        onAbrir={onAbrir}
        onEliminar={onEliminar}
        isAuthenticated={isAuthenticated}
        user={user}
        userDomain={userDomain}
      />
    </>
  );
}

function CuerpoSidebar({
  isSidebarCollapsed,
  onToggle,
  onNuevoChat,
  onInicio,
  persistError,
  isLoadingConversaciones,
  conversaciones,
  activeConversacionId,
  onAbrir,
  onEliminar,
  isAuthenticated,
  user,
  userDomain,
}) {
  return (
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <button className="menu-btn" type="button" onClick={onToggle} aria-label="Alternar menú">
            <SidebarToggleIcon />
          </button>
          <button className="brand-home" type="button" onClick={onInicio} aria-label="Ir al inicio">
            <span className="brand-name">Historial</span>
          </button>
        </div>
        <div className="sidebar-actions">
          <button className="new-chat" onClick={onNuevoChat} type="button">
            <span className="new-chat__icon"><IconPlus /></span>
            Nueva conversación
          </button>
        </div>
        {persistError && <div className="history-empty history-empty--error">{persistError}</div>}
        <div className="history polaria-scrollbar">
          {isLoadingConversaciones && conversaciones.length === 0 && (
            <div className="history-empty">Cargando conversaciones…</div>
          )}
          {!isLoadingConversaciones && conversaciones.length === 0 && (
            <div className="history-empty">Sin conversaciones aún</div>
          )}
          <ListaHistorial
            conversaciones={conversaciones}
            activeConversacionId={activeConversacionId}
            onAbrir={onAbrir}
            onEliminar={onEliminar}
          />
        </div>
        <PieUsuario isAuthenticated={isAuthenticated} user={user} userDomain={userDomain} />
      </aside>
  );
}
