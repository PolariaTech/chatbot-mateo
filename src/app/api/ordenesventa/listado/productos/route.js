import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../../lib/supabase-server';
import { resolveReportesSchema } from '../../../../../lib/reportes-schema';
import { leerCuerpo, numeroOrden } from '../../../../../lib/listado-ordenes';
import { consultarProductosOrden } from '../../../../../lib/listado-ordenes-consulta';

function errorJson(error, status) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request) {
  if (!isSupabaseConfigured()) return errorJson('Supabase no está configurado.', 503);
  const auth = await requireMateoUser(request);
  if (auth.error) return errorJson(auth.error, auth.status);
  const body = await leerCuerpo(request);
  const numero = numeroOrden(body.numero);
  if (!numero) return errorJson('Indica el número de la orden de venta.', 400);

  try {
    const productos = await consultarProductosOrden({
      schema: resolveReportesSchema(auth.user.codigoEmpresa),
      numero,
    });
    return NextResponse.json({ success: true, numero, productos });
  } catch (error) {
    return errorJson(error?.message || 'No se pudieron leer los productos.', 500);
  }
}
