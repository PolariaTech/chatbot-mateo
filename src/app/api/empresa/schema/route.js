import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../lib/supabase-server';
import { schemaDeLaSesion } from '../../../../lib/schema-empresa';

function errorJson(error, status) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET(request) {
  if (!isSupabaseConfigured()) return errorJson('Supabase no está configurado.', 503);

  const auth = await requireMateoUser(request);
  if (auth.error) return errorJson(auth.error, auth.status);

  try {
    const schema = await schemaDeLaSesion(auth.user.codigoEmpresa);
    return NextResponse.json({ success: true, schema });
  } catch (error) {
    return errorJson(error?.message || 'No se pudo leer el schema de la empresa.', 500);
  }
}
