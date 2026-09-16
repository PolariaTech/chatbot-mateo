import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../lib/supabase-server';
import { resolveReportesSchema } from '../../../../lib/reportes-schema';
import { consultarVistaVentas } from '../../../../lib/reportes-tablero';

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

  const schema = resolveReportesSchema(auth.user.codigoEmpresa);
  const LIMITE_PANTALLA = 5000;
  const LIMITE_PAGINA = 1000;
  const offset = Number.isFinite(Number(body.offset))
    ? Math.max(0, Math.trunc(Number(body.offset)))
    : 0;
  const limite = body.limite != null
    ? Math.min(LIMITE_PAGINA, Math.max(1, Math.trunc(Number(body.limite)) || LIMITE_PAGINA))
    : LIMITE_PANTALLA;

  try {
    const { rows, total } = await consultarVistaVentas({
      schema,
      fechaInicio,
      fechaFin,
      limite,
      offset,
    });
    return NextResponse.json({
      success: true,
      schema,
      rows,
      total,
      truncated: offset === 0 && limite === LIMITE_PANTALLA && total > rows.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error ejecutando la consulta' },
      { status: 500 },
    );
  }
}
