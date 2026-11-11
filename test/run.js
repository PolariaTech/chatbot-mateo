import { readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { run } from 'node:test'
import { tap } from 'node:test/reporters'

async function buscarPruebas(carpeta) {
  const halladas = []
  const entradas = await readdir(carpeta, { withFileTypes: true })
  for (const entrada of entradas) {
    const ruta = path.join(carpeta, entrada.name)
    if (entrada.isDirectory()) halladas.push(...await buscarPruebas(ruta))
    else if (entrada.name.endsWith('.test.js')) halladas.push(ruta)
  }
  return halladas
}

const files = await buscarPruebas(path.resolve('src'))
run({
  files,
  execArgv: ['--import', './test/register.js'],
})
  .on('test:fail', () => {
    process.exitCode = 1
  })
  .compose(tap)
  .pipe(process.stdout)
