import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('ajuste de salto de texto', () => {
  it('no parte palabras a la mitad y deja envolver las métricas', async () => {
    const css = await readFile(new URL('./globals.css', import.meta.url), 'utf8');

    assert.match(css, /\.message-bubble\s*\{[^}]*overflow-wrap:\s*break-word;[^}]*word-break:\s*normal;/);
    assert.match(css, /\.chat-table td span\s*\{[^}]*overflow-wrap:\s*break-word;[^}]*word-break:\s*normal;/);
    assert.match(css, /\.report-metric\s*\{[^}]*flex-wrap:\s*wrap;[^}]*gap:\s*6px 16px;/);
    assert.match(css, /\.report-metric__label\s*\{[^}]*flex:\s*1 1 12rem;[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*break-word;/);
    assert.match(css, /\.report-metric__value\s*\{[^}]*flex:\s*1 1 10rem;[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*break-word;/);
  });
});
