import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'lib')
await mkdir(outDir, { recursive: true })

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/host.ts'],
  outfile: 'lib/host.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  packages: 'external',
})
await writeFile(resolve(outDir, 'node.js'), 'export function apply() {}\n')

const client = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/plugin.ts'],
  write: false,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-runtime/client',
    '@deepseek-ai/dsh-client-connection/client',
  ],
})

const code = client.outputFiles[0]?.text ?? ''
await writeFile(resolve(outDir, 'client.js'), [
  'window.__ModuleLoader__.load({ id: "@starpivot/dsh-file-drop", factory: (require) => {',
  'var module = { exports: {} }; var exports = module.exports;',
  code,
  'return module.exports; } });',
  '',
].join('\n'))

console.log('built lib/node.js, lib/host.js and lib/client.js')
