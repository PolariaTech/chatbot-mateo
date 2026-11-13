import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { pedirSchemaEmpresa, schemaParaChat } from './schema-sesion.js';

const fetchOriginal = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

describe('pedirSchemaEmpresa', () => {
  it('lee el schema de la empresa de la sesion', async () => {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/empresa/schema');
      assert.equal(init.headers.Authorization, 'Bearer token-demo');
      return new Response(JSON.stringify({ schema: 'emp_demo_1xz77' }), { status: 200 });
    };

    assert.equal(await pedirSchemaEmpresa('token-demo'), 'emp_demo_1xz77');
  });

  it('avisa si la sesion no responde', async () => {
    globalThis.fetch = async () => new Response('{}', { status: 401 });
    await assert.rejects(
      () => pedirSchemaEmpresa('token-demo'),
      /No se pudo leer el schema de la empresa/,
    );
  });
});

describe('schemaParaChat', () => {
  it('usa el schema que ya trae la sesion', async () => {
    globalThis.fetch = async () => {
      throw new Error('no debia consultar');
    };
    assert.equal(await schemaParaChat('token-demo', 'emp_andino_4v053'), 'emp_andino_4v053');
  });
});
