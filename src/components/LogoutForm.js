'use client';

import '../styles/auth.css';

export default function LogoutForm({ user, onLogout, onClose }) {
  const displayAccount = user?.email || user?.username || user?.nombre || 'tu cuenta';

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogout();
    onClose();
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <form
        className="auth-form auth-form--dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="auth-form__header">
          <div className="auth-form__heading">
            <span className="auth-form__label">Sesión</span>
            <h2>Cerrar sesión</h2>
          </div>
        </div>

        <div className="auth-form__divider" aria-hidden="true" />

        <div className="auth-form__body">
          <p>
            ¿Seguro que deseas salir de la cuenta <strong>{displayAccount}</strong>?
          </p>
        </div>

        <div className="auth-form__divider" aria-hidden="true" />

        <div className="auth-actions">
          <button type="button" className="auth-btn auth-btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="auth-btn auth-btn--primary">
            Cerrar sesión
          </button>
        </div>
      </form>
    </div>
  );
}
