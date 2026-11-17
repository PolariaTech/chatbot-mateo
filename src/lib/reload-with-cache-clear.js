async function limpiarCache(cachesApi) {
  if (!cachesApi?.keys) return true;
  const nombres = await cachesApi.keys();
  await Promise.all(nombres.map((nombre) => cachesApi.delete(nombre)));
  return true;
}

async function quitarServiceWorkers(contenedor) {
  if (!contenedor?.getRegistrations) return true;
  const registros = await contenedor.getRegistrations();
  await Promise.all(registros.map((registro) => registro.unregister()));
  return true;
}

/**
 * Limpia Cache Storage y service workers, y recarga con cache-bust
 * para tomar el bundle nuevo (REQ-293). Si el navegador niega el caché
 * o el service worker, la recarga sigue igual.
 */
export async function reloadWithCacheClear(
  ubicacion = typeof window !== 'undefined' ? window.location : undefined,
  cachesApi = globalThis.caches,
  contenedorServiceWorker = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined,
) {
  const cacheLimpio = await limpiarCache(cachesApi).catch(() => false);
  const workersQuitados = await quitarServiceWorkers(contenedorServiceWorker).catch(() => false);

  if (!ubicacion?.href || typeof ubicacion.replace !== 'function') {
    throw new Error('No hay página para recargar.');
  }

  const siguiente = new URL(ubicacion.href);
  siguiente.searchParams.set('_pv', String(Date.now()));
  ubicacion.replace(siguiente.toString());
  return { cacheLimpio, workersQuitados };
}
