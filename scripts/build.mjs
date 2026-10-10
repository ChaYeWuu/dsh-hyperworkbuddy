/**
 * 构建脚本：把 src 编译成 lib。
 *
 * host 半边输出 ESM（lib/index.js）；浏览器半边输出带 `__ModuleLoader__`
 * 包装的 CJS（lib/client.js）——DSH 的客户端模块加载器要求后者这种形态。
 */

import { build } from 'esbuild'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(await readFile(join(root, '..', 'package.json'), 'utf8'))

/** host 半边：宿主运行时提供的模块不打包。 */
const HOST_EXTERNAL = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/schemastery',
  '@deepseek-ai/dsh-home-paths',
  '@deepseek-ai/dsh-host-webserver',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-llm-pi-ai',
  '@earendil-works/pi-ai',
  '@earendil-works/pi-ai/api/openai-completions.lazy',
]

/** 浏览器半边：全部由宿主模块加载器提供。 */
const CLIENT_EXTERNAL = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-locale',
]

const outDir = join(root, '..', 'lib')
await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

await build({
  entryPoints: [join(root, '..', 'src', 'index.ts')],
  outfile: join(outDir, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: HOST_EXTERNAL,
  sourcemap: false,
  logLevel: 'info',
})

await build({
  entryPoints: [join(root, '..', 'src', 'client', 'index.tsx')],
  outfile: join(outDir, 'client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: CLIENT_EXTERNAL,
  jsx: 'transform',
  sourcemap: false,
  logLevel: 'info',
  // 宿主加载器约定：factory 里必须能拿到 module / exports / require。
  banner: {
    js: [
      `window.__ModuleLoader__.load({`,
      `\tid: ${JSON.stringify(pkg.name)},`,
      `\tfactory: (require) => {`,
      `\t\tvar module = { exports: {} };`,
      `\t\tvar exports = module.exports;`,
    ].join('\n'),
  },
  footer: { js: 'return module.exports; } });' },
  define: { 'process.env.NODE_ENV': '"production"' },
})

console.log('build ok')
