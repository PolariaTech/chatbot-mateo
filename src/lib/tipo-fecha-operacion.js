const ALIAS_TIPO_FECHA = {
  entrega: 'entrega',
  pedido: 'pedido',
  creacion: 'creacion',
  registro: 'creacion',
};

export const TIPOS_FECHA_OPERACION = [
  { id: 'entrega', etiqueta: 'Fecha de entrega' },
  { id: 'pedido', etiqueta: 'Fecha de pedido' },
  { id: 'creacion', etiqueta: 'Fecha de registro' },
];

export function tipoFechaOperacion(valor) {
  if (valor == null || String(valor).trim() === '') return 'entrega';
  return ALIAS_TIPO_FECHA[String(valor).trim().toLowerCase()] || '';
}

export function errorTipoFecha(valor) {
  if (tipoFechaOperacion(valor)) return '';
  return 'El tipo de fecha debe ser entrega, pedido o registro.';
}
