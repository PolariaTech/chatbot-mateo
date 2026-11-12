import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../../lib/supabase-server';
import { resolveReportesSchema } from '../../../../../lib/reportes-schema';
import {
  COLUMNAS_DETALLE_OT,
  COLUMNAS_ORDENES_VENTA,
  descargaListado,
  filasExcel,
  leerCuerpo,
  libroListado,
  nombreListado,
  validarPeriodo,
} from '../../../../../lib/listado-ordenes';
import { errorTipoFecha, tipoFechaOperacion } from '../../../../../lib/tipo-fecha-operacion';
import { consultarDetalleOt, consultarListadoOrdenes } from '../../../../../lib/listado-ordenes-consulta';

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
  const errorTipo = errorTipoFecha(body.tipo_fecha);
  if (errorTipo) return errorJson(errorTipo, 400);
  const descarga = descargaListado(body.descarga);
  if (!descarga) return errorJson('La descarga debe ser el listado o el detalle de órdenes de trabajo.', 400);

  try {
    const schema = resolveReportesSchema(auth.user.codigoEmpresa);
    const tipoFecha = tipoFechaOperacion(body.tipo_fecha);
    const detalle = descarga === 'ot';
    const ordenes = detalle
      ? await consultarDetalleOt({ schema, fechaInicio: body.fecha_inicio, fechaFin: body.fecha_fin, tipoFecha })
      : (await consultarListadoOrdenes({
        schema,
        fechaInicio: body.fecha_inicio,
        fechaFin: body.fecha_fin,
        tipoFecha,
      })).ordenes;
    if (!ordenes.length) return errorJson('No hay órdenes en ese periodo.', 404);
    const columnas = detalle ? COLUMNAS_DETALLE_OT : COLUMNAS_ORDENES_VENTA;
    const nombre = nombreListado(detalle ? 'ordenes_ot' : 'ordenes', body.fecha_inicio, body.fecha_fin);
    return new NextResponse(Buffer.from(libroListado(filasExcel(columnas, ordenes))), {
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
