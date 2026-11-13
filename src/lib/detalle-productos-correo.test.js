import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../sql/get_detalle_ot_ordenes.sql'),
  'utf8',
);

describe('productos de una orden que solo vienen en el correo', () => {
  it('los lee del correo cuando no hay centro ni líneas de venta', () => {
    assert.equal((sql.match(/tiene_producto_correo/g) || []).length >= 4, true);
    assert.equal((sql.match(/elemento->>'Producto'/g) || []).length >= 4, true);
    assert.equal(sql.includes('LEFT JOIN orden_venta_linea'), false);
  });
});
