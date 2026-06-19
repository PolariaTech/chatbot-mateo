import { useState } from 'react';

const WEBHOOK_URL = 'https://polariatech.app.n8n.cloud/webhook/chat';

export function useChat({ user, isAuthenticated, onRequireLogin } = {}) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  const nuevoChat = () => {
    setMessages([]);
    setShowWelcome(true);
  };

  const enviarMensaje = async () => {
    const texto = inputValue.trim();
    if (!texto) return;

    if (!isAuthenticated || !user) {
      onRequireLogin?.();
      return;
    }

    setShowWelcome(false);
    setInputValue('');

    const nuevosMensajes = [...messages, { tipo: 'usuario', texto }];
    setMessages(nuevosMensajes);
    setHistory((prev) => [texto.substring(0, 30), ...prev]);

    const payload = {
      message: texto,
      usuario: {
        username: user.username,
        idUsuario: user.idUsuario,
        codigoEmpresa: user.codigoEmpresa,
        nombre: user.nombre,
      },
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const respuestaIA = data.output ?? data.reply ?? JSON.stringify(data);

      setMessages([...nuevosMensajes, { tipo: 'ia', texto: respuestaIA }]);
    } catch {
      setMessages([
        ...nuevosMensajes,
        { tipo: 'ia', texto: 'Error al conectar con el servidor.' },
      ]);
    }
  };

  return {
    messages,
    history,
    inputValue,
    setInputValue,
    showWelcome,
    nuevoChat,
    enviarMensaje,
  };
}
