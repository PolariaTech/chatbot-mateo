'use client';

import '../styles/auth.css';

export default function LogoutForm({ user, onLogout, onClose }) {
  const displayName = user?.nombre || user?.username || user?.email || 'tu cuenta';

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogout();
    onClose();
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <form className="auth-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Cerrar sesión</h2>
        <p>
          ¿Seguro que deseas salir de la cuenta <strong>{displayName}</strong>?
        </p>

        <div className="auth-actions">
          <button type="button" className="auth-btn auth-btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="auth-btn auth-btn--danger">
            Cerrar sesión
          </button>
        </div>
      </form>
    </div>
  );
}
