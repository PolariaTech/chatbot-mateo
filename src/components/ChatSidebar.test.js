import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDisplayName } from '../lib/display-name.js';

describe('barra del chat', () => {
  it('muestra el nombre de quien está en sesión', () => {
    assert.equal(getDisplayName({ nombre: 'Ana' }), 'Ana');
  });
});
