import { normalizeSupabaseUrl } from './supabase-server';
import { tipoFechaOperacion } from './tipo-fecha-operacion';

async function leerError(response) {
  try {
    const data = await response.json();
    return data.message || data.error_description || data.error || 'Error ejecutando la consulta';
  } catch {
    return 'Error ejecutando la consulta';
  }
}

function errorDeRed(error) {
  const mensaje = String(error?.message || error || '');
  if (/timeout|aborted/i.test(mensaje) || error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return new Error('canceling statement due to statement timeout');
  }
  return error;
}

export async function consultarOperacionOrdenes({ schema, fechaInicio, fechaFin, tipoFecha }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !key) throw new Error('Supabase no está configurado.');

  let response;
  try {
    response = await fetch(`${baseUrl}/rest/v1/rpc/get_operacion_ordenes`, {
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
        p_fecha: tipoFechaOperacion(tipoFecha),
      }),
    });
  } catch (error) {
    throw errorDeRed(error);
  }

  if (!response.ok) throw new Error(await leerError(response));
  return response.json();
}
