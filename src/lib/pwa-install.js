export const PWA_INSTALLED_KEY = 'mateo-pwa-installed';
export const PWA_BANNER_DISMISSED_KEY = 'mateo-pwa-banner-dismissed';

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  );
}

export function isIosDevice() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

export function isEmbeddedBrowser() {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function allowScreenRotation() {
  const orientation = typeof screen !== 'undefined' ? screen.orientation : null;
  if (!orientation) return;

  try {
    orientation.unlock?.();
  } catch {
    // ignore
  }

  if (typeof orientation.lock !== 'function') return;
  try {
    await orientation.lock('any');
  } catch {
    try {
      await orientation.lock('natural');
    } catch {
      // Some browsers only allow this after a tap.
    }
  }
}

export function readStoredInstalled() {
  try {
    return localStorage.getItem(PWA_INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markPwaInstalled() {
  try {
    localStorage.setItem(PWA_INSTALLED_KEY, '1');
  } catch {
    // ignore
  }
}

export function clearStoredInstalled() {
  try {
    localStorage.removeItem(PWA_INSTALLED_KEY);
  } catch {
    // ignore
  }
}

export function getDeferredPrompt() {
  if (typeof window === 'undefined') return null;
  return window.__mateoPwa?.deferredPrompt || null;
}

export function consumeDeferredPrompt() {
  const promptEvent = getDeferredPrompt();
  if (typeof window !== 'undefined' && window.__mateoPwa) {
    window.__mateoPwa.deferredPrompt = null;
  }
  return promptEvent;
}

export async function hasInstalledRelatedApp() {
  if (typeof navigator === 'undefined' || !navigator.getInstalledRelatedApps) {
    return false;
  }
  try {
    const apps = await navigator.getInstalledRelatedApps();
    return Array.isArray(apps) && apps.length > 0;
  } catch {
    return false;
  }
}
