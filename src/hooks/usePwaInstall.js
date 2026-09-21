import { useCallback, useEffect, useState } from 'react';
import {
  PWA_BANNER_DISMISSED_KEY,
  clearStoredInstalled,
  consumeDeferredPrompt,
  getDeferredPrompt,
  hasInstalledRelatedApp,
  isEmbeddedBrowser,
  isIosDevice,
  isMobileViewport,
  isStandalonePwa,
  markPwaInstalled,
  readStoredInstalled,
} from '../lib/pwa-install';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showUi, setShowUi] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const mobile = isMobileViewport();
    const ios = isIosDevice();
    setIsMobileDevice(mobile);
    setIsIOSDevice(ios);

    const revealInstallUi = (promptEvent) => {
      clearStoredInstalled();
      setDeferredPrompt(promptEvent || getDeferredPrompt());
      setShowUi(true);
      if (mobile) {
        try {
          if (sessionStorage.getItem(PWA_BANNER_DISMISSED_KEY) !== '1') {
            setShowBanner(true);
          }
        } catch {
          setShowBanner(true);
        }
      }
    };

    const hideInstallUi = (markInstalled = false) => {
      setShowUi(false);
      setShowBanner(false);
      setDeferredPrompt(null);
      if (markInstalled) markPwaInstalled();
    };

    let cancelled = false;

    (async () => {
      if (isEmbeddedBrowser() || isStandalonePwa()) {
        if (!cancelled) hideInstallUi(isStandalonePwa());
        return;
      }

      const existing = getDeferredPrompt();
      if (existing) {
        if (!cancelled) revealInstallUi(existing);
        return;
      }

      if (await hasInstalledRelatedApp()) {
        if (!cancelled) hideInstallUi(true);
        return;
      }

      // iOS never fires beforeinstallprompt; show share instructions.
      if (ios) {
        if (cancelled) return;
        setShowUi(true);
        if (mobile) {
          try {
            if (sessionStorage.getItem(PWA_BANNER_DISMISSED_KEY) !== '1') {
              setShowBanner(true);
            }
          } catch {
            setShowBanner(true);
          }
        }
        return;
      }

      // Android/Chrome: wait for beforeinstallprompt. If it never fires, the app
      // is already installed or not eligible — do not flash a fake banner.
      if (readStoredInstalled()) {
        setShowUi(false);
        setShowBanner(false);
      }
    })();

    const onPrompt = () => revealInstallUi(getDeferredPrompt());
    const onInstalled = () => hideInstallUi(true);
    const onDisplayMode = (event) => {
      if (event.matches) hideInstallUi(true);
    };

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      window.__mateoPwa = window.__mateoPwa || {};
      window.__mateoPwa.deferredPrompt = event;
      onPrompt();
    };

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    window.addEventListener('mateo-pwa-prompt', onPrompt);
    window.addEventListener('mateo-pwa-installed', onInstalled);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    if (standaloneQuery.addEventListener) {
      standaloneQuery.addEventListener('change', onDisplayMode);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('mateo-pwa-prompt', onPrompt);
      window.removeEventListener('mateo-pwa-installed', onInstalled);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      if (standaloneQuery.removeEventListener) {
        standaloneQuery.removeEventListener('change', onDisplayMode);
      }
    };
  }, []);

  const install = useCallback(async () => {
    const promptEvent = deferredPrompt || consumeDeferredPrompt();
    if (promptEvent) {
      consumeDeferredPrompt();
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        setShowUi(false);
        setShowBanner(false);
        markPwaInstalled();
      }
      return;
    }
    setShowHint(true);
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    try {
      sessionStorage.setItem(PWA_BANNER_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  return {
    showUi,
    showBanner,
    showHint,
    setShowHint,
    isIOSDevice,
    isMobileDevice,
    install,
    dismissBanner,
  };
}
