import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  armarPayloadChat,
  atenderErrorAlGuardarTitulo,
  guardarTitulo,
  leerRespuestaAgente,
  tituloDeTurno,
} from './chat-session.js'

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

describe('guardarTitulo', () => {
  it('no marca el título si la actualización rechaza la sesión', async () => {
    await assert.rejects(
      () => guardarTitulo({
        yaAplicado: false,
        puedePersistir: true,
        idConversacion: 'conv-1',
        actualizar: async () => {
          const error = new Error('Sesión inválida.')
          error.isSessionInvalid = true
          throw error
        },
      }),
      (error) => {
        const atencion = atenderErrorAlGuardarTitulo(error, () => {})
        assert.equal(atencion.cortarEnvio, true)
        assert.equal(atencion.mensaje, null)
        return true
      },
    )
  })

  it('propaga otro error sin marcar el título como aplicado', async () => {
    await assert.rejects(
      () => guardarTitulo({
        yaAplicado: false,
        puedePersistir: true,
        idConversacion: 'conv-1',
        actualizar: async () => {
          throw new Error('No se pudo actualizar el título.')
        },
      }),
      (error) => {
        const atencion = atenderErrorAlGuardarTitulo(error, () => {})
        assert.equal(atencion.cortarEnvio, false)
        assert.equal(atencion.mensaje, 'No se pudo actualizar el título.')
        return true
      },
    )
  })

  it('marca el título solo cuando la actualización responde', async () => {
    const resultado = await guardarTitulo({
      yaAplicado: false,
      puedePersistir: true,
      idConversacion: 'conv-1',
      actualizar: async () => ({ conversacion: { idConversacion: 'conv-1' } }),
    })

    assert.equal(resultado.aplicado, true)
    assert.equal(resultado.respuesta.conversacion.idConversacion, 'conv-1')
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

  it('quita la marca de Excel y deja el pedido', () => {
    const leido = leerRespuestaAgente({
      output: 'Te dejo el archivo.\n[[DESCARGAR_OV inicio=2026-10-01 fin=2026-10-31 columnas=numero,estado]]',
    })
    assert.equal(leido.texto, 'Te dejo el archivo.')
    assert.deepEqual(leido.descarga.columnas, ['numero', 'estado'])
  })
})
