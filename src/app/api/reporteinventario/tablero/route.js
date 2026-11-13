import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../lib/mateo-auth';
import { isSupabaseConfigured } from '../../../../lib/supabase-server';
import { schemaDeLaSesion } from '../../../../lib/schema-empresa';
import { consultarVistaInventario } from '../../../../lib/reportes-tablero';

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

  const schema = await schemaDeLaSesion(auth.user.codigoEmpresa);

  try {
    const rows = await consultarVistaInventario({ schema });
    return NextResponse.json({
      success: true,
      schema,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error ejecutando la consulta' },
      { status: 500 },
    );
  }
}
