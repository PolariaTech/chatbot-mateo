import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { leerSchemaEmpresa } from './schema-empresa.js';

function supabaseCon(resultado) {
  return {
    from(tabla) {
      assert.equal(tabla, 'empresa');
      return {
        select(columnas) {
          assert.equal(columnas, 'schema_name');
          return this;
        },
        eq(columna, valor) {
          assert.equal(columna, 'codigo_empresa');
          assert.equal(valor, '1XZ77');
          return this;
        },
        maybeSingle: async () => resultado,
      };
    },
  };
}

describe('leerSchemaEmpresa', () => {
  it('devuelve el schema_name de la empresa logueada', async () => {
    const schema = await leerSchemaEmpresa(
      supabaseCon({ data: { schema_name: 'emp_demo_1xz77' }, error: null }),
      '1XZ77',
    );
    assert.equal(schema, 'emp_demo_1xz77');
  });

  it('usa public cuando la empresa no tiene schema', async () => {
    const schema = await leerSchemaEmpresa(
      supabaseCon({ data: { schema_name: null }, error: null }),
      '1XZ77',
    );
    assert.equal(schema, 'public');
  });

  it('usa public si no hay codigo de empresa', async () => {
    const schema = await leerSchemaEmpresa(supabaseCon({ data: null, error: null }), '');
    assert.equal(schema, 'public');
  });

  it('avisa cuando la lectura falla', async () => {
    await assert.rejects(
      () => leerSchemaEmpresa(supabaseCon({ data: null, error: { message: 'fallo' } }), '1XZ77'),
      /No se pudo leer el schema de la empresa/,
    );
  });
});
