import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { PATCH } from './route.js'

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY
const fetchOriginal = globalThis.fetch

function solicitud({ sesion, body, jsonInvalido = false } = {}) {
  return {
    headers: {
      get(nombre) {
        if (String(nombre).toLowerCase() === 'authorization' && sesion) return `Bearer ${sesion}`
        return null
      },
    },
    async json() {
      if (jsonInvalido) throw new SyntaxError('JSON inválido')
      return body
    },
  }
}

describe('PATCH titulo', () => {
  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role'
    globalThis.fetch = async () => new Response(JSON.stringify({
      user: { idUsuario: 'usr-1', username: 'mateo', nombre: 'Mateo' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  after(() => {
    if (urlOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = urlOriginal
    if (claveOriginal === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = claveOriginal
    globalThis.fetch = fetchOriginal
  })

  it('responde 503 si Supabase no está configurado', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const respuesta = await PATCH(solicitud({ body: { titulo: 'Ventas de ayer' } }), { params: { id: 'conv-1' } })
    const cuerpo = await respuesta.json()

    assert.equal(respuesta.status, 503)
    assert.equal(cuerpo.error, 'Supabase no está configurado.')

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role'
  })

  it('responde 401 sin token', async () => {
    const respuesta = await PATCH(solicitud({ body: { titulo: 'Ventas de ayer' } }), { params: { id: 'conv-1' } })
    assert.equal(respuesta.status, 401)
  })

  it('responde 400 si el cuerpo no es un objeto', async () => {
    const respuestaNula = await PATCH(
      solicitud({ sesion: 'sesion-nula', body: null }),
      { params: { id: 'conv-1' } },
    )
    const respuestaArreglo = await PATCH(
      solicitud({ sesion: 'sesion-arreglo', body: ['Ventas'] }),
      { params: { id: 'conv-1' } },
    )

    assert.equal(respuestaNula.status, 400)
    assert.equal(respuestaArreglo.status, 400)
  })

  it('responde 400 si el JSON no se puede leer', async () => {
    const respuesta = await PATCH(
      solicitud({ sesion: 'sesion-json', jsonInvalido: true }),
      { params: { id: 'conv-1' } },
    )
    assert.equal(respuesta.status, 400)
  })
})
