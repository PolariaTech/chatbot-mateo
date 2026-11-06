import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../../lib/supabase-server';
import { resolveReportesSchema } from '../../../../../lib/reportes-schema';
import { filasParaExcel, leerPedidoDescarga } from '../../../../../lib/descarga-ov';
import { consultarExportOrdenes } from '../../../../../lib/descarga-ov-consulta';
import { libroOrdenes, nombreArchivoOrdenes } from '../../../../../lib/descarga-ov-excel';

export const maxDuration = 60;

function errorJson(error, status) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request) {
  if (!isSupabaseConfigured()) return errorJson('Supabase no está configurado.', 503);

  const auth = await requireMateoUser(request);
  if (auth.error) return errorJson(auth.error, auth.status);

  const pedido = await leerPedidoDescarga(request);
  if (pedido.error) return errorJson(pedido.error, 400);

  try {
    const lineas = await consultarExportOrdenes({
      schema: resolveReportesSchema(auth.user.codigoEmpresa),
      fechaInicio: pedido.inicio,
      fechaFin: pedido.fin,
      fecha: pedido.fecha,
    });
    const filas = filasParaExcel(lineas, pedido.columnas);
    if (!filas.length) return errorJson('No hay órdenes en ese periodo.', 404);
    const nombre = nombreArchivoOrdenes(pedido.inicio, pedido.fin);
    return new NextResponse(libroOrdenes(filas), {
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
