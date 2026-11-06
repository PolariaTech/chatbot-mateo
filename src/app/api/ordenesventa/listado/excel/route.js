import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../../lib/supabase-server';
import { resolveReportesSchema } from '../../../../../lib/reportes-schema';
import {
  COLUMNAS_ORDENES_VENTA,
  filasExcel,
  leerCuerpo,
  libroListado,
  nombreListado,
  validarPeriodo,
} from '../../../../../lib/listado-ordenes';
import { consultarListadoOrdenes } from '../../../../../lib/listado-ordenes-consulta';

export const maxDuration = 60;

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

  try {
    const resultado = await consultarListadoOrdenes({
      schema: resolveReportesSchema(auth.user.codigoEmpresa),
      fechaInicio: body.fecha_inicio,
      fechaFin: body.fecha_fin,
    });
    if (!resultado.ordenes.length) return errorJson('No hay órdenes en ese periodo.', 404);
    const nombre = nombreListado('ordenes', body.fecha_inicio, body.fecha_fin);
    return new NextResponse(Buffer.from(libroListado(filasExcel(COLUMNAS_ORDENES_VENTA, resultado.ordenes))), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nombre}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return errorJson(error?.message || 'No se pudo generar el Excel.', 500);
  }
}
