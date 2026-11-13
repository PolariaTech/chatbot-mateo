const IDENTIFICADOR = /^[a-z_][a-z0-9_]*$/i;

export function schemaDeEmpresa(schemaName) {
  const nombre = String(schemaName || '').trim();
  return IDENTIFICADOR.test(nombre) ? nombre : '';
}
