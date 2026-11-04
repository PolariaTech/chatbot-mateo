import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { handleSessionInvalid } from '../lib/chat-session.js'
import { useChat } from './useChat.js'

describe('useChat', () => {
  it('exporta el hook', () => {
    assert.equal(typeof useChat, 'function')
  })

  it('una sesión inválida al guardar el título corta el envío', () => {
    let aviso = false
    const corto = handleSessionInvalid(
      { isSessionInvalid: true, message: 'Sesión inválida.' },
      () => {
        aviso = true
      },
    )

    assert.equal(corto, true)
    assert.equal(aviso, true)
  })

  it('un fallo al guardar el título no se trata como sesión inválida', () => {
    const error = new Error('No se pudo guardar el mensaje en Supabase.')
    assert.equal(handleSessionInvalid(error, () => {}), false)
    assert.equal(error.message, 'No se pudo guardar el mensaje en Supabase.')
  })
})
