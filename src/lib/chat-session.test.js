import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { armarPayloadChat, leerRespuestaAgente, tituloDeTurno } from './chat-session.js'

const usuario = {
  username: 'mateo',
  idUsuario: 'usr-1',
  codigoEmpresa: 'Y9IHZ',
  nombre: 'Mateo',
}

describe('armarPayloadChat', () => {
  it('deja el modo vacio cuando el turno solo elige ruta', () => {
    const payload = armarPayloadChat({
      texto: 'Ventas',
      conversacionId: 'conv-1',
      existente: true,
      modo: 'VENTAS',
      soloRuta: true,
      user: usuario,
    })

    assert.equal(payload.modo, '')
    assert.equal(payload.soloRuta, true)
  })

  it('marca la conversacion como nueva cuando el modo es PEDIDOS', () => {
    const payload = armarPayloadChat({
      texto: 'Pedidos',
      conversacionId: 'conv-1',
      existente: true,
      modo: 'PEDIDOS',
      soloRuta: false,
      user: usuario,
    })

    assert.equal(payload.conversacionExistente, false)
    assert.equal(payload.modo, 'PEDIDOS')
  })
})

describe('tituloDeTurno', () => {
  it('usa la pregunta previa cuando el texto es la eleccion de ruta', () => {
    const mensajes = [
      { tipo: 'usuario', texto: '¿Cuánto vendimos ayer?' },
      { tipo: 'ia', texto: 'Elige Ventas o Pedidos' },
    ]

    assert.equal(tituloDeTurno('Ventas', mensajes), '¿Cuánto vendimos ayer?')
  })
})

describe('leerRespuestaAgente', () => {
  it('detecta la marca de elegir ruta y la quita del texto', () => {
    const leido = leerRespuestaAgente({ output: 'Elige una ruta\n[[ELEGIR_RUTA]]' })

    assert.equal(leido.elegirRuta, true)
    assert.equal(leido.texto, 'Elige una ruta')
  })

  it('acepta elegirRuta y elegir_ruta en el cuerpo', () => {
    assert.equal(leerRespuestaAgente({ output: 'hola', elegirRuta: true }).elegirRuta, true)
    assert.equal(leerRespuestaAgente({ reply: 'hola', elegir_ruta: true }).elegirRuta, true)
  })
})
