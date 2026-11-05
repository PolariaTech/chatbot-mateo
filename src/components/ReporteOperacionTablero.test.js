import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ETAPAS_CICLO, SERIES_TENDENCIA } from '../lib/ordenesventa-estados.js'

describe('ciclo y tendencia de órdenes de venta', () => {
  it('muestra revisada, despachada y facturada en ciclo, tendencia y atrasos por hora', () => {
    assert.deepEqual(ETAPAS_CICLO.slice(-3).map((etapa) => etapa.nombre), ['Revisada', 'Despachada', 'Facturada'])
    assert.deepEqual(SERIES_TENDENCIA.slice(-3).map((serie) => serie[1]), ['Revisada', 'Despachada', 'Facturada'])
    assert.deepEqual(SERIES_TENDENCIA.map((serie) => serie[1]), [
      'Por confirmar', 'Confirmada', 'Alistamiento', 'Alistada', 'Revisada', 'Despachada', 'Facturada',
    ])
  })
})
