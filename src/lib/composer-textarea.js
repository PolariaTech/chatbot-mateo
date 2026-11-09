const ALTURA_MAXIMA_PX = 160;

export function ajustarAlturaTextarea(textarea, maxPx = ALTURA_MAXIMA_PX) {
  if (!textarea) return 0;
  textarea.style.height = 'auto';
  const siguiente = Math.min(textarea.scrollHeight, maxPx);
  textarea.style.height = `${siguiente}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxPx ? 'auto' : 'hidden';
  return siguiente;
}
