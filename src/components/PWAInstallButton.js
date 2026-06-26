"use client";

import { useEffect, useState } from "react";
import { FaDownload, FaShareSquare } from "react-icons/fa";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream
  );
}

export default function PWAInstallButton({ compact = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      return;
    }

    const mobile = window.matchMedia("(max-width: 768px)").matches;
    setIsMobileDevice(mobile);

    if (isIOS()) {
      setIsIOSDevice(true);
      setVisible(true);
      return;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (mobile) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setVisible(false);
      }

      setDeferredPrompt(null);
      return;
    }

    setShowHint(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={`outline-btn${compact ? " outline-btn--compact" : ""}`}
        onClick={handleInstall}
        aria-label="Instalar app"
      >
        <FaDownload aria-hidden="true" />
        {!compact && <span>Instalar</span>}
      </button>

      {showHint && (
        <div className="install-hint-overlay" onClick={() => setShowHint(false)}>
          <div className="install-hint" onClick={(event) => event.stopPropagation()}>
            <h3>Instalar Polaria AI</h3>
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
