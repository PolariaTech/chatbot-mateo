import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../lib/supabase-server';
import { resolveReportesSchema } from '../../../../lib/reportes-schema';
import { mensajeTimeoutConsulta } from '../../../../lib/reportes-tablero';
import { consultarOperacionOrdenes } from '../../../../lib/operacion-ordenes-consulta';
import { errorTipoFecha, tipoFechaOperacion } from '../../../../lib/tipo-fecha-operacion';

export const maxDuration = 60;

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase no está configurado.' },
      { status: 503 },
    );
  }

  const auth = await requireMateoUser(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const fechaInicio = body.fecha_inicio;
  const fechaFin = body.fecha_fin;

  if (!FECHA_ISO.test(fechaInicio || '') || !FECHA_ISO.test(fechaFin || '')) {
    return NextResponse.json(
      { success: false, error: 'Indica fecha_inicio y fecha_fin (YYYY-MM-DD)' },
      { status: 400 },
    );
  }

  if (fechaInicio > fechaFin) {
    return NextResponse.json(
      { success: false, error: 'La fecha inicio no puede ser mayor que la fecha fin' },
      { status: 400 },
    );
  }

  const errorTipo = errorTipoFecha(body.tipo_fecha);
  if (errorTipo) {
    return NextResponse.json({ success: false, error: errorTipo }, { status: 400 });
  }

  const schema = resolveReportesSchema(auth.user.codigoEmpresa);

  try {
    const filas = await consultarOperacionOrdenes({
      schema,
      fechaInicio,
      fechaFin,
      tipoFecha: tipoFechaOperacion(body.tipo_fecha),
    });
    return NextResponse.json({
      success: true,
      schema,
      filas: filas || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: mensajeTimeoutConsulta(error, 'tablero') },
      { status: 500 },
    );
  }
}
