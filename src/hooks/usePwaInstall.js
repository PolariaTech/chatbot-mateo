import { useEffect, useSyncExternalStore } from 'react';
import {
  dismissPwaBanner,
  getPwaInstallSnapshot,
  requestPwaInstall,
  setPwaHint,
  startPwaInstall,
  subscribePwaInstall,
} from '../lib/pwa-install-store';

const emptySnapshot = {
  deferredPrompt: null,
  showUi: false,
  showBanner: false,
  showHint: false,
  isIOSDevice: false,
  isMobileDevice: false,
};

export function usePwaInstallState() {
  const snapshot = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallSnapshot,
    () => emptySnapshot
  );

  useEffect(() => {
    startPwaInstall();
  }, []);

  return {
    ...snapshot,
    setShowHint: setPwaHint,
    install: requestPwaInstall,
    dismissBanner: dismissPwaBanner,
  };
}
