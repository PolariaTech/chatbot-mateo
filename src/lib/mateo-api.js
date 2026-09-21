function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

function createApiError(data, status) {
  const error = new Error(data.error || 'Error al comunicarse con el servidor.');
  error.status = status;
  error.isSessionInvalid = status === 401;
  return error;
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createApiError(data, response.status);
  }
  return data;
}

export async function fetchConversaciones(accessToken) {
  const response = await fetch('/api/mateo/conversaciones', {
    headers: authHeaders(accessToken),
  });
  const data = await parseResponse(response);
  return data.conversaciones ?? [];
}

export async function createConversacion(accessToken, { codigoEmpresa } = {}) {
  const response = await fetch('/api/mateo/conversaciones', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ codigoEmpresa }),
  });
  const data = await parseResponse(response);
  return data.conversacion;
}

export async function fetchMensajes(accessToken, idConversacion) {
  const response = await fetch(`/api/mateo/conversaciones/${idConversacion}/mensajes`, {
    headers: authHeaders(accessToken),
  });
  const data = await parseResponse(response);
  return data.mensajes ?? [];
}

export async function deleteConversacion(accessToken, idConversacion) {
  const response = await fetch(`/api/mateo/conversaciones/${idConversacion}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  await parseResponse(response);
}

export async function saveMensaje(accessToken, idConversacion, payload) {
  const response = await fetch(`/api/mateo/conversaciones/${idConversacion}/mensajes`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(response);
  return data.mensaje;
}
