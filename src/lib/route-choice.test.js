import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  esCuerpoDeSolicitud,
  esEleccionRuta,
  leerEleccionRuta,
  marcarRuta,
  modoDesdeHistorial,
  modoDesdeTexto,
  tituloDesdePregunta,
} from './route-choice.js'

describe('modoDesdeTexto', () => {
  it('reconoce Ventas como VENTAS', () => {
    assert.equal(esEleccionRuta('Ventas'), true)
    assert.equal(modoDesdeTexto('Ventas'), 'VENTAS')
  })

  it('reconoce 2 y ordenes de venta como PEDIDOS', () => {
    assert.equal(esEleccionRuta('2'), true)
    assert.equal(modoDesdeTexto('2'), 'PEDIDOS')
    assert.equal(modoDesdeTexto('ordenes de venta'), 'PEDIDOS')
  })
})

describe('esCuerpoDeSolicitud', () => {
  it('acepta un objeto y rechaza null, texto y arreglos', () => {
    assert.equal(esCuerpoDeSolicitud({ titulo: 'Ventas de ayer' }), true)
    assert.equal(esCuerpoDeSolicitud(null), false)
    assert.equal(esCuerpoDeSolicitud('Ventas'), false)
    assert.equal(esCuerpoDeSolicitud(['Ventas']), false)
  })
})

describe('tituloDesdePregunta', () => {
  it('deja igual un titulo de hasta 80 caracteres', () => {
    const titulo = 'a'.repeat(80)
    assert.equal(tituloDesdePregunta(titulo), titulo)
  })

  it('recorta a 77 caracteres y agrega puntos suspensivos', () => {
    const titulo = 'b'.repeat(81)
    assert.equal(tituloDesdePregunta(titulo), `${'b'.repeat(77)}…`)
  })
})

describe('marcas de ruta', () => {
  it('guarda el modo y lo quita del texto visible', () => {
    const guardado = marcarRuta('Listo', 'PEDIDOS')
    const leido = leerEleccionRuta(`${guardado}\n[[ELEGIR_RUTA]]`)

    assert.equal(guardado, 'Listo\n[[RUTA:PEDIDOS]]')
    assert.equal(leido.elegirRuta, true)
    assert.equal(leido.texto, 'Listo')
  })

  it('toma el modo del historial', () => {
    assert.equal(
      modoDesdeHistorial([{ tipo: 'ia', modoRuta: 'PEDIDOS', texto: 'ok' }]),
      'PEDIDOS',
    )
    assert.equal(
      modoDesdeHistorial([{ tipo: 'ia', texto: 'Seguimos por ventas' }]),
      'VENTAS',
    )
    assert.equal(
      modoDesdeHistorial([{ tipo: 'usuario', texto: 'Pedidos' }]),
      'PEDIDOS',
    )
    assert.equal(
      modoDesdeHistorial([{ tipo: 'ia', elegirRuta: true, texto: 'Elige una ruta' }]),
      '',
    )
    assert.equal(modoDesdeHistorial([]), 'VENTAS')
  })
})
