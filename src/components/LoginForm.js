'use client';

import { useState } from 'react';
import '../styles/auth.css';

export default function LoginForm({ onLogin, onPrelogin, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [showCompanyField, setShowCompanyField] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUsernameBlur = async () => {
    if (!onPrelogin || !username.trim() || showCompanyField) return;

    const result = await onPrelogin(username, codigoEmpresa);
    if (result.needsCompany) {
      setShowCompanyField(true);
      if (result.error) setError(result.error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = await onLogin(username, password, codigoEmpresa);

    setIsSubmitting(false);

    if (result.success) {
      onClose();
      return;
    }

    if (result.needsCompany) {
      setShowCompanyField(true);
    }

    setError(result.error);
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <form className="auth-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Iniciar sesión</h2>
        <p>Usa el mismo usuario y contraseña del ecosistema Polaria.</p>

        <div className="auth-field">
          <label htmlFor="login-username">Nombre de usuario</label>
          <input
            id="login-username"
            type="text"
            placeholder="tu_usuario"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            onBlur={handleUsernameBlur}
            autoComplete="username"
            autoFocus
          />
        </div>

        {showCompanyField && (
          <div className="auth-field">
            <label htmlFor="login-company">Código de empresa</label>
            <input
              id="login-company"
              type="text"
              placeholder="Código tenant"
              value={codigoEmpresa}
              onChange={(e) => {
                setCodigoEmpresa(e.target.value);
                setError('');
              }}
              autoComplete="organization"
            />
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button type="button" className="auth-btn auth-btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="auth-btn auth-btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
