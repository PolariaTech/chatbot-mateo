const EMOJI_RE = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

export function stripEmojis(text) {
  return String(text || '')
    .replace(EMOJI_RE, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function iconKindFromHeader(emoji, headerText) {
  const t = String(headerText || '').toLowerCase();
  if (emoji === '📊' || emoji === '📈' || emoji === '📉') return 'chart';
  if (emoji === '📋' || emoji === '🗒') return 'table';
  if (emoji === '📦') return 'box';
  if (emoji === '💰' || emoji === '💵') return 'money';
  if (/tabla|table/.test(t)) return 'table';
  if (/venta|gráfic|grafica|chart|utilidad/.test(t)) return 'chart';
  if (/inventario|bodega/.test(t)) return 'box';
  if (/compra|costo|precio/.test(t)) return 'money';
  if (/reporte|informe|resumen|dashboard/.test(t)) return 'doc';
  return 'sparkle';
}
