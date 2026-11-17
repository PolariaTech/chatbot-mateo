import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('layout', () => {
  it('monta el aviso de versión nueva en todas las pantallas', () => {
    const layout = readFileSync(new URL('./layout.js', import.meta.url), 'utf8');
    assert.match(layout, /import ProductVersionGate from "\.\.\/components\/ProductVersionGate"/);
    assert.match(layout, /<ProductVersionGate \/>/);
    assert.match(layout, /product-version\.css/);
  });
});
