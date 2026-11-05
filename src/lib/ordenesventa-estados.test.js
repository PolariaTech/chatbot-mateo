import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ESTADOS_KPI, ETAPAS_CICLO, ETAPAS_GRAFICO, etiquetaEstado, filasPorEstado, puntoTendencia } from './ordenesventa-estados.js'

describe('estados de orden de venta', () => {
  it('incluye revisada, despachada y facturada en las tarjetas', () => {
    const claves = ESTADOS_KPI.map(([clave]) => clave)
    assert.deepEqual(claves.slice(-3), ['revisada', 'despachada', 'facturada'])
  })

  it('los muestra como etapas cerradas después de alistada', () => {
    const cerradas = ETAPAS_GRAFICO.filter(([, , cerrada]) => cerrada).map(([, nombre]) => nombre)
    assert.deepEqual(cerradas, ['Alistada', 'Revisada', 'Despachada', 'Facturada'])
  })

  it('traduce la clave aunque la consulta aún devuelva el código', () => {
    assert.equal(etiquetaEstado('revisada', 'revisada'), 'Revisada')
    assert.equal(etiquetaEstado('despachada', 'despachada'), 'Despachada')
    assert.equal(etiquetaEstado('facturada', 'facturada'), 'Facturada')
    assert.equal(etiquetaEstado('otro', 'Otro estado'), 'Otro estado')
  })

  it('completa el gráfico de órdenes por estado aunque el conteo sea cero', () => {
    const filas = filasPorEstado([
      { clave: 'confirmada', etiqueta: 'confirmada', ordenes: 4, cantidad: 8, importe: 20 },
      { clave: 'otro', etiqueta: 'En revisión', ordenes: 2, cantidad: 1, importe: 3 },
    ])
    assert.deepEqual(filas.map((fila) => fila.clave), [
      'por_confirmar',
      'confirmada',
      'alistamiento',
      'alistada',
      'revisada',
      'despachada',
      'facturada',
      'otro',
    ])
    assert.equal(filas.find((fila) => fila.clave === 'confirmada').ordenes, 4)
    assert.equal(filas.find((fila) => fila.clave === 'revisada').ordenes, 0)
    assert.equal(filas.find((fila) => fila.clave === 'otro').etiqueta, 'En revisión')
  })

  it('suma revisada, despachada y facturada al ciclo y a la tendencia', () => {
    assert.deepEqual(ETAPAS_CICLO.slice(-3).map((etapa) => etapa.nombre), ['Revisada', 'Despachada', 'Facturada'])
    assert.equal(ETAPAS_CICLO.find((etapa) => etapa.clave === '3').nombre, 'Alistada')
    assert.equal(ETAPAS_CICLO.find((etapa) => etapa.clave === '4').limite, null)
    assert.equal(puntoTendencia(30, 60), 50)
    assert.equal(puntoTendencia(90, null), 90)
    assert.equal(puntoTendencia(null, 60), null)
  })
})
