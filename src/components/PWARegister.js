"use client";

import { useEffect } from "react";
import { markPwaInstalled } from "../lib/pwa-install";

export default function PWARegister() {
  useEffect(() => {
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
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}
