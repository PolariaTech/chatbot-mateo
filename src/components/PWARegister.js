"use client";

import { useEffect } from "react";
import { markPwaInstalled, allowScreenRotation } from "../lib/pwa-install";

export default function PWARegister() {
  useEffect(() => {
    allowScreenRotation();

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("No se pudo registrar el service worker:", error);
      }
    };

    registerServiceWorker();

    const onInstalled = () => markPwaInstalled();
    const onFirstGesture = () => {
      allowScreenRotation();
      window.removeEventListener("pointerdown", onFirstGesture);
    };
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("pointerdown", onFirstGesture);
    };
  }, []);

  return null;
}
