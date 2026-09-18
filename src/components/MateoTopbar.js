"use client";

import { FaSignOutAlt } from "react-icons/fa";
import PWAInstallButton from "./PWAInstallButton";
import WmsLinkButton from "./WmsLinkButton";

export default function MateoTopbar({
  onHome,
  onLogout,
}) {
  return (
    <header className="polaria-topbar">
      <div className="polaria-topbar__inner">
        <div className="polaria-topbar__grid">
          <div className="polaria-topbar__start">
            <button
              type="button"
              className="polaria-topbar__logo-btn"
              onClick={onHome}
              aria-label="Ir al inicio"
            >
              <img
                src="/mateo-ia-logo.png"
                alt="Mateo IA"
                width={220}
                height={48}
                className="polaria-topbar__logo"
              />
            </button>
          </div>

          <div className="polaria-topbar__center" aria-hidden />

          <div className="polaria-topbar__end">
            <WmsLinkButton />
            <PWAInstallButton />
            <button
              type="button"
              onClick={onLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="polaria-topbar-btn polaria-topbar-btn--danger polaria-topbar-btn--icon-only"
            >
              <FaSignOutAlt size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <div className="polaria-topbar-divider" aria-hidden />
    </header>
  );
}
