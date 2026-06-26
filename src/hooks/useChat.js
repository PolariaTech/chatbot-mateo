import { useCallback, useEffect, useRef, useState } from 'react';
import * as mateoApi from '../lib/mateo-api';

const WEBHOOK_URL = 'https://polariatech.app.n8n.cloud/webhook/chat';

function sortConversaciones(items) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function upsertConversacion(items, conversacion) {
  const rest = items.filter((item) => item.idConversacion !== conversacion.idConversacion);
  return sortConversaciones([conversacion, ...rest]);
}

async function persistUserMessage({ canPersist, accessToken, ensureConversacion, texto }) {
  if (!canPersist) return null;

  const conversacionId = await ensureConversacion();
  await mateoApi.saveMensaje(accessToken, conversacionId, {
    rol: 'user',
    contenido: texto,
  });
  return conversacionId;
}

async function persistAssistantMessage({
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

function handleSessionInvalid(error, onSessionInvalid) {
  if (!error?.isSessionInvalid) return false;

  onSessionInvalid?.();
  return true;
}

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
    setMessages([]);
    setActiveConversacionId(null);
    setInputValue('');
    setShowWelcome(true);
    setPersistError(null);
  };

  const abrirConversacion = useCallback(
    async (idConversacion) => {
      if (!canPersist) return;

      setActiveConversacionId(idConversacion);
      setShowWelcome(false);
      setIsLoadingMensajes(true);

      try {
        const mensajes = await mateoApi.fetchMensajes(accessToken, idConversacion);
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

  const enviarMensaje = async (textoOverride) => {
    const texto = (typeof textoOverride === 'string' ? textoOverride : inputValue).trim();
    if (!texto || isSending) return;

    if (!isAuthenticated || !user) {
      onRequireLogin?.();
      return;
    }

    setShowWelcome(false);
    setInputValue('');
    setIsSending(true);

    const nuevosMensajes = [...messages, { tipo: 'usuario', texto }];
    setMessages(nuevosMensajes);

    let conversacionId = activeConversacionId;

    try {
      conversacionId = await persistUserMessage({
        canPersist,
        accessToken,
        ensureConversacion,
        texto,
      });
      setPersistError(null);
    } catch (error) {
      if (handleSessionInvalid(error, () => onSessionInvalidRef.current?.())) return;
      setPersistError(error.message || 'No se pudo guardar el mensaje en Supabase.');
    }

    try {
      const payload = {
        message: texto,
        idConversacion: conversacionId,
        usuario: {
          username: user.username,
          idUsuario: user.idUsuario,
          codigoEmpresa: user.codigoEmpresa,
          nombre: user.nombre,
        },
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const responseBody = Array.isArray(data) ? data[0] : data;
      const respuestaIA =
        responseBody?.output ??
        responseBody?.reply ??
        data.output ??
        data.reply ??
        JSON.stringify(data);
      const tokensUsados = data.tokensUsados ?? data.tokens_usados ?? null;

      setMessages([...nuevosMensajes, { tipo: 'ia', texto: respuestaIA }]);

      try {
        await persistAssistantMessage({
          canPersist,
          accessToken,
          conversacionId,
          contenido: respuestaIA,
          tokensUsados,
          estado: response.ok ? 'ok' : 'error',
          refreshConversaciones,
        });
      } catch (error) {
        if (handleSessionInvalid(error, () => onSessionInvalidRef.current?.())) return;
        setPersistError(error.message || 'No se pudo guardar la respuesta en Supabase.');
      }
    } catch {
      const errorTexto = 'Error al conectar con el servidor.';
      setMessages([...nuevosMensajes, { tipo: 'ia', texto: errorTexto, estado: 'error' }]);

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
    abrirConversacion,
    enviarMensaje,
  };
}
