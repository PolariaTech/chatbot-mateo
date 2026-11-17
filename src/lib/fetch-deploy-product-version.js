import { PRODUCT_VERSION_API_PATH } from './product-version-constants.js';

/**
 * Lee la versión del deploy actual. Si falla la red o el JSON, devuelve null
 * para no mostrar una alerta falsa.
 */
export async function fetchDeployProductVersion(fetchImpl = fetch) {
  try {
    const response = await fetchImpl(PRODUCT_VERSION_API_PATH, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = await response.json();
    const version = typeof body?.version === 'string' ? body.version.trim() : '';
    return version || null;
  } catch {
    return null;
  }
}
