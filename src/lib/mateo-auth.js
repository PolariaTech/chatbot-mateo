import { fetchMe } from './auth-api';

const SESSION_TTL_MS = 120000;
const sessionCache = new Map();

export async function requireMateoUser(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return { error: 'No autorizado.', status: 401 };
  }

  const cached = sessionCache.get(token);
  if (cached && cached.expira > Date.now()) {
    return { user: cached.user, token };
  }

  try {
    const result = await fetchMe(token);

    if (result.status === 401) {
      sessionCache.delete(token);
      return { error: 'Sesión inválida.', status: 401 };
    }

    if (!result.ok || !result.user?.idUsuario) {
      return {
        error: result.error || 'No se pudo validar la sesión.',
        status: result.status && result.status >= 400 ? result.status : 503,
      };
    }

    sessionCache.set(token, { user: result.user, expira: Date.now() + SESSION_TTL_MS });
    return { user: result.user, token };
  } catch {
    return { error: 'No se pudo validar la sesión.', status: 503 };
  }
}
