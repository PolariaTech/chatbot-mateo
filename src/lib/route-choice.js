export const ELEGIR_RUTA_MARK = '[[ELEGIR_RUTA]]';

export const RUTA_OPCIONES = [
  {
    id: 'VENTAS',
    texto: 'Ventas',
    numero: '1',
    titulo: 'Ventas',
  },
  {
    id: 'PEDIDOS',
    texto: 'Pedidos',
    numero: '2',
    titulo: 'Pedidos',
  },
];

const PALABRAS_RUTA = new Set([
  'venta',
  'ventas',
  '1',
  'pedido',
  'pedidos',
  '2',
  'orden de venta',
  'ordenes de venta',
  'nueva conversacion',
]);

export function normalizarRuta(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function esEleccionRuta(texto) {
  return PALABRAS_RUTA.has(normalizarRuta(texto));
}

export function modoDesdeTexto(texto) {
  const normalizado = normalizarRuta(texto);
  if (normalizado === 'venta' || normalizado === 'ventas' || normalizado === '1') return 'VENTAS';
  if (
    normalizado === 'pedido'
    || normalizado === 'pedidos'
    || normalizado === '2'
    || normalizado === 'orden de venta'
    || normalizado === 'ordenes de venta'
  ) return 'PEDIDOS';
  return '';
}

export function esTituloDeRuta(titulo) {
  return !String(titulo || '').trim() || esEleccionRuta(titulo);
}

export function tituloDesdePregunta(texto) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= 80) return limpio;
  return `${limpio.slice(0, 77).trimEnd()}…`;
}

const RUTA_MARK = /\[\[RUTA:(VENTAS|PEDIDOS)\]\]/g;

export function leerRutaGuardada(texto) {
  const match = String(texto || '').match(/\[\[RUTA:(VENTAS|PEDIDOS)\]\]/);
  return match ? match[1] : '';
}

export function marcarRuta(texto, modo) {
  const limpio = String(texto || '').replace(RUTA_MARK, '').trim();
  if (modo !== 'VENTAS' && modo !== 'PEDIDOS') return limpio;
  return `${limpio}\n[[RUTA:${modo}]]`;
}

export function modoDesdeHistorial(mensajes) {
  const lista = Array.isArray(mensajes) ? mensajes : [];

  for (const mensaje of lista) {
    if (mensaje?.modoRuta === 'PEDIDOS' || mensaje?.modoRuta === 'VENTAS') return mensaje.modoRuta;
    const normalizado = normalizarRuta(mensaje?.texto);
    if (normalizado.includes('seguimos por pedidos')) return 'PEDIDOS';
    if (normalizado.includes('seguimos por ventas')) return 'VENTAS';
  }

  if (lista.some((mensaje) => mensaje?.elegirRuta)) return '';

  for (const mensaje of lista) {
    if (mensaje?.tipo !== 'usuario') continue;
    const modo = modoDesdeTexto(mensaje.texto);
    if (modo) return modo;
    break;
  }

  return 'VENTAS';
}

export function leerEleccionRuta(texto) {
  const raw = String(texto || '').replace(RUTA_MARK, '');
  const elegirRuta = raw.includes(ELEGIR_RUTA_MARK);
  return {
    texto: raw.replaceAll(ELEGIR_RUTA_MARK, '').trim(),
    elegirRuta,
  };
}

export function marcarEleccionRuta(texto) {
  const limpio = leerEleccionRuta(texto).texto;
  return `${limpio}\n${ELEGIR_RUTA_MARK}`;
}
