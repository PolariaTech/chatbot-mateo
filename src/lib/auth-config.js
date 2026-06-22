import { encodeSessionForUrl, getStoredSession, getWmsSessionPayload } from './auth-storage';

export const WMS_LOGIN_URL =
  process.env.NEXT_PUBLIC_WMS_LOGIN_URL || 'https://polaria-wms-web.vercel.app/';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function getWmsBaseUrl() {
  return WMS_LOGIN_URL.replace(/\/$/, '');
}

export function buildWmsReturnUrl() {
  const payload = getWmsSessionPayload();
  const session = getStoredSession();

  if (!payload || !session?.accessToken) {
    return WMS_LOGIN_URL;
  }

  const encoded = encodeSessionForUrl(payload);
  if (!encoded) return WMS_LOGIN_URL;

  return `${getWmsBaseUrl()}/dashboard#polaria-auth=${encoded}`;
}

export function redirectToWmsWithSession() {
  if (typeof window === 'undefined') return;

  window.location.href = buildWmsReturnUrl();
}

export function isDirectLoginEnabled() {
  if (process.env.NEXT_PUBLIC_ALLOW_DIRECT_LOGIN === 'true') return true;
  if (process.env.NEXT_PUBLIC_ALLOW_DIRECT_LOGIN === 'false') return false;

  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development';
  }

  return LOCAL_HOSTS.has(window.location.hostname);
}

export function redirectToWmsLogin() {
  if (typeof window === 'undefined' || isDirectLoginEnabled()) return;

  window.location.replace(WMS_LOGIN_URL);
}
