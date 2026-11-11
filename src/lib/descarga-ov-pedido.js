import { COLUMNAS_OV, normalizar, periodoValido, resolverColumnas } from './descarga-ov.js';

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

function clavesPorDefecto() {
  return resolverColumnas('').columnas.map((columna) => columna.clave);
}

function isoDia(anio, mes, dia) {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return '';
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function fechaNatural(dia, mesNombre, anioTexto, hoy) {
  const mes = MESES[mesNombre];
  if (!mes) return '';
  const anio = anioTexto ? Number(anioTexto) : hoy.getFullYear();
  return isoDia(anio, mes, Number(dia));
}

function frasesDeColumnas() {
  return COLUMNAS_OV.flatMap((columna) => [columna.clave, ...columna.alias]
    .map((alias) => ({ clave: columna.clave, alias: normalizar(alias) }))
    .filter((item) => item.alias.length >= 5 || item.clave === 'id' || item.clave === 'total'))
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
  if (claves.length < 2) return clavesPorDefecto();
  return COLUMNAS_OV.map((columna) => columna.clave).filter((clave) => claves.includes(clave));
}

function armarPedido(inicio, fin, normal) {
  if (!periodoValido(inicio, fin)) return null;
  return {
    todo: false,
    inicio,
    fin,
    fecha: 'pedido',
    columnas: columnasDelTexto(normal),
    desconocidas: [],
  };
}

function leerRango(normal, hoy) {
  const isoRango = normal.match(/(\d{4}-\d{2}-\d{2})\s*(?:al|a|hasta)\s*(\d{4}-\d{2}-\d{2})/);
  if (isoRango) return armarPedido(isoRango[1], isoRango[2], normal);

  const dosMeses = normal.match(/(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\s*(?:al|a|hasta)\s*(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (dosMeses) {
    return armarPedido(
      fechaNatural(dosMeses[1], dosMeses[2], dosMeses[3], hoy),
      fechaNatural(dosMeses[4], dosMeses[5], dosMeses[6], hoy),
      normal,
    );
  }
  return null;
}

function leerBarras(normal, hoy) {
  const conAnio = normal.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:al|a|hasta)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (conAnio) {
    return armarPedido(
      isoDia(Number(conAnio[3]), Number(conAnio[2]), Number(conAnio[1])),
      isoDia(Number(conAnio[6]), Number(conAnio[5]), Number(conAnio[4])),
      normal,
    );
  }
  const sinAnio = normal.match(/(\d{1,2})\/(\d{1,2})\s*(?:al|a|hasta)\s*(\d{1,2})\/(\d{1,2})(?!\/\d)/);
  if (!sinAnio) return null;
  const anio = hoy.getFullYear();
  return armarPedido(
    isoDia(anio, Number(sinAnio[2]), Number(sinAnio[1])),
    isoDia(anio, Number(sinAnio[4]), Number(sinAnio[3])),
    normal,
  );
}

function leerPeriodo(normal, hoy) {
  const barras = leerBarras(normal, hoy);
  if (barras) return barras;
  const rango = leerRango(normal, hoy);
  if (rango) return rango;
  const mismoMes = normal.match(/(\d{1,2})\s*(?:al|a|hasta)\s*(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (!mismoMes) return null;
  return armarPedido(
    fechaNatural(mismoMes[1], mismoMes[3], mismoMes[4], hoy),
    fechaNatural(mismoMes[2], mismoMes[3], mismoMes[4], hoy),
    normal,
  );
}

function mesNombrado(normal, hoy) {
  const match = normal.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b(?:\s+de\s+(\d{4}))?/);
  if (!match) return null;
  const mes = MESES[match[1]];
  const anio = match[2] ? Number(match[2]) : hoy.getFullYear();
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return armarPedido(isoDia(anio, mes, 1), isoDia(anio, mes, ultimo), normal);
}

const INICIO_TODAS = '2000-01-01';
const FIN_TODAS = '2099-12-31';

export function tieneNumeroDeOrden(texto) {
  const normal = normalizar(texto);
  if (/\b(?:ov|ot)[\s-]*\d{3,}\b/.test(normal)) return true;
  return /\b\d{8,}\b/.test(normal);
}

function pideTodas(normal) {
  if (tieneNumeroDeOrden(normal)) return false;
  return /\b(todas|todos|todo)\b/.test(normal) && /\b(ov|orden|ordenes|pedido|pedidos)\b/.test(normal);
}

function pideTodo(normal) {
  if (pideTodas(normal)) return true;
  return /\b(quiero todo|lo quiero todo|dame todo|desde el inicio|desde siempre|de todos los tiempos|inicio de los tiempos|todo el historial|todo el historico|sin limite de fecha)\b/.test(normal);
}

function mencionaOrdenes(normal) {
  return /\b(ov|orden|ordenes|pedido|pedidos|ventas)\b/.test(normal);
}

function pideArchivo(normal) {
  if (pideTodo(normal)) return true;
  if (/\b(excel|archivo|descarga|descargame|xlsx|csv|extraer|exporta|exportar)\b/.test(normal)) return true;
  return /\b(todas|todos)\b/.test(normal) && mencionaOrdenes(normal);
}

function esConfirmacion(normal) {
  return /^(si|sip|ok|okay|dale|claro|listo|por favor|adelante|hazlo|confirmo|de acuerdo|va|esta bien)( por favor)?$/.test(normal);
}

function pedidoTodo(normal) {
  return {
    todo: false,
    inicio: INICIO_TODAS,
    fin: FIN_TODAS,
    fecha: 'pedido',
    columnas: columnasDelTexto(normal),
    desconocidas: [],
  };
}

function periodoDeTexto(texto, hoy) {
  const normal = normalizar(texto);
  return leerPeriodo(normal, hoy) || mesNombrado(normal, hoy);
}

export function pedidoDesdeTexto(texto, hoy = new Date()) {
  const normal = normalizar(texto);
  if (tieneNumeroDeOrden(normal)) return null;
  const periodo = leerPeriodo(normal, hoy) || mesNombrado(normal, hoy);
  if (periodo && (pideArchivo(normal) || mencionaOrdenes(normal))) return periodo;
  if (!pideArchivo(normal)) return null;
  return pideTodo(normal) ? pedidoTodo(normal) : null;
}

function textoPrevio(previo) {
  return typeof previo === 'string' ? previo : previo?.texto;
}

function textosDelPedido(texto, anteriores) {
  const textos = [String(texto || '')];
  if (!esConfirmacion(normalizar(texto))) return textos;
  const previos = [...(anteriores || [])].reverse();
  for (const previo of previos) {
    if (previo?.tipo && previo.tipo !== 'usuario') continue;
    const valor = textoPrevio(previo);
    if (valor) textos.push(valor);
    break;
  }
  return textos;
}

function indicoAnio(texto, anteriores) {
  return textosDelPedido(texto, anteriores).some((item) => /\b\d{4}\b/.test(normalizar(item)));
}

function conAnioEnCurso(pedido, hoy) {
  if (!pedido?.inicio || !pedido?.fin) return pedido;
  if (pedido.inicio === INICIO_TODAS && pedido.fin === FIN_TODAS) return pedido;
  const anio = String(hoy.getFullYear());
  const inicio = `${anio}${String(pedido.inicio).slice(4)}`;
  let fin = `${anio}${String(pedido.fin).slice(4)}`;
  if (fin < inicio) fin = `${Number(anio) + 1}${String(pedido.fin).slice(4)}`;
  return { ...pedido, inicio, fin, fecha: 'pedido' };
}

function conColumnasDeMarca(pedido, marca, texto, anteriores) {
  if (!pedido || !marca?.columnas?.length) return pedido;
  const pidio = textosDelPedido(texto, anteriores)
    .some((item) => clavesMencionadas(normalizar(item)).length >= 2);
  if (pidio) return pedido;
  return { ...pedido, columnas: marca.columnas, desconocidas: marca.desconocidas || [] };
}

export function pedidoDelTurno(marca, texto, anteriores, hoy = new Date()) {
  if (tieneNumeroDeOrden(texto)) return null;
  const delUsuario = pedidoDesdeConversacion(texto, anteriores, hoy);
  const pedido = conColumnasDeMarca(delUsuario || marca || null, marca, texto, anteriores);
  if (!pedido || indicoAnio(texto, anteriores)) return pedido;
  return conAnioEnCurso(pedido, hoy);
}

export function ajustarDescargas(mensajes, hoy = new Date()) {
  return (mensajes || []).map((mensaje, indice) => {
    if (mensaje?.tipo !== 'ia' || !mensaje.descarga) return mensaje;
    const anteriores = mensajes.slice(0, indice);
    const ultimo = [...anteriores].reverse().find((item) => !item?.tipo || item.tipo === 'usuario');
    if (mensaje.descarga.tipo === 'ot') return mensaje;
    const pedido = pedidoDelTurno(mensaje.descarga, ultimo?.texto || '', anteriores, hoy);
    return pedido ? { ...mensaje, descarga: pedido } : mensaje;
  });
}

export function pedidoDesdeConversacion(texto, anteriores, hoy = new Date()) {
  const directo = pedidoDesdeTexto(texto, hoy);
  if (directo) return directo;
  if (!pideArchivo(normalizar(texto)) && !esConfirmacion(normalizar(texto))) return null;
  const previos = [...(anteriores || [])].reverse();
  for (const previo of previos) {
    if (previo?.tipo && previo.tipo !== 'usuario') continue;
    const pedido = pedidoDesdeTexto(textoPrevio(previo), hoy) || periodoDeTexto(textoPrevio(previo), hoy);
    if (pedido) return pedido;
  }
  return null;
}
