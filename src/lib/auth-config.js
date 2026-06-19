export const WMS_LOGIN_URL =
  process.env.NEXT_PUBLIC_WMS_LOGIN_URL || 'https://polaria-wms-web.vercel.app/';

export function redirectToWmsLogin() {
  if (typeof window !== 'undefined') {
    window.location.replace(WMS_LOGIN_URL);
  }
}
