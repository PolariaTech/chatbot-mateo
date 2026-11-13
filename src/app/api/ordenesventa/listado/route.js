import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../lib/supabase-server';
import { schemaDeLaSesion } from '../../../../lib/schema-empresa';
import { leerCuerpo, validarPeriodo } from '../../../../lib/listado-ordenes';
import { errorTipoFecha, tipoFechaOperacion } from '../../../../lib/tipo-fecha-operacion';
import { consultarListadoOrdenes } from '../../../../lib/listado-ordenes-consulta';

function errorJson(error, status) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request) {
  if (!isSupabaseConfigured()) return errorJson('Supabase no está configurado.', 503);
  const auth = await requireMateoUser(request);
  if (auth.error) return errorJson(auth.error, auth.status);
  const body = await leerCuerpo(request);
  const errorPeriodo = validarPeriodo(body.fecha_inicio, body.fecha_fin);
  if (errorPeriodo) return errorJson(errorPeriodo, 400);
  const errorTipo = errorTipoFecha(body.tipo_fecha);
  if (errorTipo) return errorJson(errorTipo, 400);

  try {
    const resultado = await consultarListadoOrdenes({
      schema: await schemaDeLaSesion(auth.user.codigoEmpresa),
      fechaInicio: body.fecha_inicio,
      fechaFin: body.fecha_fin,
      tipoFecha: tipoFechaOperacion(body.tipo_fecha),
      limite: 300,
    });
    return NextResponse.json({ success: true, ordenes: resultado.ordenes, total: resultado.total });
  } catch (error) {
    return errorJson(error?.message || 'No se pudo leer el listado.', 500);
  }
}
