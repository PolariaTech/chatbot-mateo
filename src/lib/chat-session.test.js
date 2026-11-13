import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  armarPayloadChat,
  atenderErrorAlGuardarTitulo,
  guardarTitulo,
  leerRespuestaAgente,
  resolveWebhookUrl,
  tituloDeTurno,
} from './chat-session.js'

const usuario = {
  username: 'mateo',
  idUsuario: 'usr-1',
  codigoEmpresa: 'Y9IHZ',
  nombre: 'Mateo',
}

describe('resolveWebhookUrl', () => {
  it('manda el local al webhook de producción', () => {
    assert.equal(
      resolveWebhookUrl('1XZ77', 'development'),
      'https://polariatech.app.n8n.cloud/webhook/polaria',
    )
    assert.equal(
      resolveWebhookUrl('Y9IHZ', 'test'),
      'https://polariatech.app.n8n.cloud/webhook/polaria',
    )
  })

  it('manda a todas las empresas al webhook de producción', () => {
    assert.equal(
      resolveWebhookUrl('1XZ77', 'production'),
      'https://polariatech.app.n8n.cloud/webhook/polaria',
    )
    assert.equal(
      resolveWebhookUrl('Y9IHZ', 'production'),
      'https://polariatech.app.n8n.cloud/webhook/polaria',
    )
  })
})

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
    assert.equal(payload.schema, 'public')
  })

  it('manda el schema que trajo la empresa logueada', () => {
    const payload = armarPayloadChat({
      texto: 'cuántos pedidos van este mes',
      conversacionId: 'conv-demo',
      existente: false,
      modo: 'PEDIDOS',
      soloRuta: false,
      user: { ...usuario, codigoEmpresa: 'NUEVA1', schema: 'emp_nueva_xxxx' },
    })

    assert.equal(payload.schema, 'emp_nueva_xxxx')
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

  it('no muestra el JSON cuando la prueba no está escuchando', () => {
    const leido = leerRespuestaAgente({
      code: 404,
      message: 'The requested webhook "polaria" is not registered.',
      hint: 'Click the Execute workflow button on the canvas, then try again.',
    })

    assert.equal(leido.texto.includes('{'), false)
    assert.equal(leido.texto.includes('not registered'), false)
    assert.equal(
      leido.texto,
      'La prueba no está escuchando. En n8n pulsa Execute workflow y vuelve a enviar el mensaje.',
    )
  })

  it('lee la marca de órdenes de trabajo', () => {
    const leido = leerRespuestaAgente({
      output: 'Te dejo el desglose.\n[[DESCARGAR_OT inicio=2026-10-31 fin=2026-10-31 columnas=numero,producto,importe]]',
    })
    assert.equal(leido.texto.includes('DESCARGAR_OT'), false)
    assert.deepEqual(leido.descarga, {
      tipo: 'ot',
      inicio: '2026-10-31',
      fin: '2026-10-31',
      columnas: ['numero', 'producto', 'importe'],
      desconocidas: [],
    })
  })
})
