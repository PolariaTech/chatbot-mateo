const stubNextServer = new URL('./next-server-stub.js', import.meta.url).href

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return { url: stubNextServer, shortCircuit: true }
  }

  const esRelativo = specifier.startsWith('./') || specifier.startsWith('../')
  const tieneExtension = /\.[a-zA-Z0-9]+$/.test(specifier)
  if (esRelativo && !tieneExtension) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
}
