import { schemaDeEmpresa } from './reportes-schema.js';
import { getSupabaseAdmin } from './supabase-server.js';

export async function leerSchemaEmpresa(supabase, codigoEmpresa) {
  const codigo = String(codigoEmpresa || '').trim();
  if (!codigo) return 'public';

  const { data, error } = await supabase
    .from('empresa')
    .select('schema_name')
    .eq('codigo_empresa', codigo)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo leer el schema de la empresa.');
  }

  return schemaDeEmpresa(data?.schema_name) || 'public';
}

export async function schemaDeLaSesion(codigoEmpresa) {
  return leerSchemaEmpresa(getSupabaseAdmin(), codigoEmpresa);
}
