import { useCallback, useEffect, useRef, useState } from 'react';
import {
  armarPayloadChat,
  atenderErrorAlGuardarTitulo,
  contenidoConRuta,
  guardarTitulo,
  handleSessionInvalid,
  leerRespuestaAgente,
  persistAssistantMessage,
  persistUserMessage,
  recordarModo,
  resolveWebhookUrl,
  sortConversaciones,
  tituloDeTurno,
  upsertConversacion,
} from '../lib/chat-session';
import * as mateoApi from '../lib/mateo-api';
import { esEleccionRuta, modoDesdeHistorial, modoDesdeTexto } from '../lib/route-choice';

export function useChat({
  user,
  accessToken,
  isAuthenticated,
  onRequireLogin,
  onSessionInvalid,
} = {}) {
  const [messages, setMessages] = useState([]);
  const [conversaciones, setConversaciones] = useState([]);
  const [activeConversacionId, setActiveConversacionId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoadingConversaciones, setIsLoadingConversaciones] = useState(false);
  const [isLoadingMensajes, setIsLoadingMensajes] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [persistError, setPersistError] = useState(null);

  const canPersist = Boolean(accessToken);
  const onSessionInvalidRef = useRef(onSessionInvalid);
  const conversacionExistenteRef = useRef(false);
  const rutaConfirmadaRef = useRef(false);
  const modoRutaRef = useRef('');
  const tituloAplicadoRef = useRef(false);

  useEffect(() => {
    onSessionInvalidRef.current = onSessionInvalid;
  }, [onSessionInvalid]);

  const refreshConversaciones = useCallback(async () => {
    if (!canPersist) return;

    setIsLoadingConversaciones(true);
    try {
      const items = await mateoApi.fetchConversaciones(accessToken);
      setConversaciones(sortConversaciones(items));
      setPersistError(null);
    } catch (error) {
      if (handleSessionInvalid(error, () => onSessionInvalidRef.current?.())) return;
      setPersistError(error.message || 'No se pudo cargar el historial.');
    } finally {
      setIsLoadingConversaciones(false);
    }
  }, [accessToken, canPersist]);

  useEffect(() => {
    if (!isAuthenticated || !canPersist) {
      setConversaciones([]);
      return;
    }

    refreshConversaciones();
  }, [isAuthenticated, canPersist, refreshConversaciones]);

  const ensureConversacion = useCallback(async () => {
    if (activeConversacionId) return activeConversacionId;

    const conversacion = await mateoApi.createConversacion(accessToken, {
      codigoEmpresa: user?.codigoEmpresa,
    });

    setActiveConversacionId(conversacion.idConversacion);
    setConversaciones((prev) => upsertConversacion(prev, conversacion));
    return conversacion.idConversacion;
  }, [accessToken, activeConversacionId, user?.codigoEmpresa]);

  const nuevoChat = () => {
    conversacionExistenteRef.current = false;
    rutaConfirmadaRef.current = false;
    modoRutaRef.current = '';
    tituloAplicadoRef.current = false;
    setMessages([]);
    setActiveConversacionId(null);
    setInputValue('');
    setShowWelcome(true);
    setPersistError(null);
  };

  const mostrarInicio = () => {
    conversacionExistenteRef.current = false;
    rutaConfirmadaRef.current = false;
    modoRutaRef.current = '';
    tituloAplicadoRef.current = false;
    setMessages([]);
    setActiveConversacionId(null);
    setInputValue('');
    setShowWelcome(true);
    setPersistError(null);
  };

  const abrirConversacion = useCallback(
    async (idConversacion) => {
      if (!canPersist) return;

      conversacionExistenteRef.current = true;
      tituloAplicadoRef.current = false;
      setActiveConversacionId(idConversacion);
      setShowWelcome(false);
      setIsLoadingMensajes(true);

      try {
        const mensajes = await mateoApi.fetchMensajes(accessToken, idConversacion);
        const modo = modoDesdeHistorial(mensajes);
        modoRutaRef.current = modo;
        rutaConfirmadaRef.current = modo === 'VENTAS' || modo === 'PEDIDOS';
        setMessages(mensajes);
        setPersistError(null);
      } catch (error) {
        if (handleSessionInvalid(error, () => onSessionInvalidRef.current?.())) return;
        setPersistError(error.message || 'No se pudo cargar la conversación.');
        setMessages([
          {
            tipo: 'ia',
            texto: 'No se pudo cargar la conversación.',
            estado: 'error',
          },
        ]);
      } finally {
        setIsLoadingMensajes(false);
      }
    },
    [accessToken, canPersist],
  );

  const eliminarConversacion = useCallback(
    async (idConversacion) => {
      if (!canPersist || !idConversacion) return;

      try {
        await mateoApi.deleteConversacion(accessToken, idConversacion);
        setConversaciones((prev) => prev.filter((item) => item.idConversacion !== idConversacion));
        setPersistError(null);

        if (activeConversacionId === idConversacion) {
          conversacionExistenteRef.current = false;
          rutaConfirmadaRef.current = false;
          modoRutaRef.current = '';
          tituloAplicadoRef.current = false;
          setMessages([]);
          setActiveConversacionId(null);
          setInputValue('');
          setShowWelcome(true);
        }
      } catch (error) {
        if (handleSessionInvalid(error, () => onSessionInvalidRef.current?.())) return;
        setPersistError(error.message || 'No se pudo eliminar la conversación.');
      }
    },
    [accessToken, activeConversacionId, canPersist],
  );

  const aplicarTitulo = async (idConversacion, titulo) => {
    const resultado = await guardarTitulo({
      yaAplicado: tituloAplicadoRef.current,
      puedePersistir: canPersist,
      idConversacion,
      actualizar: () => mateoApi.actualizarTitulo(accessToken, idConversacion, titulo),
    });
    if (!resultado.aplicado) return;

    tituloAplicadoRef.current = true;
    if (resultado.respuesta?.conversacion) {
      setConversaciones((prev) => upsertConversacion(prev, resultado.respuesta.conversacion));
    }
  };

  const enviarMensaje = async (textoOverride) => {
    const texto = (typeof textoOverride === 'string' ? textoOverride : inputValue).trim();
    if (!texto || isSending) return;

    if (!isAuthenticated || !user) {
      onRequireLogin?.();
      return;
    }

    const elegido = modoDesdeTexto(texto);
    const hayPreguntaPrevia = messages.some(
      (mensaje) => mensaje.tipo === 'usuario' && !esEleccionRuta(mensaje.texto),
    );
    const soloRuta = Boolean(elegido) && !conversacionExistenteRef.current && !hayPreguntaPrevia;
    if (elegido && modoRutaRef.current !== 'VENTAS' && modoRutaRef.current !== 'PEDIDOS') {
      modoRutaRef.current = elegido;
      rutaConfirmadaRef.current = true;
    } else {
      modoRutaRef.current = recordarModo(
        modoRutaRef.current,
        messages,
        conversacionExistenteRef.current,
      );
      rutaConfirmadaRef.current = modoRutaRef.current === 'VENTAS' || modoRutaRef.current === 'PEDIDOS';
    }

    setShowWelcome(false);
    setInputValue('');
    setIsSending(true);

    const ahora = new Date().toISOString();
    const nuevosMensajes = [...messages, { tipo: 'usuario', texto, createdAt: ahora }];
    setMessages(nuevosMensajes);

    let conversacionId = activeConversacionId;

    try {
      conversacionId = await persistUserMessage({
        canPersist,
        accessToken,
        ensureConversacion,
        texto,
      });
      if (esEleccionRuta(texto) && !conversacionExistenteRef.current) {
        rutaConfirmadaRef.current = true;
      }
      const rutaLista = rutaConfirmadaRef.current || conversacionExistenteRef.current;
      const titulo = tituloDeTurno(texto, messages);
      if (rutaLista && titulo) {
        await aplicarTitulo(conversacionId, titulo);
      }
      setPersistError(null);
    } catch (error) {
      const atencion = atenderErrorAlGuardarTitulo(error, () => onSessionInvalidRef.current?.());
      if (atencion.cortarEnvio) return;
      setPersistError(atencion.mensaje);
    }

    try {
      const payload = armarPayloadChat({
        texto,
        conversacionId,
        existente: conversacionExistenteRef.current,
        modo: modoRutaRef.current,
        soloRuta,
        user,
      });

      const response = await fetch(resolveWebhookUrl(user.codigoEmpresa), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const leido = leerRespuestaAgente(data);

      setMessages([
        ...nuevosMensajes,
        { tipo: 'ia', texto: leido.texto, elegirRuta: leido.elegirRuta, createdAt: new Date().toISOString() },
      ]);

      try {
        await persistAssistantMessage({
          canPersist,
          accessToken,
          conversacionId,
          contenido: contenidoConRuta(leido.texto, leido.elegirRuta, modoRutaRef.current),
          tokensUsados: leido.tokensUsados,
          estado: response.ok ? 'ok' : 'error',
          refreshConversaciones,
        });
      } catch (error) {
        if (handleSessionInvalid(error, () => onSessionInvalidRef.current?.())) return;
        setPersistError(error.message || 'No se pudo guardar la respuesta en Supabase.');
      }
    } catch {
      const errorTexto = 'Error al conectar con el servidor.';
      setMessages([...nuevosMensajes, { tipo: 'ia', texto: errorTexto, estado: 'error', createdAt: new Date().toISOString() }]);

      try {
        await persistAssistantMessage({
          canPersist,
          accessToken,
          conversacionId,
          contenido: errorTexto,
          estado: 'error',
          refreshConversaciones,
        });
      } catch {
        // El mensaje de error ya se muestra en pantalla.
      }
    } finally {
      setIsSending(false);
    }
  };

  return {
    messages,
    conversaciones,
    activeConversacionId,
    inputValue,
    setInputValue,
    showWelcome,
    isLoadingConversaciones,
    isLoadingMensajes,
    isSending,
    persistError,
    nuevoChat,
    mostrarInicio,
    abrirConversacion,
    eliminarConversacion,
    enviarMensaje,
  };
}
