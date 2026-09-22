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
} from './pwa-install';

const listeners = new Set();

let state = {
  deferredPrompt: null,
  showUi: false,
  showBanner: false,
  showHint: false,
  isIOSDevice: false,
  isMobileDevice: false,
};

let started = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function assign(partial) {
  state = { ...state, ...partial };
  emit();
}

function bannerWasDismissed() {
  try {
    return sessionStorage.getItem(PWA_BANNER_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function canShowInstallUi() {
  return !isEmbeddedBrowser() && !isStandalonePwa();
}

function revealInstallUi(promptEvent) {
  if (!canShowInstallUi()) return;
  clearStoredInstalled();
  assign({
    deferredPrompt: promptEvent || getDeferredPrompt(),
    showUi: true,
    showBanner: !bannerWasDismissed(),
  });
}

function hideInstallUi(markInstalled = false) {
  assign({
    deferredPrompt: null,
    showUi: false,
    showBanner: false,
    showHint: false,
  });
  if (markInstalled) markPwaInstalled();
}

export function getPwaInstallSnapshot() {
  return state;
}

export function subscribePwaInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startPwaInstall() {
  if (typeof window === 'undefined' || started) return;
  started = true;

  assign({
    isMobileDevice: isMobileViewport(),
    isIOSDevice: isIosDevice(),
  });

  if (!canShowInstallUi()) {
    hideInstallUi(isStandalonePwa());
    return;
  }

  const existing = getDeferredPrompt();
  if (existing) {
    revealInstallUi(existing);
  } else if (state.isIOSDevice) {
    assign({
      showUi: true,
      showBanner: !bannerWasDismissed(),
    });
  }

  hasInstalledRelatedApp().then((installed) => {
    if (installed && !getDeferredPrompt() && canShowInstallUi()) {
      hideInstallUi(true);
    }
  });

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
}

export async function requestPwaInstall() {
  const promptEvent = state.deferredPrompt || consumeDeferredPrompt();
  if (promptEvent) {
    consumeDeferredPrompt();
    assign({ deferredPrompt: null });
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      hideInstallUi(true);
    }
    return;
  }
  assign({ showHint: true });
}

export function dismissPwaBanner() {
  assign({ showBanner: false });
  try {
    sessionStorage.setItem(PWA_BANNER_DISMISSED_KEY, '1');
  } catch {
    // ignore
  }
}

export function setPwaHint(showHint) {
  assign({ showHint });
}

if (typeof window !== 'undefined') {
  startPwaInstall();
}
