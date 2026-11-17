import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ordenes = readFileSync(new URL('../../prompts/MateoOrdenes.txt', import.meta.url), 'utf8');
const agente = readFileSync(new URL('../../prompts/MateoOrdenesAgente.txt', import.meta.url), 'utf8');
const fechaCancun = "(now() AT TIME ZONE 'America/Cancun')::date";

describe('hoy en Cancún', () => {
  it('el prompt de órdenes no usa CURRENT_DATE como fecha del día', () => {
    const lineas = ordenes.split('\n').filter((linea) => linea.includes('CURRENT_DATE'));
    assert.ok(lineas.length > 0);
    for (const linea of lineas) {
      assert.match(linea, /Prohibido CURRENT_DATE|Nunca escribas CURRENT_DATE|no aparece CURRENT_DATE/);
    }
    assert.ok(ordenes.includes(fechaCancun));
  });

  it('el agente pide la última hora con la fecha de Cancún', () => {
    assert.equal(agente.includes('CURRENT_DATE'), false);
    assert.ok(agente.includes(`get_sabana_pedidos(${fechaCancun}`));
  });
});
