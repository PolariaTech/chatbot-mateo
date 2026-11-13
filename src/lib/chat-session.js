import * as mateoApi from './mateo-api.js';
import { esEleccionRuta, leerEleccionRuta, marcarEleccionRuta, marcarRuta, modoDesdeHistorial } from './route-choice.js';
import { leerDescargaOv, marcarDescarga } from './descarga-ov.js';
import { leerDescargaOt, marcarDescargaOt } from './descarga-ot.js';
import { schemaDeEmpresa } from './reportes-schema.js';

const WEBHOOK_PRUEBA = 'https://polariatech.app.n8n.cloud/webhook-test/polaria';
const WEBHOOK_PRODUCCION = 'https://polariatech.app.n8n.cloud/webhook/polaria';
const EN_PRUEBA = false;

export function resolveWebhookUrl(_codigoEmpresa, entorno = process.env.NODE_ENV) {
  return EN_PRUEBA && entorno !== 'production' ? WEBHOOK_PRUEBA : WEBHOOK_PRODUCCION;
}

export function sortConversaciones(items) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function upsertConversacion(items, conversacion) {
  const rest = items.filter((item) => item.idConversacion !== conversacion.idConversacion);
  return sortConversaciones([conversacion, ...rest]);
}

export async function persistUserMessage({ canPersist, accessToken, ensureConversacion, texto }) {
  if (!canPersist) return null;

  const conversacionId = await ensureConversacion();
  await mateoApi.saveMensaje(accessToken, conversacionId, {
    rol: 'user',
    contenido: texto,
  });
  return conversacionId;
}

export async function persistAssistantMessage({
  canPersist,
  accessToken,
  conversacionId,
  contenido,
  tokensUsados,
  estado,
  refreshConversaciones,
}) {
  if (!canPersist || !conversacionId) return;

  await mateoApi.saveMensaje(accessToken, conversacionId, {
    rol: 'assistant',
    contenido,
    tokensUsados,
    estado,
  });
  await refreshConversaciones();
}

export function handleSessionInvalid(error, onSessionInvalid) {
  if (!error?.isSessionInvalid) return false;

  onSessionInvalid?.();
  return true;
}

export async function guardarTitulo({ yaAplicado, puedePersistir, idConversacion, actualizar }) {
  if (yaAplicado || !puedePersistir || !idConversacion) {
    return { aplicado: Boolean(yaAplicado), respuesta: null };
  }

  const respuesta = await actualizar();
  return { aplicado: true, respuesta };
}

export function atenderErrorAlGuardarTitulo(error, onSessionInvalid) {
  if (handleSessionInvalid(error, onSessionInvalid)) {
    return { cortarEnvio: true, mensaje: null };
  }

  return {
    cortarEnvio: false,
    mensaje: error?.message || 'No se pudo guardar el mensaje en Supabase.',
  };
}

export function recordarModo(modoActual, mensajes, existente) {
  if (modoActual === 'VENTAS' || modoActual === 'PEDIDOS') return modoActual;
  if (!existente) return modoActual || '';
  return modoDesdeHistorial(mensajes);
}

export function armarPayloadChat({ texto, conversacionId, existente, modo, soloRuta, user }) {
  return {
    message: texto,
    idConversacion: conversacionId,
    conversacionExistente: existente && modo !== 'PEDIDOS',
    modo: soloRuta ? '' : (modo || ''),
    soloRuta,
    schema: schemaDeEmpresa(user.schema) || 'public',
    usuario: {
      username: user.username,
      idUsuario: user.idUsuario,
      codigoEmpresa: user.codigoEmpresa,
      nombre: user.nombre,
    },
  };
}

function textoDeFalloN8n(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object' || cuerpo.output || cuerpo.reply) return '';
  const mensaje = String(cuerpo.message || '');
  if (cuerpo.code === 404 || /not registered/i.test(mensaje)) {
    return 'La prueba no está escuchando. En n8n pulsa Execute workflow y vuelve a enviar el mensaje.';
  }
  if (cuerpo.code && mensaje) return 'No pude obtener respuesta. Intenta de nuevo.';
  return '';
}

export function leerRespuestaAgente(data) {
  const responseBody = Array.isArray(data) ? data[0] : data;
  const fallo = textoDeFalloN8n(responseBody);
  if (fallo) {
    return { texto: fallo, elegirRuta: false, descarga: null, tokensUsados: null };
  }
  const respuestaIA = responseBody?.output
    ?? responseBody?.reply
    ?? data.output
    ?? data.reply
    ?? JSON.stringify(data);
  const descargaOt = leerDescargaOt(respuestaIA);
  const descargaOv = leerDescargaOv(descargaOt.texto);
  const leido = leerEleccionRuta(descargaOv.texto);
  return {
    texto: leido.texto,
    elegirRuta: leido.elegirRuta || responseBody?.elegirRuta === true || responseBody?.elegir_ruta === true,
    descarga: descargaOt.pedido || descargaOv.pedido,
    tokensUsados: data.tokensUsados ?? data.tokens_usados ?? null,
  };
}

export function contenidoConRuta(texto, elegirRuta, modo, descarga) {
  const conRuta = marcarRuta(elegirRuta ? marcarEleccionRuta(texto) : texto, modo);
  if (descarga?.tipo === 'ot') return marcarDescargaOt(conRuta, descarga);
  return marcarDescarga(conRuta, descarga);
}

export function tituloDeTurno(texto, mensajes) {
  const eleccion = esEleccionRuta(texto);
  const preguntaPrevia = [...mensajes].reverse().find(
    (mensaje) => mensaje.tipo === 'usuario' && !esEleccionRuta(mensaje.texto),
  );
  const titulo = eleccion ? preguntaPrevia?.texto : texto;
  if (!titulo || esEleccionRuta(titulo)) return '';
  return titulo;
}
