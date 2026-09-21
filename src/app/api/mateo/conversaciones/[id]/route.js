import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../../lib/mateo-auth';
import { deactivateConversacion } from '../../../../../lib/mateo-db';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../../../../lib/supabase-server';

export async function DELETE(request, { params }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  const auth = await requireMateoUser(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await deactivateConversacion(
    supabase,
    params.id,
    auth.user.idUsuario,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
