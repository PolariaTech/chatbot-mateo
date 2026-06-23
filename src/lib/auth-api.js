const DEFAULT_API_BASE = 'https://polaria-wms-api.onrender.com';

function resolveApiBase() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw || raw === '/') return DEFAULT_API_BASE;

  try {
    const url = new URL(raw);
    if (!url.protocol.startsWith('http')) return DEFAULT_API_BASE;
    return url.origin;
  } catch {
    return DEFAULT_API_BASE;
  }
}

const API_BASE = resolveApiBase();

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.message)) return data.message.join('. ');
  if (typeof data.error === 'string') return data.error;
  return fallback;
}

function normalizeUser(rawUser = {}) {
  return {
    idUsuario: rawUser.idUsuario ?? rawUser.id ?? rawUser.userId ?? null,
    username: rawUser.username ?? rawUser.identificador ?? '',
    nombre: rawUser.nombre ?? rawUser.name ?? rawUser.username ?? '',
    codigoEmpresa: rawUser.codigoEmpresa ?? rawUser.codigo_empresa ?? null,
    email: rawUser.email ?? rawUser.correo ?? null,
    role: rawUser.role ?? rawUser.rol ?? rawUser.idRol ?? rawUser.nombreRol ?? null,
  };
}

function normalizeSession(data) {
  const accessToken = data.accessToken ?? data.access_token ?? data.token;
  const refreshToken = data.refreshToken ?? data.refresh_token ?? null;
  const context = data.context ?? null;
  const rawUser = data.user ?? data.usuario ?? data.context ?? data;
  const user = normalizeUser(rawUser);

  if (!accessToken) {
    throw new Error('La API no devolvió un token de acceso.');
  }

  return { accessToken, refreshToken, context, user };
}

async function request(
  path,
  { method = 'GET', body, token, includeCredentials = false, skipAuthClient = false } = {},
) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (!skipAuthClient) headers['X-Auth-Client'] = 'mateo';
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  if (includeCredentials) {
    options.credentials = 'include';
  }

  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, options);

  const data = await parseJsonResponse(response);

  return {
    ok: response.ok,
    status: response.status,
    data,
    error: response.ok ? null : extractErrorMessage(data, 'Error en la solicitud.'),
  };
}

export async function prelogin(identificador) {
  return request('/auth/prelogin', {
    method: 'POST',
    body: { identificador },
  });
}

export async function login({ username, password, codigoEmpresa }) {
  const body = { identificador: username, password };
  if (codigoEmpresa) body.codigoEmpresa = codigoEmpresa;

  const result = await request('/auth/login', {
    method: 'POST',
    body,
  });

  if (!result.ok) return result;

  try {
    let session = normalizeSession(result.data);
    const meResult = await fetchMe(session.accessToken);
    if (meResult.ok && meResult.user) {
      session = { ...session, user: meResult.user };
    }
    return { ...result, session };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      data: result.data,
      error: error.message,
    };
  }
}

export async function mateoHandoff(token) {
  return request('/auth/mateo-handoff', {
    method: 'POST',
    token,
    skipAuthClient: true,
  });
}

export async function exchangeMateoCode(code) {
  const result = await request('/auth/mateo-exchange', {
    method: 'POST',
    body: { code },
  });

  if (!result.ok) return result;

  try {
    return { ...result, session: normalizeSession(result.data) };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      data: result.data,
      error: error.message,
    };
  }
}

export async function fetchMe(token) {
  const result = await request('/auth/me', { token, includeCredentials: !token });
  if (!result.ok) return result;

  let session = null;
  try {
    session = normalizeSession(result.data);
  } catch {
    session = null;
  }

  return {
    ...result,
    user: normalizeUser(result.data?.user ?? result.data),
    session,
  };
}

export async function logout(token) {
  return request('/auth/logout', { method: 'POST', token, includeCredentials: !token });
}
