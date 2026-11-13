import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { schemaDeEmpresa } from './reportes-schema.js';

describe('schemaDeEmpresa', () => {
  it('acepta el nombre que trae la empresa', () => {
    assert.equal(schemaDeEmpresa('emp_demo_1xz77'), 'emp_demo_1xz77');
    assert.equal(schemaDeEmpresa(' emp_jbr_cygnus_y9ihz '), 'emp_jbr_cygnus_y9ihz');
  });

  it('rechaza un nombre que no es un schema', () => {
    assert.equal(schemaDeEmpresa(''), '');
    assert.equal(schemaDeEmpresa('emp-demo'), '');
    assert.equal(schemaDeEmpresa('public;select'), '');
  });
});
