import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../lib/supabase-server';
import { resolveReportesSchema } from '../../../../lib/reportes-schema';
import { consultarVistaVentas } from '../../../../lib/reportes-tablero';
import { armarWorkbookVentas, workbookABuffer } from '../../../../lib/reporte-ventas-export';

export const runtime = 'nodejs';
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
  const consolidado = body.consolidado === true;

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

  try {
    const { rows } = await consultarVistaVentas({
      schema,
      fechaInicio,
      fechaFin,
    });
    const workbook = armarWorkbookVentas(rows, { consolidado });
    const buffer = workbookABuffer(workbook);
    const sufijo = consolidado ? 'por_venta' : 'detalle';
    const filename = `reporte_ventas_${sufijo}_${fechaInicio}_${fechaFin}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo generar el Excel' },
      { status: 500 },
    );
  }
}
