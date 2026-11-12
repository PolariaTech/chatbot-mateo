const LIMITE_CELDA = 48;

export function recortarTextoTabla(texto, limite = LIMITE_CELDA) {
  const limpio = String(texto ?? '');
  if (limpio.length <= limite) return limpio;
  return `${limpio.slice(0, limite)}...`;
}

export function presentarCelda(texto) {
  const limpio = String(texto ?? '');
  const visible = recortarTextoTabla(limpio);
  return {
    visible: visible || '—',
    titulo: visible === limpio ? undefined : limpio,
  };
}
