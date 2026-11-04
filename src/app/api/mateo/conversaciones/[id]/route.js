import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../../lib/mateo-auth';
import { deactivateConversacion, getConversacionForUser, mapConversacion, updateTituloConversacion } from '../../../../../lib/mateo-db';
import { esCuerpoDeSolicitud, esEleccionRuta, esTituloDeRuta, tituloDesdePregunta } from '../../../../../lib/route-choice';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../../../../lib/supabase-server';

export async function PATCH(request, { params }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  const auth = await requireMateoUser(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!esCuerpoDeSolicitud(body)) {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const titulo = tituloDesdePregunta(body.titulo);
  if (!titulo || esEleccionRuta(titulo)) {
    return NextResponse.json({ actualizado: false });
  }

  const supabase = getSupabaseAdmin();
  const actual = await getConversacionForUser(supabase, params.id, auth.user.idUsuario);
  if (actual.error) {
    return NextResponse.json({ error: actual.error.message }, { status: 500 });
  }
  if (!actual.data) {
    return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 });
  }
  if (!esTituloDeRuta(actual.data.titulo)) {
    return NextResponse.json({ actualizado: false, conversacion: mapConversacion(actual.data) });
  }

  const { data, error } = await updateTituloConversacion(
    supabase,
    params.id,
    auth.user.idUsuario,
    titulo,
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ actualizado: true, conversacion: mapConversacion(data) });
}

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
