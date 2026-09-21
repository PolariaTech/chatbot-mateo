export function mapConversacion(row) {
  return {
    idConversacion: row.id_conversacion,
    titulo: row.titulo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMensaje(row) {
  return {
    idHistorial: row.id_historial,
    tipo: row.rol === 'assistant' ? 'ia' : 'usuario',
    texto: row.contenido,
    estado: row.estado,
    createdAt: row.created_at,
  };
}

export async function listConversaciones(supabase, idUsuario) {
  return supabase
    .from('mateo_conversacion')
    .select('id_conversacion, titulo, created_at, updated_at')
    .eq('id_usuario', idUsuario)
    .eq('esta_activa', true)
    .order('updated_at', { ascending: false });
}

export async function createConversacion(supabase, { idUsuario, codigoEmpresa }) {
  return supabase
    .from('mateo_conversacion')
    .insert({
      id_usuario: idUsuario,
      codigo_empresa: codigoEmpresa ?? null,
    })
    .select('id_conversacion, titulo, created_at, updated_at')
    .single();
}

export async function getConversacionForUser(supabase, idConversacion, idUsuario) {
  return supabase
    .from('mateo_conversacion')
    .select('id_conversacion, titulo, created_at, updated_at')
    .eq('id_conversacion', idConversacion)
    .eq('id_usuario', idUsuario)
    .eq('esta_activa', true)
    .maybeSingle();
}

export async function deactivateConversacion(supabase, idConversacion, idUsuario) {
  return supabase
    .from('mateo_conversacion')
    .update({ esta_activa: false })
    .eq('id_conversacion', idConversacion)
    .eq('id_usuario', idUsuario)
    .eq('esta_activa', true)
    .select('id_conversacion')
    .maybeSingle();
}

export async function listMensajes(supabase, idConversacion) {
  return supabase
    .from('mateo_historial')
    .select('id_historial, rol, contenido, estado, created_at, secuencia')
    .eq('id_conversacion', idConversacion)
    .order('secuencia', { ascending: true });
}

export async function createMensaje(
  supabase,
  { idConversacion, idUsuario, rol, contenido, estado = 'ok', tokensUsados = null },
) {
  return supabase
    .from('mateo_historial')
    .insert({
      id_conversacion: idConversacion,
      id_usuario: idUsuario,
      rol,
      contenido,
      estado,
      tokens_usados: tokensUsados,
    })
    .select('id_historial, rol, contenido, estado, created_at, secuencia')
    .single();
}
