const RANGOS_PRESET = [
  { id: '1s', label: 'Última semana', semanas: 1 },
  { id: '2s', label: 'Últimas 2 semanas', semanas: 2 },
  { id: '3s', label: 'Últimas 3 semanas', semanas: 3 },
  { id: '4s', label: 'Últimas 4 semanas', semanas: 4 },
  { id: '1m', label: 'Último mes', meses: 1 },
  { id: '3m', label: 'Últimos 3 meses', meses: 3 },
  { id: '6m', label: 'Últimos 6 meses', meses: 6 },
];

export { RANGOS_PRESET };

export function esFechaIso(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function isoDesdeFechaLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function hoyLocal() {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function fechasSemanasHastaHoy(cantidadSemanas) {
  const hoy = hoyLocal();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (cantidadSemanas * 7 - 1));
  return { inicio: isoDesdeFechaLocal(inicio), fin: isoDesdeFechaLocal(hoy) };
}

function fechasMesesHastaHoy(cantidadMeses) {
  const hoy = hoyLocal();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (cantidadMeses - 1), 1);
  return { inicio: isoDesdeFechaLocal(inicio), fin: isoDesdeFechaLocal(hoy) };
}

export function fechasDePreset(presetId) {
  const preset = RANGOS_PRESET.find((item) => item.id === presetId);
  if (!preset) return null;
  if (preset.semanas) return fechasSemanasHastaHoy(preset.semanas);
  if (preset.meses) return fechasMesesHastaHoy(preset.meses);
  return null;
}

export function isoToDmy(iso) {
  if (!esFechaIso(iso)) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function dmyToIso(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!match) return null;
  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);
  const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (
    Number.isNaN(parsed.getTime())
    || parsed.getFullYear() !== yyyy
    || parsed.getMonth() + 1 !== mm
    || parsed.getDate() !== dd
  ) {
    return null;
  }
  return iso;
}
