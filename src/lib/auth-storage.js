const STORAGE_KEY = 'polaria-auth';

const LEGACY_STORAGE_KEY = 'polaria_session';

const KNOWN_SESSION_KEYS = [
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  'auth_session',
  'authSession',
  'session',
  'userSession',
  'polaria_auth',
  'wms_session',
  'wmsSession',
];

const TOKEN_KEYS = ['accessToken', 'access_token', 'token', 'jwt'];
const REFRESH_TOKEN_KEYS = ['refreshToken', 'refresh_token'];
const USER_KEYS = ['user', 'usuario', 'currentUser', 'authUser'];

const AUTH_STORAGE_KEYS = [
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  'auth_session',
  'authSession',
  'session',
  'userSession',
  'polaria_auth',
  'wms_session',
  'wmsSession',
  ...TOKEN_KEYS,
  ...REFRESH_TOKEN_KEYS,
  ...USER_KEYS,
];

function readJson(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pickValue(source, keys) {
  for (const key of keys) {
    if (source?.[key]) return source[key];
  }

  return null;
}

function asObject(value) {
  return value && typeof value === 'object' ? value : null;
}

function getSessionSources(rawSession) {
  const root = asObject(rawSession);
  if (!root) return [];

  const state = asObject(root.state);
  const session = asObject(root.session);
  const auth = asObject(root.auth);
  const data = asObject(root.data);

  return [state, session, auth, data, root].filter(Boolean);
}

function isExpired(source) {
  const expiresAt = source?.expiresAt ?? source?.expires_at ?? source?.expiration ?? source?.exp;
  if (!expiresAt) return false;

  const expiresAtMs = typeof expiresAt === 'number' ? expiresAt : Date.parse(String(expiresAt));
  const normalizedExpiresAtMs = expiresAtMs < 10000000000 ? expiresAtMs * 1000 : expiresAtMs;

  return Number.isFinite(normalizedExpiresAtMs) && normalizedExpiresAtMs <= Date.now();
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;

  const [, payload] = token.split('.');
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function normalizeUser(rawUser = {}) {
  const user = rawUser ?? {};

  return {
    idUsuario: user.idUsuario ?? user.id ?? user.userId ?? user.sub ?? null,
    username: user.username ?? user.identificador ?? user.preferred_username ?? user.email ?? '',
    nombre: user.nombre ?? user.name ?? user.username ?? user.preferred_username ?? '',
    codigoEmpresa: user.codigoEmpresa ?? user.codigo_empresa ?? user.companyCode ?? user.tenant ?? null,
    email: user.email ?? user.correo ?? null,
    role: user.role ?? user.rol ?? null,
  };
}

function normalizeStoredSession(rawSession) {
  if (!rawSession || typeof rawSession !== 'object') return null;

  const sources = getSessionSources(rawSession);
  const source = sources.find((item) => pickValue(item, TOKEN_KEYS));
  if (!source || isExpired(source)) return null;

  const accessToken = pickValue(source, TOKEN_KEYS);
  const refreshToken = pickValue(source, REFRESH_TOKEN_KEYS);
  const rawContext =
    sources.map((item) => item.context).find((item) => item && typeof item === 'object') ?? null;
  const rawUser =
    sources.map((item) => pickValue(item, USER_KEYS)).find(Boolean) ??
    sources.find((item) => item.email || item.correo || item.username || item.identificador) ??
    decodeJwtPayload(accessToken) ??
    null;

  if (!accessToken) return null;

  const user = rawUser && typeof rawUser === 'object' ? normalizeUser(rawUser) : null;
  const context = rawContext && typeof rawContext === 'object' ? rawContext : null;

  return {
    accessToken,
    refreshToken: refreshToken ?? null,
    context,
    user: user && (user.idUsuario || user.username || user.nombre || user.email) ? user : null,
  };
}

function getStorageAreas() {
  if (typeof window === 'undefined') return [];

  return [localStorage, sessionStorage];
}

function getStoredJson(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return null;

  return readJson(raw) ?? raw;
}

function findSessionByKnownKeys(storage) {
  for (const key of KNOWN_SESSION_KEYS) {
    const session = normalizeStoredSession(getStoredJson(storage, key));
    if (session) return session;
  }

  return null;
}

function findSessionBySeparateKeys(storage) {
  const session = {
    accessToken: null,
    refreshToken: null,
    user: null,
  };

  for (const key of TOKEN_KEYS) {
    session.accessToken = storage.getItem(key);
    if (session.accessToken) break;
  }

  for (const key of REFRESH_TOKEN_KEYS) {
    session.refreshToken = storage.getItem(key);
    if (session.refreshToken) break;
  }

  for (const key of USER_KEYS) {
    const user = normalizeUser(readJson(storage.getItem(key)));
    if (user.username || user.idUsuario) {
      session.user = user;
      break;
    }
  }

  return session.accessToken && session.user ? session : null;
}

export function buildContextFromUser(user, context = null) {
  if (context?.idUsuario && context?.scope) return context;
  if (!user && !context) return null;

  const scope = context?.scope ?? (user?.codigoEmpresa ? 'tenant' : 'platform');

  return {
    idUsuario: context?.idUsuario ?? user?.idUsuario ?? null,
    idRol: context?.idRol ?? user?.role ?? null,
    codigoEmpresa: context?.codigoEmpresa ?? user?.codigoEmpresa ?? null,
    codigoCuenta: context?.codigoCuenta ?? null,
    scope,
  };
}

export function toWmsPersistPayload(session) {
  if (!session?.accessToken) return null;

  const context = buildContextFromUser(session.user, session.context);
  const state = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken ?? null,
  };

  if (context) state.context = context;

  return JSON.stringify({ state, version: 0 });
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function encodeSessionForUrl(sessionOrPayload) {
  const payload =
    typeof sessionOrPayload === 'string' ? sessionOrPayload : toWmsPersistPayload(sessionOrPayload);

  if (!payload) return null;

  return encodeBase64Url(payload);
}

export function decodeSessionFromUrl(encoded) {
  if (!encoded) return null;

  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return normalizeStoredSession(JSON.parse(atob(padded)));
  } catch {
    try {
      return normalizeStoredSession(JSON.parse(decodeURIComponent(encoded)));
    } catch {
      return null;
    }
  }
}

export function captureSessionFromLocation(location = window.location) {
  if (typeof window === 'undefined' || !location) return null;

  const params = new URLSearchParams(location.search);
  const hashSource = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const hashParams = new URLSearchParams(hashSource);

  const encoded =
    params.get('polaria-auth') ??
    hashParams.get('polaria-auth') ??
    params.get('session') ??
    hashParams.get('session');

  if (encoded) {
    const session = decodeSessionFromUrl(encoded);
    if (session) {
      setStoredSession(session);
      return session;
    }
  }

  const accessToken = params.get('accessToken') ?? hashParams.get('accessToken');
  if (!accessToken) return null;

  const refreshToken = params.get('refreshToken') ?? hashParams.get('refreshToken');
  const rawContext = params.get('context') ?? hashParams.get('context');
  const rawUser = params.get('user') ?? hashParams.get('user');

  const session = normalizeStoredSession({
    accessToken,
    refreshToken,
    context: readJson(rawContext) ?? rawContext,
    user: readJson(rawUser) ?? rawUser,
  });

  if (session) {
    setStoredSession(session);
    return session;
  }

  return null;
}

export function getWmsSessionPayload() {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.state?.accessToken) return raw;
  } catch {
    // Continúa con la normalización.
  }

  return toWmsPersistPayload(getStoredSession());
}

export function getStoredSession() {
  if (typeof window !== 'undefined') {
    const wmsSession = normalizeStoredSession(getStoredJson(sessionStorage, STORAGE_KEY));
    if (wmsSession) return wmsSession;
  }

  for (const storage of getStorageAreas()) {
    const session = findSessionByKnownKeys(storage) ?? findSessionBySeparateKeys(storage);
    if (session) return session;
  }

  return null;
}

export function setStoredSession(session) {
  if (typeof window === 'undefined' || !session?.accessToken) return;

  const payload = toWmsPersistPayload({
    ...session,
    context: buildContextFromUser(session.user, session.context),
  });

  if (payload) sessionStorage.setItem(STORAGE_KEY, payload);
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;

  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
