import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductVersionDialog from './ProductVersionDialog.js';

describe('ProductVersionDialog', () => {
  it('muestra el aviso de versión nueva y el botón Aceptar', () => {
    const html = renderToStaticMarkup(createElement(ProductVersionDialog, {
      titleId: 'titulo-version',
      descriptionId: 'mensaje-version',
      accepting: false,
      onAccept() {},
    }));
    assert.match(html, /alertdialog/);
    assert.match(html, /Nueva versión/);
    assert.match(html, /Hay una nueva versión en este momento/);
    assert.match(html, /Aceptar/);
  });
});
