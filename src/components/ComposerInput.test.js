import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ajustarAlturaTextarea } from '../lib/composer-textarea.js';

describe('ComposerInput', () => {
  it('crece con el contenido hasta el tope', () => {
    const textarea = {
      scrollHeight: 95,
      style: { height: '', overflowY: '' },
    };
    assert.equal(ajustarAlturaTextarea(textarea), 95);
    assert.equal(textarea.style.overflowY, 'hidden');
  });
});
