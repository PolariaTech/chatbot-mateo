import { normalizeSupabaseUrl } from './supabase-server';

export function filasDeRespuesta(data) {
  if (!Array.isArray(data)) throw new Error('La consulta no devolvió filas.');
  return data;
}

async function leerError(response) {
  try {
    const data = await response.json();
    return data.message || data.error || 'No se pudieron leer las órdenes.';
  } catch {
    return 'No se pudieron leer las órdenes.';
  }
}

export async function consultarExportOrdenes({ schema, fechaInicio, fechaFin }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !key) throw new Error('Supabase no está configurado.');

  const response = await fetch(`${baseUrl}/rest/v1/rpc/get_export_ordenes`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Profile': schema,
      'Content-Profile': schema,
    },
    body: JSON.stringify({
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin,
    }),
  });

  if (!response.ok) throw new Error(await leerError(response));
  return filasDeRespuesta(await response.json());
}
