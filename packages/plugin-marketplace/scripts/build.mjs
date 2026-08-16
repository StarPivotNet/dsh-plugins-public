import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'
import { transform } from 'lightningcss'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'lib')
await mkdir(outDir, { recursive: true })

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/host/index.ts'],
  outfile: 'lib/host.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  packages: 'external',
})
await writeFile(resolve(outDir, 'node.js'), 'export function apply() {}\n')
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/host/reboot-watchdog.ts'],
  outfile: 'lib/reboot-watchdog.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
})

const cssPlugin = {
  name: 'css-modules',
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
      const source = await readFile(args.path)
      const { code, exports } = transform({
        filename: args.path,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap = Object.fromEntries(
        Object.entries(exports ?? {}).map(([local, exp]) => [local, exp.name]),
      )
      const cssText = JSON.stringify(code.toString())
      const fileName = JSON.stringify(basename(args.path))
      const map = JSON.stringify(classMap)
      return {
        contents: [
          'const css = ' + cssText + ';',
          'const tagId = "plugin-marketplace/" + ' + fileName + ';',
          'if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {',
          '  const tag = document.createElement("style");',
          '  tag.dataset.plugin = "@starpivot/dsh-plugin-marketplace";',
          '  tag.dataset.pluginCss = tagId;',
          '  tag.textContent = css;',
          '  document.head.appendChild(tag);',
          '}',
          'export default ' + map + ';',
        ].join('\n'),
        loader: 'js',
      }
    })
  },
}

const client = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/client/index.ts'],
  write: false,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-web-react',
    '@deepseek-ai/dsh-client-ui-primitives',
    '@deepseek-ai/dsh-client-runtime/client',
    '@deepseek-ai/dsh-client-locale/client',
    '@deepseek-ai/dsh-client-ui-settings/client',
    '@deepseek-ai/dsh-client-ui-conversation/client',
    '@deepseek-ai/dsh-client-ui-commands/client',
    '@deepseek-ai/dsh-client-ui-primitives',
  ],
  plugins: [cssPlugin],
})

const code = client.outputFiles[0]?.text ?? ''
await writeFile(resolve(outDir, 'client.js'), [
  'window.__ModuleLoader__.load({ id: "@starpivot/dsh-plugin-marketplace", factory: (require) => {',
  'var module = { exports: {} }; var exports = module.exports;',
  code,
  'return module.exports; } });',
  '',
].join('\n'))

console.log('built lib/node.js, lib/host.js, lib/client.js and lib/reboot-watchdog.js')
