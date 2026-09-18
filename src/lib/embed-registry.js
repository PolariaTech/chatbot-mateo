const embedUrls = new Map();

function createToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function registerEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const token = createToken();
  embedUrls.set(token, url);
  return token;
}

export function peekEmbedUrl(token) {
  if (!token) return null;
  return embedUrls.get(token) ?? null;
}

export function releaseEmbedUrl(token) {
  if (!token) return;
  embedUrls.delete(token);
}

export const EMBED_FRAME_PATH = '/vista-embebida';
export const EMBED_MSG_READY = 'mateo-embed-ready';
export const EMBED_MSG_LOAD = 'mateo-embed-load';
export const EMBED_MSG_ERROR = 'mateo-embed-error';
