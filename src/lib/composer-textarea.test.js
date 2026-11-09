import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ajustarAlturaTextarea } from './composer-textarea.js';

describe('ajustarAlturaTextarea', () => {
  it('no falla sin elemento', () => {
    assert.equal(ajustarAlturaTextarea(null), 0);
  });

  it('ajusta la altura al contenido y limita el máximo', () => {
    const textarea = {
      scrollHeight: 220,
      style: { height: '', overflowY: '' },
    };
    const altura = ajustarAlturaTextarea(textarea, 160);
    assert.equal(altura, 160);
    assert.equal(textarea.style.height, '160px');
    assert.equal(textarea.style.overflowY, 'auto');
  });

  it('oculta el scroll cuando cabe', () => {
    const textarea = {
      scrollHeight: 40,
      style: { height: '', overflowY: '' },
    };
    const altura = ajustarAlturaTextarea(textarea, 160);
    assert.equal(altura, 40);
    assert.equal(textarea.style.height, '40px');
    assert.equal(textarea.style.overflowY, 'hidden');
  });
});
