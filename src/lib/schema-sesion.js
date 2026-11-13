import { schemaDeEmpresa } from './reportes-schema.js';

const cachePorToken = new Map();

export async function pedirSchemaEmpresa(token) {
  if (!token) {
    throw new Error('No se pudo leer el schema de la empresa.');
  }

  let respuesta;
  try {
    respuesta = await fetch('/api/empresa/schema', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('No se pudo leer el schema de la empresa.');
  }

  if (!respuesta.ok) {
    throw new Error('No se pudo leer el schema de la empresa.');
  }

  let cuerpo;
  try {
    cuerpo = await respuesta.json();
  } catch {
    throw new Error('No se pudo leer el schema de la empresa.');
  }

  return schemaDeEmpresa(cuerpo?.schema) || 'public';
}

export async function schemaParaChat(token, schemaConocido) {
  const conocido = schemaDeEmpresa(schemaConocido);
  if (conocido) return conocido;
  if (cachePorToken.has(token)) return cachePorToken.get(token);

  const schema = await pedirSchemaEmpresa(token);
  cachePorToken.set(token, schema);
  return schema;
}
