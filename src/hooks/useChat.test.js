import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { atenderErrorAlGuardarTitulo, guardarTitulo } from '../lib/chat-session.js'
import { useChat } from './useChat.js'

async function guardarTituloComoElHook(actualizar) {
  let tituloAplicado = false
  let persistError = null
  let siguioAlWebhook = false

  try {
    const resultado = await guardarTitulo({
      yaAplicado: tituloAplicado,
      puedePersistir: true,
      idConversacion: 'conv-1',
      actualizar,
    })
    if (resultado.aplicado) tituloAplicado = true
    persistError = null
  } catch (error) {
    const atencion = atenderErrorAlGuardarTitulo(error, () => {})
    if (atencion.cortarEnvio) {
      return { tituloAplicado, persistError, siguioAlWebhook }
    }
    persistError = atencion.mensaje
  }

  siguioAlWebhook = true
  return { tituloAplicado, persistError, siguioAlWebhook }
}

describe('useChat', () => {
  it('exporta el hook', () => {
    assert.equal(typeof useChat, 'function')
  })

  it('una sesión inválida al guardar el título corta el envío y no lo marca', async () => {
    const resultado = await guardarTituloComoElHook(async () => {
      const error = new Error('Sesión inválida.')
      error.isSessionInvalid = true
      throw error
    })

    assert.equal(resultado.tituloAplicado, false)
    assert.equal(resultado.siguioAlWebhook, false)
    assert.equal(resultado.persistError, null)
  })

  it('otro fallo al guardar el título llega a quien llama y no lo marca', async () => {
    const resultado = await guardarTituloComoElHook(async () => {
      throw new Error('No se pudo actualizar el título.')
    })

    assert.equal(resultado.tituloAplicado, false)
    assert.equal(resultado.siguioAlWebhook, true)
    assert.equal(resultado.persistError, 'No se pudo actualizar el título.')
  })
})
