const CAMPOS_LINEA = new Set(['producto', 'codigo_producto', 'unidad', 'cantidad', 'precio']);
const CAMPOS_SUMA = new Set(['importe']);
const CAMPOS_REPETIDOS = new Set([
  'fecha_creacion',
  'fecha_entrega',
  'fecha_creacion_orden_trabajo',
  'fecha_pedido',
]);

export function esDetalle(columnas) {
  return (columnas || []).some((columna) => CAMPOS_LINEA.has(columna.campo));
}

export function claveTrabajo(fila) {
  const codigo = String(fila.orden_trabajo || '').trim();
  if (codigo) return codigo;
  return String(fila.almacen || '').trim();
}

function claveProducto(fila) {
  const codigo = String(fila.codigo_producto || '').trim();
  return codigo || String(fila.producto || '').trim();
}

function llaveGrupo(fila, columnas) {
  return columnas
    .filter((columna) => !CAMPOS_SUMA.has(columna.campo) && !CAMPOS_REPETIDOS.has(columna.campo))
    .filter((columna) => columna.campo !== 'cantidad_ot' && columna.campo !== 'productos_distintos')
    .map((columna) => (
      columna.campo === 'orden_trabajo' ? claveTrabajo(fila) : String(fila[columna.campo] ?? '')
    ))
    .join('\u0001');
}

function acumular(grupo, fila) {
  const trabajo = claveTrabajo(fila);
  const producto = claveProducto(fila);
  if (trabajo) grupo.trabajos.add(trabajo);
  if (producto) grupo.productos.add(producto);
  grupo.importe += Number(fila.importe) || 0;
}

export function consolidarLineas(lineas, columnas) {
  const grupos = new Map();
  (lineas || []).forEach((fila) => {
    const llave = llaveGrupo(fila, columnas);
    let grupo = grupos.get(llave);
    if (!grupo) {
      grupo = {
        fila: { ...fila, orden_trabajo: claveTrabajo(fila) || fila.orden_trabajo || '' },
        trabajos: new Set(),
        productos: new Set(),
        importe: 0,
      };
      grupos.set(llave, grupo);
    }
    acumular(grupo, fila);
  });
  return [...grupos.values()].map((grupo) => ({
    ...grupo.fila,
    importe: grupo.importe,
    cantidad_ot: grupo.trabajos.size,
    productos_distintos: grupo.productos.size,
  }));
}
