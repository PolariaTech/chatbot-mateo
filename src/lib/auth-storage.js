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
  const rawUser =
    sources.map((item) => pickValue(item, USER_KEYS)).find(Boolean) ??
    sources.find((item) => item.email || item.correo || item.username || item.identificador) ??
    decodeJwtPayload(accessToken) ??
    null;

  if (!accessToken) return null;

  const user = rawUser && typeof rawUser === 'object' ? normalizeUser(rawUser) : null;

  return {
    accessToken,
    refreshToken: refreshToken ?? null,
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

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;

  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
