import { normalizar, periodoValido } from './descarga-ov.js';
import { COLUMNAS_OT, resolverColumnasOt } from './descarga-ot.js';
import { pedidoDesdeTexto as periodoOvDesdeTexto } from './descarga-ov-pedido.js';

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

function isoDia(anio, mes, dia) {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
    return '';
  }
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function fechaNatural(dia, mesNombre, anioTexto, hoy) {
  const mes = MESES[mesNombre];
  if (!mes) return '';
  const anio = anioTexto ? Number(anioTexto) : hoy.getFullYear();
  return isoDia(anio, mes, Number(dia));
}

export function mencionaOrdenesTrabajo(texto) {
  const normal = normalizar(texto);
  return /\b(orden(?:es)? de (?:tarea|trabajo)|pedidos? ot|\bot\b)\b/.test(normal);
}

function pideArchivo(normal) {
  return /\b(excel|archivo|descarga|descargame|xlsx|csv|extraer|exporta|exportar|entregame|entregar)\b/.test(normal);
}

function frasesDeColumnas() {
  return COLUMNAS_OT.flatMap((columna) => [columna.clave, ...columna.alias]
    .map((alias) => ({ clave: columna.clave, alias: normalizar(alias) }))
    .filter((item) => item.alias.length >= 4 || item.clave === 'modo'))
    .sort((a, b) => b.alias.length - a.alias.length);
}

function clavesMencionadas(normal) {
  let restante = ` ${normal.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ')} `;
  const claves = [];
  frasesDeColumnas().forEach((frase) => {
    const marca = ` ${frase.alias} `;
    if (!restante.includes(marca)) return;
    if (!claves.includes(frase.clave)) claves.push(frase.clave);
    restante = restante.split(marca).join(' ');
  });
  return claves;
}

function columnasDelTexto(normal) {
  const claves = clavesMencionadas(normal);
  if (claves.length < 2) {
    return resolverColumnasOt('').columnas.map((columna) => columna.clave);
  }
  return COLUMNAS_OT.map((columna) => columna.clave).filter((clave) => claves.includes(clave));
}

function diaSueltos(normal, hoy) {
  if (/\b\d{1,2}\s*(?:al|a|hasta)\s*\d{1,2}\b/.test(normal)) return null;
  if (/\b\d{4}-\d{2}-\d{2}\s*(?:al|a|hasta)\s*\d{4}-\d{2}-\d{2}\b/.test(normal)) return null;
  if (/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\s*(?:al|a|hasta)\s*\d{1,2}\/\d{1,2}/.test(normal)) return null;
  const match = normal.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/);
  if (!match) return null;
  const dia = fechaNatural(match[1], match[2], match[3], hoy);
  if (!periodoValido(dia, dia)) return null;
  return { inicio: dia, fin: dia };
}

function periodoDesdeTexto(texto, hoy) {
  const normal = normalizar(texto);
  const unDia = diaSueltos(normal, hoy);
  if (unDia) return unDia;
  const delOv = periodoOvDesdeTexto(texto, hoy);
  if (delOv?.inicio && delOv?.fin) {
    return { inicio: delOv.inicio, fin: delOv.fin };
  }
  return null;
}

export function pedidoOtDesdeTexto(texto, hoy = new Date()) {
  const normal = normalizar(texto);
  if (!mencionaOrdenesTrabajo(normal) || !pideArchivo(normal)) return null;
  const periodo = periodoDesdeTexto(texto, hoy);
  if (!periodo) return null;
  return {
    tipo: 'ot',
    inicio: periodo.inicio,
    fin: periodo.fin,
    columnas: columnasDelTexto(normal),
    desconocidas: [],
  };
}

export function pedidoOtDelTurno(marca, texto, hoy = new Date()) {
  const delUsuario = pedidoOtDesdeTexto(texto, hoy);
  if (delUsuario) return delUsuario;
  return marca?.tipo === 'ot' ? marca : null;
}
