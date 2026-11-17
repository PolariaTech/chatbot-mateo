/** Intervalo de chequeo de versión en producción (REQ-293). */
export const PRODUCT_VERSION_CHECK_INTERVAL_MS = 60_000;

export const PRODUCT_VERSION_API_PATH = '/api/product-version';

/** SemVer del bundle. Tiene que coincidir con package.json en cada publicación. */
export const MATEO_PRODUCT_VERSION = '0.1.1';

export const TITULO_NUEVA_VERSION_PRODUCTO = 'Nueva versión';

export const MENSAJE_NUEVA_VERSION_PRODUCTO =
  'Hay una nueva versión en este momento. Actualiza la página para ver los últimos cambios.';

export const ETIQUETA_ACEPTAR_NUEVA_VERSION = 'Aceptar';
