const MD_LINK_RE = /\[([^\]]*)\]\(\s*((?:https?:\/\/[^)]+?)|(?:\/reporte[a-z]+))\s*\)/gi;
const INCOMPLETE_MD_LINK_RE = /\[([^\]]*)\]\(\s*https?:\/\/\s*\)/gi;
const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;
const URL_TRAILING_PUNCT_RE = /[.,;:!?)\]}>]+$/;
const RELATIVE_REPORT_RE = /^\/reporte[a-z]+$/i;
const OFFERS_REPORT_RE = /aqu[ií]\s+est[aá]\s+el\s+(?:\[)?reporte|\baqu[ií] tienes el reporte/i;
const NO_LINK_AVAILABLE_RE = /no tengo un enlace|enlace disponible|no (?:tengo|pude)\b.{0,40}\breporte/i;

const REPORT_ROUTES = [
  { keys: ['folio', 'factura', 'cfdi', 'uuid', 'timbr', 'cancelac'], path: '/reportefolios', label: 'reporte de folios' },
  {
    keys: ['gerencia', 'venta', 'compra', 'inventario', 'producto', 'margen', 'utilidad', 'merma', 'dashboard', 'gráfica', 'grafica', 'indicador'],
    path: '/reportegerencia',
    label: 'reporte de gerencia',
  },
];

export function stripMarkdownMarks(text) {
  return String(text || '').replace(/\*\*/g, '').trim();
}

function getAppOrigin() {
  if (typeof window === 'undefined' || !window.location?.origin) return '';
  return String(window.location.origin).replace(/\/$/, '');
}

function matchReportRoute(text) {
  const hay = String(text || '').toLowerCase();
  return REPORT_ROUTES.find((route) => route.keys.some((key) => hay.includes(key))) || null;
}

function isUsableHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return Boolean(parsed.hostname) && parsed.hostname !== '.';
  } catch {
    return false;
  }
}

export function toEmbeddableUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  if (RELATIVE_REPORT_RE.test(raw)) {
    const origin = getAppOrigin();
    return origin ? `${origin}${raw}` : raw;
  }

  if (/^https?:\/\//i.test(raw)) {
    const cleaned = raw.replace(URL_TRAILING_PUNCT_RE, '');
    return isUsableHttpUrl(cleaned) ? cleaned : '';
  }

  return '';
}

function hasUsableReportTarget(text) {
  if (/\[[^\]]*\]\(\s*\/reporte[a-z]+\s*\)/i.test(text)) return true;

  const matches = String(text).match(URL_RE) || [];
  return matches.some((raw) => isUsableHttpUrl(raw.replace(URL_TRAILING_PUNCT_RE, '')));
}

function markdownForRoute(label, route) {
  const cleanLabel = stripMarkdownMarks(label) || route.label;
  return `[${cleanLabel}](${route.path})`;
}

/**
 * Repara enlaces markdown partidos por salto de línea
 * (típico: "[texto](https" + "\\n" + "//host/ruta)").
 * También completa reportes sin host: "[reporte de ventas](https://)".
 */
export function normalizeMessageLinks(text) {
  if (!text) return '';
  let out = String(text)
    .replace(/https:\s*[\r\n]+\s*\/\//gi, 'https://')
    .replace(/https\s*[\r\n]+\s*\/\//gi, 'https://');

  out = out.replace(INCOMPLETE_MD_LINK_RE, (_, label) => {
    const route = matchReportRoute(label) || matchReportRoute(out);
    if (!route) return `[${stripMarkdownMarks(label) || 'Ver reporte'}](/reportegerencia)`;
    return markdownForRoute(label, route);
  });

  out = out.replace(MD_LINK_RE, (_, label, url) => {
    const cleanUrl = String(url).replace(/\s+/g, '');
    const cleanLabel = stripMarkdownMarks(label) || 'Ver reporte';
    if (RELATIVE_REPORT_RE.test(cleanUrl)) {
      return `[${cleanLabel}](${cleanUrl})`;
    }

    const usable = toEmbeddableUrl(cleanUrl);
    if (usable) return `[${cleanLabel}](${usable})`;

    const route = matchReportRoute(cleanLabel) || matchReportRoute(out);
    if (!route) return `[${cleanLabel}](${cleanUrl})`;
    return markdownForRoute(cleanLabel, route);
  });

  if (!hasUsableReportTarget(out) && !NO_LINK_AVAILABLE_RE.test(out) && OFFERS_REPORT_RE.test(out)) {
    const route = matchReportRoute(out);
    if (route) {
      out = `${out.trimEnd()}\n\n[${route.label}](${route.path})`;
    }
  }

  return out;
}

export function extractFirstUrl(text) {
  if (!text) return null;

  const normalized = normalizeMessageLinks(text);
  const md = /\[([^\]]*)\]\(((?:https?:\/\/[^)\s]+)|(?:\/reporte[a-z]+))\)/i.exec(normalized);
  if (md?.[2]) {
    const url = toEmbeddableUrl(md[2]) || md[2];
    if (url) {
      return {
        url,
        label: stripMarkdownMarks(md[1]) || 'Reporte',
      };
    }
  }

  const bare = normalized.match(URL_RE);
  if (!bare?.[0]) return null;

  const url = toEmbeddableUrl(bare[0].replace(URL_TRAILING_PUNCT_RE, ''));
  return url ? { url, label: null } : null;
}
