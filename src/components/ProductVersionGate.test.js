import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductVersionGate from './ProductVersionGate.js';

describe('ProductVersionGate', () => {
  it('no muestra el aviso cuando la versión del bundle sigue vigente', () => {
    const html = renderToStaticMarkup(createElement(ProductVersionGate));
    assert.equal(html, '');
  });
});
