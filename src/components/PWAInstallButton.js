"use client";

import { FaDownload, FaShareSquare, FaTimes } from "react-icons/fa";
import { usePwaInstall } from "./PwaInstallProvider";

export default function PWAInstallButton({ variant = "icon" }) {
  const {
    showUi,
    showBanner,
    showHint,
    setShowHint,
    isIOSDevice,
    isMobileDevice,
    install,
    dismissBanner,
  } = usePwaInstall();

  if (variant === "banner") {
    if (!showBanner) return null;

    return (
      <div className="pwa-install-banner" role="dialog" aria-label="Instalar aplicación">
        <div className="pwa-install-banner__text">
          <strong>Instalar Polaria Mateo</strong>
          <span>Ábrela como aplicación, sin el navegador.</span>
        </div>
        <button type="button" className="pwa-install-banner__cta" onClick={install}>
          Instalar
        </button>
        <button
          type="button"
          className="pwa-install-banner__close"
          onClick={dismissBanner}
          aria-label="Cerrar"
        >
          <FaTimes size={14} aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (!showUi) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="polaria-topbar-btn polaria-topbar-btn--teal polaria-topbar-btn--icon-only"
        onClick={install}
        aria-label="Instalar app"
        title="Instalar app"
      >
        <FaDownload size={20} aria-hidden="true" />
      </button>

      {showHint && (
        <div className="install-hint-overlay" onClick={() => setShowHint(false)}>
          <div className="install-hint" onClick={(event) => event.stopPropagation()}>
            <h3>Instalar Polaria Mateo</h3>
            {isIOSDevice ? (
              <p>
                En Safari, toca el botón <FaShareSquare aria-hidden="true" /> Compartir
                y elige <strong>Agregar a pantalla de inicio</strong>.
              </p>
            ) : (
              <p>
                {isMobileDevice
                  ? "Abre el menú del navegador (⋮) y elige Instalar app o Agregar a pantalla de inicio."
                  : "Usa el icono de instalación en la barra de direcciones de tu navegador."}
              </p>
            )}
            <button type="button" className="install-hint__close" onClick={() => setShowHint(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
