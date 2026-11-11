import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../../lib/supabase-server';
import { resolveReportesSchema } from '../../../../../lib/reportes-schema';
import { leerPedidoDescarga } from '../../../../../lib/descarga-ov';
import { nombreArchivoOrdenes } from '../../../../../lib/descarga-ov-excel';
import { libroSabana } from '../../../../../lib/sabana-pedidos-excel';
import { consultarSabanaPedidos } from '../../../../../lib/sabana-pedidos-consulta';
import { filasSabana } from '../../../../../lib/sabana-pedidos';

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
    const lineas = await consultarSabanaPedidos({
      schema: resolveReportesSchema(auth.user.codigoEmpresa),
      fechaInicio: pedido.todo ? '2000-01-01' : pedido.inicio,
      fechaFin: pedido.todo ? '2099-12-31' : pedido.fin,
      fecha: pedido.fecha,
      horas: pedido.horas,
      horaInicio: pedido.horaInicio,
      horaFin: pedido.horaFin,
    });
    const filas = filasSabana(lineas, pedido.columnas);
    if (!filas.length) return errorJson('No hay órdenes en ese periodo.', 404);
    const nombre = nombreArchivoOrdenes(pedido.inicio, pedido.fin);
    return new NextResponse(libroSabana(filas), {
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
