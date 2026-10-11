// 验收：链接登录响应是否带 authUrl、第三方导入、档位探测。
// 放在插件目录内运行，以复现 profile 的依赖解析。
const services = new Map()
const effects = []
const routes = new Map()
const adapters = new Map()

const ctx = {
  logger: { info: () => {}, warn: () => {}, error: (...a) => console.log('[error]', ...a) },
  get: n => services.get(n),
  provide: (n, v) => services.set(n, v),
  emit: () => {}, on: () => () => {},
  effect: (fn) => { const d = fn(); if (typeof d === 'function') effects.push(d); return d },
  inject: (deps, fn) => {
    const scope = Object.create(ctx)
    for (const d of deps) { const s = services.get(d); if (s !== undefined) scope[d] = s }
    fn(scope)
  },
  llm: { registerAdapter: (p, a) => { for (const id of p) adapters.set(id, a); return () => {} } },
}
services.set('webServer', { register: ({ path, handler }) => { routes.set(path, handler); return () => {} } })

const mod = await import('./lib/index.js')
mod.apply(ctx, { port: 0, portAI: 0, apiKeys: [], hiddenModels: [], followDesktop: true })
await new Promise(r => setTimeout(r, 4000))

async function call(path, body) {
  const handler = routes.get(path)
  if (handler === undefined) throw new Error('路由未注册: ' + path)
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body), 'utf8')]
  const req = {
    method: 'POST', url: path, headers: { host: '127.0.0.1:19387', 'content-type': 'application/json' },
    async *[Symbol.asyncIterator]() { for (const c of chunks) yield c },
  }
  return await new Promise((resolve, reject) => {
    const res = {
      headersSent: false, statusCode: 0, body: '',
      writeHead(c) { this.statusCode = c; this.headersSent = true; return this },
      write(p) { this.body += p ?? ''; return true },
      end(p) { this.body += p ?? ''; resolve(JSON.parse(this.body)) },
    }
    Promise.resolve(handler(req, res)).catch(reject)
  })
}

console.log('=== 档位探测路由 ===')
console.log('  ' + (routes.has('/api-hyperworkbuddy/model/probe') ? 'OK' : 'MISSING') + ' /api-hyperworkbuddy/model/probe')

console.log('\n=== 链接登录：响应必须带 authUrl（面板靠它跳转）===')
const s = await call('/api-hyperworkbuddy/login/start', { variantId: 'hyperworkbuddy' })
console.log('  ok=' + s.ok)
console.log('  有 state 字段:', typeof s.state === 'string' && s.state !== '')
console.log('  有 authUrl 字段:', typeof s.authUrl === 'string' && s.authUrl !== '')
console.log('  有 document 字段:', s.document !== undefined)
if (s.authUrl) console.log('  authUrl=' + String(s.authUrl).slice(0, 100) + '...')

console.log('\n=== 档位探测：对未声明档位的模型（deepseek-v4.1-flash）===')
try {
  const probe = await call('/api-hyperworkbuddy/model/probe', { variantId: 'hyperworkbuddy', modelId: 'deepseek-v4.1-flash' })
  console.log('  ok=' + probe.ok + (probe.error ? ' error=' + probe.error : ''))
  for (const d of probe.detail ?? []) {
    console.log('   ' + String(d.effort).padEnd(8) + ' accepted=' + d.accepted + '  ' + String(d.reason).slice(0, 70))
  }
  console.log('  被接受:', JSON.stringify(probe.accepted ?? []))
  if (probe.document) {
    const m = probe.document.variants[0].models.find(x => x.id === 'deepseek-v4.1-flash')
    console.log('  面板里 efforts=' + JSON.stringify(m?.efforts) + ' source=' + m?.effortsSource)
  }
} catch (e) {
  console.log('  失败: ' + String(e).slice(0, 200))
}

console.log('\n=== 第三方导入：WorkBuddy2API-Hub 导出文档 ===')
const imp = await call('/api-hyperworkbuddy/import', {
  payload: JSON.stringify({
    format: 'workbuddy-accounts', version: 1, count: 1,
    accounts: [{ uid: 'probe-test', nickname: '探测用', domain: 'www.workbuddy.cn', accessToken: 'a.b.c', refreshToken: '' }],
  }),
})
console.log('  ok=' + imp.ok + ' imported=' + (imp.document && imp.document.importResult ? imp.document.importResult.imported : '(无)'))
try { await services.get('hyperworkbuddy').pool.remove('probe-test:', 'hyperworkbuddy') } catch { /* 忽略 */ }

for (const d of effects) { try { d() } catch { /* 忽略 */ } }
process.exit(0)
