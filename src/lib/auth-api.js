const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://polaria-wms-api.onrender.com';

const MATEO_CLIENT_HEADER = { 'X-Auth-Client': 'mateo' };

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
    role: rawUser.role ?? rawUser.rol ?? null,
  };
}

function normalizeSession(data) {
  const accessToken = data.accessToken ?? data.access_token ?? data.token;
  const refreshToken = data.refreshToken ?? data.refresh_token ?? null;
  const user = normalizeUser(data.user ?? data.usuario ?? data);

  if (!accessToken) {
    throw new Error('La API no devolvió un token de acceso.');
  }

  return { accessToken, refreshToken, user };
}

async function request(path, { method = 'GET', body, token, mateoClient = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (mateoClient) Object.assign(headers, MATEO_CLIENT_HEADER);
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonResponse(response);

  return {
    ok: response.ok,
    status: response.status,
    data,
    error: response.ok ? null : extractErrorMessage(data, 'Error en la solicitud.'),
  };
}

export function needsCompanyCode(status, data) {
  if (status !== 422) return false;

  const message = extractErrorMessage(data, '').toLowerCase();
  return (
    message.includes('empresa') ||
    message.includes('tenant') ||
    message.includes('codigo') ||
    data?.requiresCodigoEmpresa === true ||
    data?.requiresCompanyCode === true
  );
}

export async function prelogin(identificador, codigoEmpresa) {
  const body = { identificador };
  if (codigoEmpresa) body.codigoEmpresa = codigoEmpresa;

  return request('/auth/prelogin', { method: 'POST', body, mateoClient: true });
}

export async function login(identificador, password, codigoEmpresa) {
  const body = { identificador, password };
  if (codigoEmpresa) body.codigoEmpresa = codigoEmpresa;

  const result = await request('/auth/login', { method: 'POST', body, mateoClient: true });
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
  const result = await request('/auth/me', { token });
  if (!result.ok) return result;

  return {
    ...result,
    user: normalizeUser(result.data?.user ?? result.data),
  };
}

export async function logout(token) {
  return request('/auth/logout', { method: 'POST', token });
}
