/**
 * El gate de versión solo corre en builds de producción
 * (no en `next dev` ni en tests).
 */
export function isProductVersionCheckEnabled(entorno = process.env.NODE_ENV) {
  return entorno === 'production';
}
